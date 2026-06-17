-- CohortBuy — public cohort discovery with aggregates + near-me ordering.
-- SECURITY DEFINER so any authenticated user can read aggregate counts/sums for
-- PUBLIC cohorts (member identities are NOT exposed — only counts and totals),
-- bypassing per-table RLS the way the discover surface needs.
--
-- value_cents sums service_requests.agreed_amount_cents and is a simplification:
-- it mixes currencies if a cohort ever spans them. For the US-first launch this
-- is treated as USD-equivalent "value coordinated"; revisit if multi-currency.

drop function if exists public.discover_cohorts(text, text, int);
create or replace function public.discover_cohorts(
  p_query text default null,
  p_country text default null,
  p_limit int default 24
)
returns table (
  id uuid,
  handle text,
  name text,
  description text,
  tagline text,
  avatar_url text,
  cover_url text,
  category text,
  country text,
  member_count bigint,
  project_count bigint,
  value_cents bigint,
  is_near boolean
)
language sql stable security definer set search_path = public as $$
  select
    c.id, c.handle, c.name, c.description, c.tagline,
    c.avatar_url, c.cover_url, c.category, c.country,
    (select count(*) from public.cohort_members m
       where m.cohort_id = c.id and m.status = 'approved') as member_count,
    (select count(*) from public.service_requests r
       where r.cohort_id = c.id) as project_count,
    (select coalesce(sum(r.agreed_amount_cents), 0) from public.service_requests r
       where r.cohort_id = c.id and r.agreed_amount_cents is not null) as value_cents,
    (p_country is not null and c.country = p_country) as is_near
  from public.cohorts c
  where c.visibility = 'public'
    and (p_query is null or c.name ilike '%' || p_query || '%')
  order by
    (p_country is not null and c.country = p_country) desc,
    member_count desc,
    value_cents desc,
    c.last_activity_at desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.discover_cohorts(text, text, int) to authenticated, anon;
