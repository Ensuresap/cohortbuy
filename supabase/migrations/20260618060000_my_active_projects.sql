-- CohortBuy — dashboard "Active projects" feed: the caller's joined, in-flight
-- projects with stage, role, cohort, last activity, and the latest chat snippet
-- (member or AI). Ordered by most recent activity so the busiest float to top.
drop function if exists public.my_active_projects();
create or replace function public.my_active_projects()
returns table (
  id uuid, title text, status text, project_type text, target_date date,
  role text, cohort_handle text, cohort_name text,
  last_activity_at timestamptz,
  last_comment text, last_comment_author text, last_comment_kind text, last_comment_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select r.id, r.title, r.status, r.project_type, r.target_date,
         rp.role, ch.handle, ch.name,
         r.last_activity_at,
         lc.body, lc.author_name, lc.kind, lc.created_at
  from public.request_participants rp
  join public.service_requests r on r.id = rp.request_id
  join public.cohorts ch on ch.id = r.cohort_id
  left join lateral (
    select c.body, pr.display_name as author_name, c.kind, c.created_at
    from public.request_comments c
    join public.profiles pr on pr.id = c.user_id
    where c.request_id = r.id
    order by c.created_at desc
    limit 1
  ) lc on true
  where rp.user_id = auth.uid()
    and rp.status = 'joined'
    and r.status not in ('completed', 'cancelled')
  order by greatest(r.last_activity_at, coalesce(lc.created_at, r.last_activity_at)) desc;
$$;
grant execute on function public.my_active_projects() to authenticated;
