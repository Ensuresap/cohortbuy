-- CohortBuy — public project invite teaser. SECURITY DEFINER so a non-member (even
-- logged-out) opening a shared invite link sees a LIGHT teaser: title, category,
-- what it is, coordinator, deadline, member count. No scope/quotes/discussion.
-- Joining still goes through the cohort's normal vetted join flow.

create or replace function public.project_teaser(p_request uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', r.id,
    'title', r.title,
    'category', r.category,
    'description', r.description,
    'status', r.status,
    'locked', r.locked,
    'join_deadline', r.join_deadline,
    'min_size', r.min_size,
    'project_type', r.project_type,
    'cohort_id', c.id,
    'cohort_handle', c.handle,
    'cohort_name', c.name,
    'cohort_visibility', c.visibility,
    'coordinator_name', p.display_name,
    'participants', (
      select count(*) from public.request_participants rp
      where rp.request_id = r.id and rp.status = 'joined'
    )
  )
  from public.service_requests r
  join public.cohorts c on c.id = r.cohort_id
  left join public.profiles p on p.id = r.created_by
  where r.id = p_request;
$$;

grant execute on function public.project_teaser(uuid) to anon, authenticated;
