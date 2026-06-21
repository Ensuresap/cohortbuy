-- CohortBuy — safe, aggregate platform stats for the public landing page.
-- Only PUBLIC cohorts are counted, and only non-identifying totals are returned,
-- so this can be granted to anonymous visitors.
create or replace function public.platform_public_stats()
returns table (cohorts bigint, members bigint, projects bigint, value_cents bigint, saved_cents bigint)
language sql stable security definer set search_path = public as $$
  with pub as (select id from public.cohorts where visibility = 'public')
  select
    (select count(*) from pub),
    (select count(distinct cm.user_id)
       from public.cohort_members cm join pub on pub.id = cm.cohort_id
      where cm.status = 'approved'),
    (select count(*) from public.service_requests r join pub on pub.id = r.cohort_id),
    (select coalesce(sum(r.agreed_amount_cents), 0)
       from public.service_requests r join pub on pub.id = r.cohort_id),
    (select coalesce(sum(
              greatest(coalesce(r.benchmark_high_cents, 0) - coalesce(r.agreed_amount_cents, 0), 0)
              * (select count(*) from public.request_participants rp where rp.request_id = r.id and rp.status = 'joined')
            ), 0)
       from public.service_requests r join pub on pub.id = r.cohort_id
      where r.status = 'completed');
$$;
grant execute on function public.platform_public_stats() to anon, authenticated;
