-- CohortBuy — Capability 4 (Market Research): price benchmark + vendor shortlist
-- + brief approval. Facilitator posture: vetting is informational, not a guarantee.

-- Project-level research brief fields (single-group; per-sub-group is a later refinement).
alter table public.service_requests add column if not exists benchmark_low_cents bigint;
alter table public.service_requests add column if not exists benchmark_high_cents bigint;
alter table public.service_requests add column if not exists benchmark_currency text default 'USD';
alter table public.service_requests add column if not exists research_notes text;
alter table public.service_requests add column if not exists shortlist_approved boolean not null default false;

-- Platform-wide vendor registry (ops-curated; everyone signed in can read).
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  contact_email text,
  contact_phone text,
  categories text[] not null default '{}',
  coverage_zips text[] not null default '{}',
  notes text,
  vetting_status text not null default 'unverified' check (vetting_status in ('unverified', 'vetted')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists vendors_categories_idx on public.vendors using gin (categories);

alter table public.vendors enable row level security;
drop policy if exists vendors_select on public.vendors;
create policy vendors_select on public.vendors for select to authenticated using (true);
drop policy if exists vendors_write on public.vendors;
create policy vendors_write on public.vendors for all to authenticated
  using (public.is_platform_staff()) with check (public.is_platform_staff());

-- Per-project candidate vendors (the shortlist).
create table if not exists public.vendor_candidates (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  vendor_id uuid references public.vendors (id),
  name text not null,
  contact text,
  website text,
  source text not null default 'member' check (source in ('member', 'registry', 'ai', 'web')),
  status text not null default 'considering' check (status in ('considering', 'shortlisted', 'contacted', 'declined')),
  vetting_status text not null default 'unverified' check (vetting_status in ('unverified', 'vetted')),
  notes text,
  suggested_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists vendor_candidates_request_idx on public.vendor_candidates (request_id);

alter table public.vendor_candidates enable row level security;
create policy vendor_candidates_select on public.vendor_candidates for select to authenticated
  using (public.auth_request_cohort(request_id) in (select public.auth_cohort_ids())
         or public.auth_is_cohort_manager(public.auth_request_cohort(request_id)));
create policy vendor_candidates_insert on public.vendor_candidates for insert to authenticated
  with check (public.auth_request_cohort(request_id) in (select public.auth_cohort_ids()));
-- updates/deletes go through SECURITY DEFINER funcs (author or coordinator/manager).

create or replace function public.set_candidate_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare v_req uuid; v_owner uuid;
begin
  if p_status not in ('considering', 'shortlisted', 'contacted', 'declined') then raise exception 'bad_status'; end if;
  select request_id, suggested_by into v_req, v_owner from public.vendor_candidates where id = p_id;
  if v_req is null then raise exception 'not_found'; end if;
  if not public.can_manage_request_entry(v_req, v_owner) then raise exception 'forbidden'; end if;
  update public.vendor_candidates set status = p_status where id = p_id;
end; $$;

create or replace function public.delete_candidate(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_req uuid; v_owner uuid;
begin
  select request_id, suggested_by into v_req, v_owner from public.vendor_candidates where id = p_id;
  if v_req is null then return; end if;
  if not public.can_manage_request_entry(v_req, v_owner) then raise exception 'forbidden'; end if;
  delete from public.vendor_candidates where id = p_id;
end; $$;

-- Coordinator/manager sets the benchmark range + research notes.
create or replace function public.set_research(p_request uuid, p_low bigint, p_high bigint, p_currency text, p_notes text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.service_requests r
    where r.id = p_request and (r.created_by = auth.uid() or public.auth_is_cohort_manager(r.cohort_id))
  ) then raise exception 'not_coordinator'; end if;
  update public.service_requests
    set benchmark_low_cents = p_low, benchmark_high_cents = p_high,
        benchmark_currency = coalesce(nullif(p_currency, ''), 'USD'),
        research_notes = nullif(p_notes, ''), last_activity_at = now()
    where id = p_request;
end; $$;

-- Coordinator/manager approves the shortlist (requires at least one shortlisted vendor).
create or replace function public.approve_shortlist(p_request uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.service_requests r
    where r.id = p_request and (r.created_by = auth.uid() or public.auth_is_cohort_manager(r.cohort_id))
  ) then raise exception 'not_coordinator'; end if;
  if not exists (select 1 from public.vendor_candidates where request_id = p_request and status = 'shortlisted') then
    raise exception 'no_shortlist';
  end if;
  update public.service_requests set shortlist_approved = true, last_activity_at = now() where id = p_request;
end; $$;
