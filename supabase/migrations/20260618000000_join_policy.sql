-- CohortBuy — per-project join policy: auto-join vs coordinator approval.

alter table public.service_requests add column if not exists join_policy text not null default 'auto'
  check (join_policy in ('auto', 'approval'));

-- request_participants gains 'requested' (pending approval) and 'declined' statuses.
alter table public.request_participants drop constraint if exists request_participants_status_check;
alter table public.request_participants add constraint request_participants_status_check
  check (status in ('joined', 'left', 'requested', 'declined'));

-- create_service_request takes p_join_policy (drop the prior 12-arg form).
drop function if exists public.create_service_request(uuid, text, text, text, text, date, date, text, text, text, boolean, integer);
create or replace function public.create_service_request(
  p_cohort uuid, p_title text, p_category text, p_description text,
  p_driver text, p_target date, p_deadline date,
  p_type text, p_service_scope text, p_split text,
  p_locked boolean, p_join_policy text, p_min_size integer
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid; v_base text;
begin
  if not exists (
    select 1 from public.cohort_members
    where cohort_id = p_cohort and user_id = auth.uid() and status = 'approved'
  ) then
    raise exception 'not_a_member';
  end if;
  insert into public.service_requests
    (cohort_id, created_by, title, category, description, driver, target_date, join_deadline,
     project_type, service_scope, split_method, locked, join_policy, min_size)
    values (p_cohort, auth.uid(), p_title, p_category, p_description, p_driver, p_target, p_deadline,
            coalesce(p_type, 'service'), coalesce(p_service_scope, 'service'), coalesce(p_split, 'even'),
            coalesce(p_locked, false), coalesce(p_join_policy, 'auto'), coalesce(p_min_size, 2))
    returning id into new_id;
  v_base := left(coalesce(nullif(trim(both '-' from regexp_replace(lower(p_title), '[^a-z0-9]+', '-', 'g')), ''), 'project'), 40);
  update public.service_requests set slug = v_base || '-' || substr(md5(new_id::text), 1, 4) where id = new_id;
  insert into public.request_participants (request_id, user_id, role, status)
    values (new_id, auth.uid(), 'coordinator', 'joined');
  return new_id;
end; $$;

-- The caller's own participation status for a project ('joined'|'requested'|'left'|'declined'|null).
create or replace function public.my_participation(p_request uuid)
returns text language sql stable security definer set search_path = public as $$
  select status from public.request_participants where request_id = p_request and user_id = auth.uid();
$$;

-- Pending join requests with names — visible to the coordinator / cohort manager only.
create or replace function public.request_join_feed(p_request uuid)
returns table (user_id uuid, member_name text, member_avatar text, requested_at timestamptz)
language sql stable security definer set search_path = public as $$
  select rp.user_id, p.display_name, p.avatar_url, rp.created_at
  from public.request_participants rp
  left join public.profiles p on p.id = rp.user_id
  where rp.request_id = p_request and rp.status = 'requested'
    and exists (
      select 1 from public.service_requests r
      where r.id = p_request and (r.created_by = auth.uid() or public.auth_is_cohort_manager(r.cohort_id))
    )
  order by rp.created_at;
$$;

-- Coordinator/manager approves or declines a pending join request.
create or replace function public.respond_join(p_request uuid, p_user uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.service_requests r
    where r.id = p_request and (r.created_by = auth.uid() or public.auth_is_cohort_manager(r.cohort_id))
  ) then raise exception 'not_coordinator'; end if;
  update public.request_participants
    set status = case when p_approve then 'joined' else 'declined' end
    where request_id = p_request and user_id = p_user and status = 'requested';
end; $$;
