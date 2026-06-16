-- CohortBuy — cohorts, membership, and cohort-keyed RLS.

create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  handle text unique not null,
  name text not null,
  description text,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  category text,
  country text not null default 'US',
  created_by uuid references public.profiles (id),
  last_activity_at timestamptz not null default now(),  -- for inactivity tracking
  created_at timestamptz not null default now()
);
create index if not exists cohorts_visibility_idx on public.cohorts (visibility);

create table if not exists public.cohort_members (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  access_level text not null default 'member' check (access_level in ('member', 'manager')),
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'rejected', 'needs_info')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cohort_id, user_id)
);
create index if not exists cohort_members_user_idx on public.cohort_members (user_id, status);
create index if not exists cohort_members_cohort_idx on public.cohort_members (cohort_id, status);

-- ── Cohort RLS helpers (SECURITY DEFINER + STABLE so they bypass member-table
-- RLS, avoid recursion, and run fast). These power cohort-keyed policies and
-- mirror what a JWT custom-claims hook would later cache at login.
create or replace function public.auth_cohort_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select cohort_id from public.cohort_members
  where user_id = auth.uid() and status = 'approved';
$$;

create or replace function public.auth_is_cohort_manager(p_cohort uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.cohort_members
    where cohort_id = p_cohort and user_id = auth.uid()
      and status = 'approved' and access_level = 'manager'
  );
$$;

-- Create a cohort and make the creator an approved manager (atomic, elevated).
create or replace function public.create_cohort(
  p_name text, p_handle text, p_description text,
  p_visibility text, p_category text, p_country text
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  insert into public.cohorts (name, handle, description, visibility, category, country, created_by)
    values (p_name, lower(p_handle), p_description,
            coalesce(p_visibility, 'public'), p_category, coalesce(p_country, 'US'), auth.uid())
    returning id into new_id;
  insert into public.cohort_members (cohort_id, user_id, access_level, status)
    values (new_id, auth.uid(), 'manager', 'approved');
  return new_id;
end; $$;

-- A member responds to a "needs_info" request (updates only their own note + re-requests).
create or replace function public.respond_join_info(p_cohort uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.cohort_members
    set note = p_note, status = 'requested', updated_at = now()
    where cohort_id = p_cohort and user_id = auth.uid() and status = 'needs_info';
end; $$;

alter table public.cohorts enable row level security;
alter table public.cohort_members enable row level security;

-- Cohorts: public visible to all authed; private only to members/managers.
create policy cohorts_select on public.cohorts for select to authenticated
  using (visibility = 'public'
         or id in (select public.auth_cohort_ids())
         or public.auth_is_cohort_manager(id));
-- Creation is via create_cohort() (SECURITY DEFINER); no direct insert policy.
create policy cohorts_update on public.cohorts for update to authenticated
  using (public.auth_is_cohort_manager(id)) with check (public.auth_is_cohort_manager(id));

-- Members: users see their own rows; managers see their cohort's rows.
create policy cohort_members_select on public.cohort_members for select to authenticated
  using (user_id = auth.uid() or public.auth_is_cohort_manager(cohort_id));
-- Users may only request to join (own row, member, requested). No self-escalation.
create policy cohort_members_insert on public.cohort_members for insert to authenticated
  with check (user_id = auth.uid() and access_level = 'member' and status = 'requested');
-- Only managers update membership (approve/reject/needs_info, promote). Members
-- use respond_join_info() to add info — they cannot change their own status/level.
create policy cohort_members_update on public.cohort_members for update to authenticated
  using (public.auth_is_cohort_manager(cohort_id))
  with check (public.auth_is_cohort_manager(cohort_id));

-- Tie AI config + memory to cohorts now that the table exists.
alter table public.cohort_ai_settings
  add constraint cohort_ai_settings_cohort_fk
  foreign key (cohort_id) references public.cohorts (id) on delete cascade;
alter table public.agent_memory
  add constraint agent_memory_cohort_fk
  foreign key (cohort_id) references public.cohorts (id) on delete cascade;
