-- CohortBuy — make the dashboard show VALUE, not just status.
--   my_active_projects(): now also returns pooled member count + the money
--     (benchmark range pre-decision, agreed amount after) so each card can show
--     "N neighbors · est. $A–$B" or "Agreed $X · save ~$Y".
--   community_wins(): gamification feed — recently completed projects with an
--     estimated total saved, for social proof across public + my cohorts.

drop function if exists public.my_active_projects();
create or replace function public.my_active_projects()
returns table (
  id uuid, title text, status text, project_type text, target_date date,
  role text, cohort_handle text, cohort_name text,
  last_activity_at timestamptz,
  last_comment text, last_comment_author text, last_comment_kind text, last_comment_at timestamptz,
  participants bigint,
  benchmark_low_cents bigint, benchmark_high_cents bigint,
  agreed_amount_cents bigint, currency text
)
language sql stable security definer set search_path = public as $$
  select r.id, r.title, r.status, r.project_type, r.target_date,
         rp.role, ch.handle, ch.name,
         r.last_activity_at,
         lc.body, lc.author_name, lc.kind, lc.created_at,
         (select count(*) from public.request_participants rp2
          where rp2.request_id = r.id and rp2.status = 'joined'),
         r.benchmark_low_cents, r.benchmark_high_cents,
         r.agreed_amount_cents,
         coalesce(r.agreed_currency, r.benchmark_currency, 'USD')
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

-- ---- Community wins (gamification / social proof) --------------------------
drop function if exists public.community_wins();
create or replace function public.community_wins()
returns table (
  id uuid, title text, cohort_name text, cohort_handle text,
  participants bigint, saved_cents bigint, currency text, completed_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select r.id, r.title, ch.name, ch.handle,
         cnt.n,
         greatest(coalesce(r.benchmark_high_cents, 0) - coalesce(r.agreed_amount_cents, 0), 0) * cnt.n,
         coalesce(r.agreed_currency, r.benchmark_currency, 'USD'),
         r.completed_at
  from public.service_requests r
  join public.cohorts ch on ch.id = r.cohort_id
  cross join lateral (
    select count(*)::bigint as n from public.request_participants rp
    where rp.request_id = r.id and rp.status = 'joined'
  ) cnt
  where r.status = 'completed'
    and (
      ch.visibility = 'public'
      or r.cohort_id in (select cohort_id from public.cohort_members
                         where user_id = auth.uid() and status = 'approved')
    )
  order by r.completed_at desc nulls last
  limit 8;
$$;
grant execute on function public.community_wins() to authenticated;
