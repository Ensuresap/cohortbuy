-- CohortBuy — procurement lifecycle: decision (select quote), contract (off-platform
-- reference), cost-share tracker (off-platform, tracking only), and completion sign-off.
-- Facilitator model: the platform never holds funds and is not a party to the contract;
-- cost_shares records who has paid OUT OF BAND, it does not move money.

alter table public.service_requests add column if not exists selected_quote_id uuid references public.quotes (id);
alter table public.service_requests add column if not exists agreed_amount_cents bigint;
alter table public.service_requests add column if not exists agreed_currency text;
alter table public.service_requests add column if not exists contract_vendor text;
alter table public.service_requests add column if not exists contract_url text;
alter table public.service_requests add column if not exists contract_note text;
alter table public.service_requests add column if not exists completion_note text;
alter table public.service_requests add column if not exists completed_at timestamptz;

-- Per-member share of an agreed amount. Tracking only; settled off-platform.
create table if not exists public.cost_shares (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  amount_cents bigint not null,
  currency text not null default 'USD',
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (request_id, user_id)
);
create index if not exists cost_shares_request_idx on public.cost_shares (request_id);

alter table public.cost_shares enable row level security;

drop policy if exists cost_shares_select on public.cost_shares;
create policy cost_shares_select on public.cost_shares for select to authenticated
  using (public.auth_request_cohort(request_id) in (select public.auth_cohort_ids())
         or public.auth_is_cohort_manager(public.auth_request_cohort(request_id)));
-- All mutations go through SECURITY DEFINER functions below (no direct write policy).

-- Coordinator selects a winning quote: marks it 'selected', others 'rejected',
-- and records the agreed amount + vendor on the project.
create or replace function public.select_quote(p_quote uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_request uuid; v_amount bigint; v_currency text; v_vendor text;
begin
  select request_id, amount_cents, currency, vendor_name
    into v_request, v_amount, v_currency, v_vendor
    from public.quotes where id = p_quote;
  if v_request is null then raise exception 'quote_not_found'; end if;
  if not exists (select 1 from public.service_requests where id = v_request and created_by = auth.uid()) then
    raise exception 'not_coordinator';
  end if;
  update public.quotes set status = 'rejected' where request_id = v_request and id <> p_quote;
  update public.quotes set status = 'selected' where id = p_quote;
  update public.service_requests
    set selected_quote_id = p_quote,
        agreed_amount_cents = v_amount,
        agreed_currency = v_currency,
        contract_vendor = v_vendor,
        last_activity_at = now()
    where id = v_request;
end; $$;

-- Coordinator records the off-platform contract reference (e.g. Google Drive link).
create or replace function public.set_contract(p_request uuid, p_url text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.service_requests where id = p_request and created_by = auth.uid()) then
    raise exception 'not_coordinator';
  end if;
  update public.service_requests
    set contract_url = nullif(p_url, ''), contract_note = nullif(p_note, ''), last_activity_at = now()
    where id = p_request;
end; $$;

-- Coordinator generates an even split of the agreed amount across joined participants.
-- Remainder cents go to the coordinator's share.
create or replace function public.generate_cost_shares(p_request uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_amount bigint; v_currency text; v_creator uuid; v_n int; v_base bigint; v_rem bigint;
begin
  select agreed_amount_cents, coalesce(agreed_currency, 'USD'), created_by
    into v_amount, v_currency, v_creator
    from public.service_requests where id = p_request;
  if v_creator is null or v_creator <> auth.uid() then raise exception 'not_coordinator'; end if;
  if v_amount is null then raise exception 'no_agreed_amount'; end if;
  select count(*) into v_n from public.request_participants
    where request_id = p_request and status = 'joined';
  if v_n = 0 then raise exception 'no_participants'; end if;
  v_base := v_amount / v_n;
  v_rem := v_amount - (v_base * v_n);
  delete from public.cost_shares where request_id = p_request;
  insert into public.cost_shares (request_id, user_id, amount_cents, currency)
    select p_request, user_id,
           v_base + case when user_id = v_creator then v_rem else 0 end,
           v_currency
      from public.request_participants
      where request_id = p_request and status = 'joined';
end; $$;

-- Mark a share paid/unpaid. Allowed for the project coordinator or the share's own member.
create or replace function public.set_share_paid(p_share uuid, p_paid boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_request uuid; v_user uuid;
begin
  select request_id, user_id into v_request, v_user from public.cost_shares where id = p_share;
  if v_request is null then raise exception 'share_not_found'; end if;
  if v_user <> auth.uid()
     and not exists (select 1 from public.service_requests where id = v_request and created_by = auth.uid()) then
    raise exception 'forbidden';
  end if;
  update public.cost_shares
    set paid = p_paid, paid_at = case when p_paid then now() else null end
    where id = p_share;
end; $$;

-- Cost shares with member names (profiles are otherwise private). Visible to the
-- request's cohort members / managers.
drop function if exists public.cost_shares_feed(uuid);
create or replace function public.cost_shares_feed(p_request uuid)
returns table (
  id uuid, user_id uuid, amount_cents bigint, currency text,
  paid boolean, paid_at timestamptz, member_name text, member_avatar text
)
language sql security definer set search_path = public as $$
  select cs.id, cs.user_id, cs.amount_cents, cs.currency, cs.paid, cs.paid_at,
         p.display_name, p.avatar_url
    from public.cost_shares cs
    left join public.profiles p on p.id = cs.user_id
    where cs.request_id = p_request
      and (public.auth_request_cohort(p_request) in (select public.auth_cohort_ids())
           or public.auth_is_cohort_manager(public.auth_request_cohort(p_request)))
    order by cs.created_at asc;
$$;

-- Coordinator signs off completion.
create or replace function public.complete_project(p_request uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.service_requests where id = p_request and created_by = auth.uid()) then
    raise exception 'not_coordinator';
  end if;
  update public.service_requests
    set status = 'completed', completion_note = nullif(p_note, ''),
        completed_at = now(), last_activity_at = now()
    where id = p_request;
end; $$;
