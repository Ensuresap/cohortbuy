-- CohortBuy — richer cohort profile, member titles, presence, member directory.

alter table public.cohorts add column if not exists avatar_url text;
alter table public.cohorts add column if not exists tagline text;
alter table public.cohort_members add column if not exists title text;  -- e.g. "Treasurer"
alter table public.profiles add column if not exists last_seen_at timestamptz;

-- Member directory for a cohort (only for approved members of that cohort).
-- SECURITY DEFINER so co-members can see each other's basics despite profiles RLS.
create or replace function public.cohort_member_directory(p_cohort uuid)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  last_seen_at timestamptz,
  access_level text,
  title text,
  member_since timestamptz
) language sql stable security definer set search_path = public as $$
  select m.user_id, p.display_name, p.avatar_url, p.last_seen_at,
         m.access_level, m.title, m.created_at
  from public.cohort_members m
  join public.profiles p on p.id = m.user_id
  where m.cohort_id = p_cohort and m.status = 'approved'
    and exists (
      select 1 from public.cohort_members me
      where me.cohort_id = p_cohort and me.user_id = auth.uid() and me.status = 'approved'
    )
  order by (m.access_level = 'manager') desc, m.created_at asc;
$$;

-- A manager assigns/clears a member's title.
create or replace function public.set_member_title(p_cohort uuid, p_user uuid, p_title text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.cohort_members
    where cohort_id = p_cohort and user_id = auth.uid()
      and status = 'approved' and access_level = 'manager'
  ) then
    raise exception 'forbidden';
  end if;
  update public.cohort_members
    set title = nullif(btrim(p_title), ''), updated_at = now()
    where cohort_id = p_cohort and user_id = p_user;
end; $$;

-- Only the OWNER (creator) can promote/demote co-admins (co-managers).
create or replace function public.set_cohort_comanager(p_cohort uuid, p_user uuid, p_make_manager boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.cohorts where id = p_cohort and created_by = auth.uid()) then
    raise exception 'forbidden';
  end if;
  update public.cohort_members
    set access_level = case when p_make_manager then 'manager' else 'member' end,
        updated_at = now()
    where cohort_id = p_cohort and user_id = p_user and status = 'approved';
end; $$;
