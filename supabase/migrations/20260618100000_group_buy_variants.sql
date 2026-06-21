-- CohortBuy — group-buy variants + per-member orders.
-- A group buy can offer several variants (configs/sizes), each with its own
-- negotiated unit price. Members place an order line per variant (a quantity).
-- Funding then bills each member sum(quantity x unit_price) — by-line, not even.

-- ---- Variants (the deal's catalog) ----------------------------------------
create table if not exists public.group_buy_variants (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  label text not null,
  specs text,
  unit_price_cents bigint,
  currency text not null default 'USD',
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists gbv_request_idx on public.group_buy_variants (request_id);
alter table public.group_buy_variants enable row level security;
drop policy if exists gbv_select on public.group_buy_variants;
create policy gbv_select on public.group_buy_variants for select to authenticated
  using (public.auth_request_cohort(request_id) in (
    select cohort_id from public.cohort_members where user_id = auth.uid() and status = 'approved'
  ));

-- ---- Orders (per-member quantity per variant) -----------------------------
create table if not exists public.group_buy_orders (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  variant_id uuid not null references public.group_buy_variants (id) on delete cascade,
  quantity int not null check (quantity >= 1),
  created_at timestamptz not null default now(),
  unique (request_id, user_id, variant_id)
);
create index if not exists gbo_request_idx on public.group_buy_orders (request_id);
alter table public.group_buy_orders enable row level security;
drop policy if exists gbo_select on public.group_buy_orders;
create policy gbo_select on public.group_buy_orders for select to authenticated
  using (public.auth_request_cohort(request_id) in (
    select cohort_id from public.cohort_members where user_id = auth.uid() and status = 'approved'
  ));

-- ---- Coordinator: upsert a variant ----------------------------------------
create or replace function public.set_group_buy_variant(
  p_request uuid, p_id uuid, p_label text, p_specs text, p_price_cents bigint, p_currency text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not exists (
    select 1 from public.service_requests r
    where r.id = p_request and (r.created_by = auth.uid() or public.auth_is_cohort_manager(r.cohort_id))
  ) then raise exception 'not_coordinator'; end if;

  if p_id is null then
    insert into public.group_buy_variants (request_id, label, specs, unit_price_cents, currency, sort)
      values (p_request, p_label, nullif(p_specs, ''), p_price_cents,
              coalesce(nullif(p_currency, ''), 'USD'),
              coalesce((select max(sort) + 1 from public.group_buy_variants where request_id = p_request), 0))
      returning id into v_id;
  else
    update public.group_buy_variants
      set label = p_label, specs = nullif(p_specs, ''),
          unit_price_cents = p_price_cents, currency = coalesce(nullif(p_currency, ''), 'USD')
      where id = p_id and request_id = p_request
      returning id into v_id;
  end if;
  update public.service_requests set last_activity_at = now() where id = p_request;
  return v_id;
end; $$;
grant execute on function public.set_group_buy_variant(uuid, uuid, text, text, bigint, text) to authenticated;

-- ---- Coordinator: delete a variant ----------------------------------------
create or replace function public.delete_group_buy_variant(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_request uuid;
begin
  select request_id into v_request from public.group_buy_variants where id = p_id;
  if v_request is null then return; end if;
  if not exists (
    select 1 from public.service_requests r
    where r.id = v_request and (r.created_by = auth.uid() or public.auth_is_cohort_manager(r.cohort_id))
  ) then raise exception 'not_coordinator'; end if;
  delete from public.group_buy_variants where id = p_id;
  update public.service_requests set last_activity_at = now() where id = v_request;
end; $$;
grant execute on function public.delete_group_buy_variant(uuid) to authenticated;

-- ---- Member: set my quantity for a variant (0 removes) ---------------------
create or replace function public.set_my_order(p_variant uuid, p_qty int)
returns void language plpgsql security definer set search_path = public as $$
declare v_request uuid; v_cohort uuid;
begin
  select request_id into v_request from public.group_buy_variants where id = p_variant;
  if v_request is null then raise exception 'no_variant'; end if;
  v_cohort := public.auth_request_cohort(v_request);
  if v_cohort not in (select cohort_id from public.cohort_members where user_id = auth.uid() and status = 'approved') then
    raise exception 'not_member';
  end if;
  -- must be a joined participant to order
  if not exists (select 1 from public.request_participants where request_id = v_request and user_id = auth.uid() and status = 'joined') then
    raise exception 'not_participant';
  end if;

  if coalesce(p_qty, 0) <= 0 then
    delete from public.group_buy_orders where request_id = v_request and user_id = auth.uid() and variant_id = p_variant;
  else
    insert into public.group_buy_orders (request_id, user_id, variant_id, quantity)
      values (v_request, auth.uid(), p_variant, p_qty)
    on conflict (request_id, user_id, variant_id) do update set quantity = excluded.quantity;
  end if;
  update public.service_requests set last_activity_at = now() where id = v_request;
end; $$;
grant execute on function public.set_my_order(uuid, int) to authenticated;

-- ---- Coordinator: generate cost shares from orders (by line) --------------
create or replace function public.generate_group_buy_shares(p_request uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_currency text; v_total bigint;
begin
  if not exists (
    select 1 from public.service_requests r
    where r.id = p_request and (r.created_by = auth.uid() or public.auth_is_cohort_manager(r.cohort_id))
  ) then raise exception 'not_coordinator'; end if;

  select coalesce(max(v.currency), 'USD') into v_currency
    from public.group_buy_variants v where v.request_id = p_request;

  delete from public.cost_shares where request_id = p_request;
  insert into public.cost_shares (request_id, user_id, amount_cents, currency)
    select o.request_id, o.user_id,
           sum(o.quantity * coalesce(v.unit_price_cents, 0)),
           v_currency
      from public.group_buy_orders o
      join public.group_buy_variants v on v.id = o.variant_id
      where o.request_id = p_request
      group by o.request_id, o.user_id
      having sum(o.quantity * coalesce(v.unit_price_cents, 0)) > 0;

  -- keep the project total in sync (drives funding header + dashboard value)
  select coalesce(sum(o.quantity * coalesce(v.unit_price_cents, 0)), 0) into v_total
    from public.group_buy_orders o
    join public.group_buy_variants v on v.id = o.variant_id
    where o.request_id = p_request;
  update public.service_requests
    set agreed_amount_cents = v_total, agreed_currency = v_currency, last_activity_at = now()
    where id = p_request;
end; $$;
grant execute on function public.generate_group_buy_shares(uuid) to authenticated;
