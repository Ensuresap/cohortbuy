-- CohortBuy — discover_cohorts gains an optional hard country filter so a
-- viewer sees cohorts in their own country by default (other countries are
-- hidden unless they opt into "all locations"). p_filter_country=false keeps
-- the prior behaviour (all countries, near-you first).

drop function if exists public.discover_cohorts(text, text, text, int);
create or replace function public.discover_cohorts(
  p_query text default null,
  p_country text default null,
  p_tag text default null,
  p_filter_country boolean default false,
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
  tags text[],
  country text,
  kind text,
  member_count bigint,
  project_count bigint,
  value_cents bigint,
  is_near boolean
)
language sql stable security definer set search_path = public as $$
  select
    c.id, c.handle, c.name, c.description, c.tagline,
    c.avatar_url, c.cover_url, c.tags, c.country, c.kind,
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
    and (p_tag is null or p_tag = any(c.tags))
    and (not p_filter_country or p_country is null or c.country = p_country)
  order by
    (p_country is not null and c.country = p_country) desc,
    member_count desc,
    value_cents desc,
    c.last_activity_at desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.discover_cohorts(text, text, text, boolean, int) to authenticated, anon;
