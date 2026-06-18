-- CohortBuy — store the assumptions/criteria behind a price benchmark separately
-- from the coordinator's permit/HOA notes.
alter table public.service_requests add column if not exists benchmark_basis text;

create or replace function public.set_benchmark(p_request uuid, p_low bigint, p_high bigint, p_currency text, p_basis text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.service_requests r
    where r.id = p_request and (r.created_by = auth.uid() or public.auth_is_cohort_manager(r.cohort_id))
  ) then raise exception 'not_coordinator'; end if;
  update public.service_requests
    set benchmark_low_cents = p_low, benchmark_high_cents = p_high,
        benchmark_currency = coalesce(nullif(p_currency, ''), 'USD'),
        benchmark_basis = nullif(p_basis, ''), last_activity_at = now()
    where id = p_request;
end; $$;
