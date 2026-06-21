-- CohortBuy — project cards also carry the caller's role/status + lock, so the
-- cohort list can show "You · Coordinator" or a Join / Request-to-join button.
drop function if exists public.cohort_project_cards(uuid);
create or replace function public.cohort_project_cards(p_cohort uuid)
returns table (
  id uuid, slug text, title text, category text, status text, project_type text,
  target_date date, min_size int, join_policy text, locked boolean, participants bigint,
  benchmark_low_cents bigint, benchmark_high_cents bigint, agreed_amount_cents bigint, currency text,
  my_role text, my_status text
)
language sql stable security definer set search_path = public as $$
  select r.id, r.slug, r.title, r.category, r.status, r.project_type,
         r.target_date, r.min_size, r.join_policy, r.locked,
         (select count(*) from public.request_participants rp where rp.request_id = r.id and rp.status = 'joined'),
         r.benchmark_low_cents, r.benchmark_high_cents, r.agreed_amount_cents,
         coalesce(r.agreed_currency, r.benchmark_currency, 'USD'),
         (select rp2.role from public.request_participants rp2 where rp2.request_id = r.id and rp2.user_id = auth.uid()),
         (select rp3.status from public.request_participants rp3 where rp3.request_id = r.id and rp3.user_id = auth.uid())
  from public.service_requests r
  where r.cohort_id = p_cohort
    and (p_cohort in (select public.auth_cohort_ids()) or public.auth_is_cohort_manager(p_cohort))
  order by r.last_activity_at desc;
$$;
grant execute on function public.cohort_project_cards(uuid) to authenticated;
