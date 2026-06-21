-- CohortBuy — Phase-1 nudge support: for the coordinator, who on the project has
-- already done the current step vs who's still holding things up. Coordinator-gated.
create or replace function public.project_pending_members(p_request uuid)
returns table (user_id uuid, member_name text, member_avatar text, acted boolean)
language sql stable security definer set search_path = public as $$
  select rp.user_id, pr.display_name, pr.avatar_url,
    case
      when r.status = 'scoping'
        then exists (select 1 from public.scope_items si where si.request_id = r.id and si.user_id = rp.user_id)
      when r.status = 'deciding' and r.decision_policy = 'vote'
        then exists (select 1 from public.quote_votes qv where qv.request_id = r.id and qv.user_id = rp.user_id)
      when r.status = 'funding'
        then exists (select 1 from public.cost_shares cs where cs.request_id = r.id and cs.user_id = rp.user_id and cs.paid = true)
      else true
    end as acted
  from public.request_participants rp
  join public.service_requests r on r.id = rp.request_id
  join public.profiles pr on pr.id = rp.user_id
  where rp.request_id = p_request and rp.status = 'joined'
    and (r.created_by = auth.uid() or public.auth_is_cohort_manager(r.cohort_id))
  order by acted asc, pr.display_name;
$$;
grant execute on function public.project_pending_members(uuid) to authenticated;
