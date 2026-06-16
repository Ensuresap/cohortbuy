-- CohortBuy — service requests (projects within a cohort) + participants.

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  created_by uuid references public.profiles (id),
  title text not null,
  category text,
  description text,
  status text not null default 'forming' check (status in (
    'forming', 'scoping', 'research', 'rfq', 'deciding',
    'contracting', 'funding', 'in_progress', 'completed', 'cancelled'
  )),
  min_size integer not null default 2,
  join_deadline timestamptz,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists service_requests_cohort_idx
  on public.service_requests (cohort_id, status);

create table if not exists public.request_participants (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'participant' check (role in ('coordinator', 'treasurer', 'participant')),
  status text not null default 'joined' check (status in ('joined', 'left')),
  created_at timestamptz not null default now(),
  unique (request_id, user_id)
);
create index if not exists request_participants_user_idx on public.request_participants (user_id);

-- Helper: the cohort a request belongs to (SECURITY DEFINER to keep RLS simple/fast).
create or replace function public.auth_request_cohort(p_request uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select cohort_id from public.service_requests where id = p_request;
$$;

-- Create a request and make the creator its coordinator (member-gated, atomic).
create or replace function public.create_service_request(
  p_cohort uuid, p_title text, p_category text, p_description text, p_min_size integer
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if not exists (
    select 1 from public.cohort_members
    where cohort_id = p_cohort and user_id = auth.uid() and status = 'approved'
  ) then
    raise exception 'not_a_member';
  end if;

  insert into public.service_requests (cohort_id, created_by, title, category, description, min_size)
    values (p_cohort, auth.uid(), p_title, p_category, p_description, coalesce(p_min_size, 2))
    returning id into new_id;
  insert into public.request_participants (request_id, user_id, role, status)
    values (new_id, auth.uid(), 'coordinator', 'joined');
  return new_id;
end; $$;

alter table public.service_requests enable row level security;
alter table public.request_participants enable row level security;

-- Requests: visible to approved cohort members + managers. Created via RPC.
create policy service_requests_select on public.service_requests for select to authenticated
  using (cohort_id in (select public.auth_cohort_ids())
         or public.auth_is_cohort_manager(cohort_id));
create policy service_requests_update on public.service_requests for update to authenticated
  using (created_by = auth.uid() or public.auth_is_cohort_manager(cohort_id))
  with check (created_by = auth.uid() or public.auth_is_cohort_manager(cohort_id));

-- Participants: members see participants of requests in their cohort; users see own.
create policy request_participants_select on public.request_participants for select to authenticated
  using (user_id = auth.uid()
         or public.auth_request_cohort(request_id) in (select public.auth_cohort_ids())
         or public.auth_is_cohort_manager(public.auth_request_cohort(request_id)));
-- A cohort member may join a request (own row).
create policy request_participants_insert on public.request_participants for insert to authenticated
  with check (user_id = auth.uid()
              and public.auth_request_cohort(request_id) in (select public.auth_cohort_ids()));
-- Self (e.g. leave) or the cohort manager may update.
create policy request_participants_update on public.request_participants for update to authenticated
  using (user_id = auth.uid()
         or public.auth_is_cohort_manager(public.auth_request_cohort(request_id)));
