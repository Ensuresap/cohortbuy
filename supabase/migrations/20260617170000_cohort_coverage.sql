-- CohortBuy — cohort coverage area (US ZIP codes) for local relevance.
-- A cohort declares the ZIP codes it serves (coordinator can add several
-- adjacent neighborhoods); a searcher matches when their ZIP is covered.
-- Country stays as the coarse fallback; city/region are for display.

alter table public.cohorts
  add column if not exists coverage_zips text[] not null default '{}',
  add column if not exists city text,
  add column if not exists region text;
create index if not exists cohorts_coverage_gin on public.cohorts using gin (coverage_zips);

alter table public.profiles
  add column if not exists postal_code text,
  add column if not exists city text;

-- ── create_cohort: add coverage zips + city/region ─────────────────────────
drop function if exists public.create_cohort(text, text, text, text, text, text, text[]);
create or replace function public.create_cohort(
  p_name text, p_handle text, p_description text,
  p_visibility text, p_country text, p_kind text, p_tags text[],
  p_coverage_zips text[] default '{}', p_city text default null, p_region text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  insert into public.cohorts
      (name, handle, description, visibility, country, kind, tags,
       coverage_zips, city, region, created_by)
    values (p_name, lower(p_handle), p_description,
            coalesce(p_visibility, 'public'), coalesce(p_country, 'US'),
            coalesce(p_kind, 'service'), coalesce(p_tags, '{}'),
            coalesce(p_coverage_zips, '{}'), p_city, p_region, auth.uid())
    returning id into new_id;
  insert into public.cohort_members (cohort_id, user_id, access_level, status)
    values (new_id, auth.uid(), 'manager', 'approved');
  return new_id;
end; $$;

-- ── discover_cohorts: ZIP-scoped, local-first ──────────────────────────────
-- p_scope: 'zip' (cohorts covering p_zip), 'country' (same country), 'all'.
drop function if exists public.discover_cohorts(text, text, text, boolean, int);
create or replace function public.discover_cohorts(
  p_query text default null,
  p_country text default null,
  p_zip text default null,
  p_tag text default null,
  p_scope text default 'all',
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
  city text,
  region text,
  coverage_zips text[],
  kind text,
  member_count bigint,
  project_count bigint,
  value_cents bigint,
  covers boolean
)
language sql stable security definer set search_path = public as $$
  select
    c.id, c.handle, c.name, c.description, c.tagline,
    c.avatar_url, c.cover_url, c.tags, c.country, c.city, c.region, c.coverage_zips, c.kind,
    (select count(*) from public.cohort_members m
       where m.cohort_id = c.id and m.status = 'approved') as member_count,
    (select count(*) from public.service_requests r
       where r.cohort_id = c.id) as project_count,
    (select coalesce(sum(r.agreed_amount_cents), 0) from public.service_requests r
       where r.cohort_id = c.id and r.agreed_amount_cents is not null) as value_cents,
    (p_zip is not null and p_zip = any(c.coverage_zips)) as covers
  from public.cohorts c
  where c.visibility = 'public'
    and (p_query is null or c.name ilike '%' || p_query || '%')
    and (p_tag is null or p_tag = any(c.tags))
    and (
      case p_scope
        when 'zip' then (p_zip is not null and p_zip = any(c.coverage_zips))
        when 'country' then (p_country is null or c.country = p_country)
        else true
      end
    )
  order by
    (p_zip is not null and p_zip = any(c.coverage_zips)) desc,
    member_count desc,
    value_cents desc,
    c.last_activity_at desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.discover_cohorts(text, text, text, text, text, int) to authenticated, anon;
