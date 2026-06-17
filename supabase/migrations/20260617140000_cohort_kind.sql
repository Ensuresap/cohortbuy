-- CohortBuy — cohort "kind": service vs group buy.
--   service   = pooled work done per home (fencing, roofing, solar install, …)
--   group_buy = volume product order shared across neighbors (mulch, propane, …)
-- The lifecycle stays category-agnostic; kind is a classification for discovery.

alter table public.cohorts
  add column if not exists kind text not null default 'service'
  check (kind in ('service', 'group_buy'));

create index if not exists cohorts_kind_idx on public.cohorts (kind);

-- create_cohort gains p_kind (defaulted, so older callers keep working).
drop function if exists public.create_cohort(text, text, text, text, text, text);
create or replace function public.create_cohort(
  p_name text, p_handle text, p_description text,
  p_visibility text, p_category text, p_country text,
  p_kind text default 'service'
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  insert into public.cohorts (name, handle, description, visibility, category, country, kind, created_by)
    values (p_name, lower(p_handle), p_description,
            coalesce(p_visibility, 'public'), p_category, coalesce(p_country, 'US'),
            coalesce(p_kind, 'service'), auth.uid())
    returning id into new_id;
  insert into public.cohort_members (cohort_id, user_id, access_level, status)
    values (new_id, auth.uid(), 'manager', 'approved');
  return new_id;
end; $$;

-- discover_cohorts now returns kind alongside the aggregates.
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
  kind text,
  member_count bigint,
  project_count bigint,
  value_cents bigint,
  is_near boolean
)
language sql stable security definer set search_path = public as $$
  select
    c.id, c.handle, c.name, c.description, c.tagline,
    c.avatar_url, c.cover_url, c.category, c.country, c.kind,
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
