-- CohortBuy — cohort tags (multi) replacing the single cohort category.
--   • cohorts.tags text[]  — normalized slugs (e.g. 'fencing', 'pest-control')
--   • tag_catalog          — platform-managed common tags (suggested in the UI)
-- The old cohorts.category column is left in place (unused) to avoid a
-- destructive drop; the app no longer reads or writes it. (service_requests
-- keeps its own project-level `category` — unrelated.)

alter table public.cohorts add column if not exists tags text[] not null default '{}';
create index if not exists cohorts_tags_gin on public.cohorts using gin (tags);

-- one-time migration: slugify any existing single category into tags
update public.cohorts
   set tags = array[ trim(both '-' from regexp_replace(lower(trim(category)), '[^a-z0-9]+', '-', 'g')) ]
 where category is not null and trim(category) <> ''
   and (tags is null or tags = '{}');

-- ── platform-managed common tags ──────────────────────────────────────────
create table if not exists public.tag_catalog (
  slug text primary key,
  label text not null,
  kind text not null default 'both' check (kind in ('service', 'group_buy', 'both')),
  sort int not null default 100,
  created_at timestamptz not null default now()
);

alter table public.tag_catalog enable row level security;

drop policy if exists tag_catalog_read on public.tag_catalog;
create policy tag_catalog_read on public.tag_catalog
  for select to authenticated using (true);

-- only platform staff can manage the catalog
drop policy if exists tag_catalog_write on public.tag_catalog;
create policy tag_catalog_write on public.tag_catalog
  for all to authenticated
  using (public.is_platform_staff())
  with check (public.is_platform_staff());

insert into public.tag_catalog (slug, label, kind, sort) values
  ('fencing'             , 'Fencing'             , 'service'  , 10),
  ('roofing'             , 'Roofing'             , 'service'  , 20),
  ('solar'               , 'Solar'               , 'service'  , 30),
  ('landscaping'         , 'Landscaping'         , 'service'  , 40),
  ('pest-control'        , 'Pest Control'        , 'service'  , 50),
  ('hvac'                , 'HVAC'                 , 'service'  , 60),
  ('gutters'             , 'Gutters'             , 'service'  , 70),
  ('driveway-paving'     , 'Driveway & Paving'   , 'service'  , 80),
  ('exterior-painting'   , 'Exterior Painting'   , 'service'  , 90),
  ('tree-service'        , 'Tree Service'        , 'service'  , 100),
  ('pressure-washing'    , 'Pressure Washing'    , 'service'  , 110),
  ('windows'             , 'Windows'             , 'service'  , 120),
  ('plumbing'            , 'Plumbing'            , 'service'  , 130),
  ('electrical'          , 'Electrical'          , 'service'  , 140),
  ('snow-removal'        , 'Snow Removal'        , 'service'  , 150),
  ('pool-service'        , 'Pool Service'        , 'service'  , 160),
  ('fiber-internet'      , 'Fiber / Internet'    , 'service'  , 170),
  ('mulch-compost'       , 'Mulch & Compost'     , 'group_buy', 200),
  ('firewood'            , 'Firewood'            , 'group_buy', 210),
  ('propane-heating-oil' , 'Propane / Heating Oil','group_buy', 220),
  ('ev-chargers'         , 'EV Chargers'         , 'group_buy', 230),
  ('water-softener-salt' , 'Water Softener Salt' , 'group_buy', 240),
  ('led-bulbs'           , 'LED Bulbs'           , 'group_buy', 250),
  ('rain-barrels'        , 'Rain Barrels'        , 'group_buy', 260),
  ('native-plants'       , 'Native Plants'       , 'group_buy', 270),
  ('generators'          , 'Generators'          , 'group_buy', 280),
  ('hoa'                 , 'HOA'                 , 'both'     , 300),
  ('eco-friendly'        , 'Eco-friendly'        , 'both'     , 310),
  ('seasonal'            , 'Seasonal'            , 'both'     , 320),
  ('emergency'           , 'Emergency'           , 'both'     , 330)
on conflict (slug) do update set label = excluded.label, kind = excluded.kind, sort = excluded.sort;

-- ── create_cohort: take p_tags, drop p_category ────────────────────────────
drop function if exists public.create_cohort(text, text, text, text, text, text, text);
create or replace function public.create_cohort(
  p_name text, p_handle text, p_description text,
  p_visibility text, p_country text, p_kind text, p_tags text[]
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  insert into public.cohorts (name, handle, description, visibility, country, kind, tags, created_by)
    values (p_name, lower(p_handle), p_description,
            coalesce(p_visibility, 'public'), coalesce(p_country, 'US'),
            coalesce(p_kind, 'service'), coalesce(p_tags, '{}'), auth.uid())
    returning id into new_id;
  insert into public.cohort_members (cohort_id, user_id, access_level, status)
    values (new_id, auth.uid(), 'manager', 'approved');
  return new_id;
end; $$;

-- ── discover_cohorts: filter by tag + return tags (replaces category) ──────
drop function if exists public.discover_cohorts(text, text, int);
create or replace function public.discover_cohorts(
  p_query text default null,
  p_country text default null,
  p_tag text default null,
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
  order by
    (p_country is not null and c.country = p_country) desc,
    member_count desc,
    value_cents desc,
    c.last_activity_at desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.discover_cohorts(text, text, text, int) to authenticated, anon;
