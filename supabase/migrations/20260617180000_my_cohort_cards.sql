-- CohortBuy — the caller's own cohorts as discover-style cards (with aggregates
-- and their membership status), so they can be shown first in the list.

create or replace function public.my_cohort_cards()
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
  covers boolean,
  my_status text,
  my_access text
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
    false as covers,
    cm.status as my_status,
    cm.access_level as my_access
  from public.cohort_members cm
  join public.cohorts c on c.id = cm.cohort_id
  where cm.user_id = auth.uid()
  order by (cm.access_level = 'manager') desc, c.last_activity_at desc;
$$;

grant execute on function public.my_cohort_cards() to authenticated;
