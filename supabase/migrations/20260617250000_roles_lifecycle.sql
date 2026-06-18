-- CohortBuy — project roles (Capability 2) + treasurer permissions + group-buy price.

-- Is the caller the treasurer of this project?
create or replace function public.is_project_treasurer(p_request uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.request_participants
    where request_id = p_request and user_id = auth.uid()
      and status = 'joined' and role = 'treasurer'
  );
$$;

-- Participants with names + roles (profiles are otherwise private). Cohort members only.
create or replace function public.request_participants_feed(p_request uuid)
returns table (id uuid, user_id uuid, role text, member_name text, member_avatar text)
language sql stable security definer set search_path = public as $$
  select rp.id, rp.user_id, rp.role, p.display_name, p.avatar_url
  from public.request_participants rp
  left join public.profiles p on p.id = rp.user_id
  where rp.request_id = p_request and rp.status = 'joined'
    and (public.auth_request_cohort(p_request) in (select public.auth_cohort_ids())
         or public.auth_is_cohort_manager(public.auth_request_cohort(p_request)))
  order by case rp.role when 'coordinator' then 0 when 'treasurer' then 1 else 2 end, rp.created_at;
$$;
grant execute on function public.request_participants_feed(uuid) to authenticated;

-- Coordinator (creator) assigns a role to a joined participant. The creator's own
-- coordinator role can't be changed away (they always remain a coordinator).
create or replace function public.set_participant_role(p_request uuid, p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare v_creator uuid;
begin
  if p_role not in ('coordinator', 'treasurer', 'participant') then raise exception 'bad_role'; end if;
  select created_by into v_creator from public.service_requests where id = p_request;
  if v_creator is null or v_creator <> auth.uid() then raise exception 'not_coordinator'; end if;
  if p_user = v_creator then raise exception 'cannot_change_creator'; end if;
  update public.request_participants set role = p_role
    where request_id = p_request and user_id = p_user and status = 'joined';
end; $$;

-- Coordinator sets an agreed amount directly (group-buy projects have no RFQ/quote).
create or replace function public.set_agreed_amount(p_request uuid, p_amount_cents bigint, p_currency text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.service_requests where id = p_request and created_by = auth.uid()) then
    raise exception 'not_coordinator';
  end if;
  update public.service_requests
    set agreed_amount_cents = p_amount_cents, agreed_currency = coalesce(nullif(p_currency, ''), 'USD'),
        last_activity_at = now()
    where id = p_request;
end; $$;

-- Extend cost-share actions to the treasurer (was coordinator-only).
create or replace function public.generate_cost_shares(p_request uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_amount bigint; v_currency text; v_creator uuid; v_n int; v_base bigint; v_rem bigint;
begin
  select agreed_amount_cents, coalesce(agreed_currency, 'USD'), created_by
    into v_amount, v_currency, v_creator
    from public.service_requests where id = p_request;
  if v_creator is null or (v_creator <> auth.uid() and not public.is_project_treasurer(p_request)) then
    raise exception 'not_coordinator';
  end if;
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

create or replace function public.set_share_paid(p_share uuid, p_paid boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_request uuid; v_user uuid;
begin
  select request_id, user_id into v_request, v_user from public.cost_shares where id = p_share;
  if v_request is null then raise exception 'share_not_found'; end if;
  if v_user <> auth.uid()
     and not exists (select 1 from public.service_requests where id = v_request and created_by = auth.uid())
     and not public.is_project_treasurer(v_request) then
    raise exception 'forbidden';
  end if;
  update public.cost_shares
    set paid = p_paid, paid_at = case when p_paid then now() else null end
    where id = p_share;
end; $$;
