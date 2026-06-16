-- CohortBuy — platform-staff admin read APIs. All gated by is_platform_staff();
-- SECURITY DEFINER so staff can read cross-cohort aggregates without per-table RLS.

create or replace function public.admin_overview()
returns json language plpgsql security definer set search_path = public as $$
declare result json;
begin
  if not public.is_platform_staff() then raise exception 'forbidden'; end if;
  select json_build_object(
    'cohorts',   (select count(*) from public.cohorts),
    'members',   (select count(*) from public.cohort_members where status = 'approved'),
    'projects',  (select count(*) from public.service_requests),
    'completed', (select count(*) from public.service_requests where status = 'completed'),
    'waitlist',  (select count(*) from public.waitlist),
    'value_cents', (select coalesce(sum(agreed_amount_cents), 0)
                      from public.service_requests where agreed_amount_cents is not null),
    'by_stage', (select coalesce(json_object_agg(status, c), '{}'::json)
                   from (select status, count(*) c from public.service_requests group by status) s)
  ) into result;
  return result;
end; $$;

drop function if exists public.admin_recent_projects(int);
create or replace function public.admin_recent_projects(p_limit int default 12)
returns table (
  id uuid, title text, status text, created_at timestamptz,
  cohort_name text, cohort_handle text, participants bigint,
  agreed_amount_cents bigint, agreed_currency text
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_staff() then raise exception 'forbidden'; end if;
  return query
    select r.id, r.title, r.status, r.created_at, c.name, c.handle,
           (select count(*) from public.request_participants rp
              where rp.request_id = r.id and rp.status = 'joined'),
           r.agreed_amount_cents, r.agreed_currency
      from public.service_requests r
      join public.cohorts c on c.id = r.cohort_id
     order by r.last_activity_at desc
     limit greatest(p_limit, 1);
end; $$;

drop function if exists public.admin_inactive_cohorts(int);
create or replace function public.admin_inactive_cohorts(p_days int default 30)
returns table (id uuid, name text, handle text, last_activity_at timestamptz, members bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_staff() then raise exception 'forbidden'; end if;
  return query
    select c.id, c.name, c.handle, c.last_activity_at,
           (select count(*) from public.cohort_members m
              where m.cohort_id = c.id and m.status = 'approved')
      from public.cohorts c
     where c.last_activity_at < now() - make_interval(days => greatest(p_days, 1))
     order by c.last_activity_at asc;
end; $$;
