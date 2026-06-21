-- CohortBuy — engagement dashboard feeds.
--   my_action_items()       : precise "your turn" todos for the signed-in user.
--   discoverable_projects() : joinable projects in my cohorts I'm not yet in.

-- ---- Your turn -------------------------------------------------------------
drop function if exists public.my_action_items();
create or replace function public.my_action_items()
returns table (
  request_id uuid, title text, cohort_handle text, status text,
  kind text, label text, cnt int
)
language sql stable security definer set search_path = public as $$
  -- Personal, stage-specific todos on projects I've joined.
  select r.id, r.title, ch.handle, r.status,
    case
      when r.status = 'scoping'   then 'scope'
      when r.status = 'deciding' and r.decision_policy = 'vote' then 'vote'
      when r.status = 'deciding'  then 'decide'
      when r.status = 'contracting' then 'contract'
      when r.status = 'funding'   then 'pay'
    end,
    case
      when r.status = 'scoping'   then 'Add your needs to the scope'
      when r.status = 'deciding' and r.decision_policy = 'vote' then 'Cast your vote on the quotes'
      when r.status = 'deciding'  then 'Select the winning quote'
      when r.status = 'contracting' then 'Record the signed agreement'
      when r.status = 'funding'   then 'Confirm your payment'
    end,
    0
  from public.request_participants rp
  join public.service_requests r on r.id = rp.request_id
  join public.cohorts ch on ch.id = r.cohort_id
  where rp.user_id = auth.uid() and rp.status = 'joined'
    and (
      (r.status = 'scoping'
        and not exists (select 1 from public.scope_items si
                        where si.request_id = r.id and si.user_id = auth.uid()))
      or (r.status = 'deciding' and r.decision_policy = 'vote'
        and not exists (select 1 from public.quote_votes qv
                        where qv.request_id = r.id and qv.user_id = auth.uid()))
      or (r.status = 'deciding' and r.decision_policy <> 'vote'
        and rp.role = 'coordinator' and r.selected_quote_id is null)
      or (r.status = 'contracting' and rp.role = 'coordinator'
        and r.contract_url is null and r.contract_note is null)
      or (r.status = 'funding'
        and exists (select 1 from public.cost_shares cs
                    where cs.request_id = r.id and cs.user_id = auth.uid() and cs.paid = false))
    )

  union all

  -- Cohorts I run with neighbors waiting to be approved.
  select null::uuid, ch.name, ch.handle, 'forming',
    'join_requests', 'neighbor request' || case when count(*) > 1 then 's' else '' end || ' to review',
    count(*)::int
  from public.cohorts ch
  join public.cohort_members mgr
    on mgr.cohort_id = ch.id and mgr.user_id = auth.uid()
   and mgr.status = 'approved'
   and (mgr.access_level = 'manager' or ch.created_by = auth.uid())
  join public.cohort_members req
    on req.cohort_id = ch.id and req.status in ('requested', 'needs_info')
  group by ch.id, ch.name, ch.handle;
$$;
grant execute on function public.my_action_items() to authenticated;

-- ---- Discover --------------------------------------------------------------
drop function if exists public.discoverable_projects();
create or replace function public.discoverable_projects()
returns table (
  id uuid, title text, category text, status text, project_type text,
  cohort_handle text, cohort_name text, participants bigint, min_size int,
  join_policy text, target_date date
)
language sql stable security definer set search_path = public as $$
  select r.id, r.title, r.category, r.status, r.project_type,
         ch.handle, ch.name,
         (select count(*) from public.request_participants rp2
          where rp2.request_id = r.id and rp2.status = 'joined'),
         r.min_size, r.join_policy, r.target_date
  from public.service_requests r
  join public.cohorts ch on ch.id = r.cohort_id
  join public.cohort_members cm
    on cm.cohort_id = r.cohort_id and cm.user_id = auth.uid() and cm.status = 'approved'
  where r.status in ('forming', 'scoping', 'research', 'rfq')
    and coalesce(r.locked, false) = false
    and not exists (
      select 1 from public.request_participants me
      where me.request_id = r.id and me.user_id = auth.uid() and me.status = 'joined'
    )
  order by r.last_activity_at desc
  limit 6;
$$;
grant execute on function public.discoverable_projects() to authenticated;
