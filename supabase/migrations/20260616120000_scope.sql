-- CohortBuy — scope items for a service request.

create table if not exists public.scope_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  description text not null,
  quantity text,                                  -- free-form for MVP, e.g. "120 ft"
  notes text,
  fields jsonb not null default '{}'::jsonb,       -- structured per-category (future)
  created_at timestamptz not null default now()
);
create index if not exists scope_items_request_idx on public.scope_items (request_id);

alter table public.scope_items enable row level security;

-- Visible to approved members of the request's cohort (+ managers).
create policy scope_items_select on public.scope_items for select to authenticated
  using (public.auth_request_cohort(request_id) in (select public.auth_cohort_ids())
         or public.auth_is_cohort_manager(public.auth_request_cohort(request_id)));
-- A member may add their own scope items.
create policy scope_items_insert on public.scope_items for insert to authenticated
  with check (user_id = auth.uid()
              and public.auth_request_cohort(request_id) in (select public.auth_cohort_ids()));
-- Own items editable/removable by the author (or cohort manager).
create policy scope_items_update on public.scope_items for update to authenticated
  using (user_id = auth.uid()
         or public.auth_is_cohort_manager(public.auth_request_cohort(request_id)));
create policy scope_items_delete on public.scope_items for delete to authenticated
  using (user_id = auth.uid()
         or public.auth_is_cohort_manager(public.auth_request_cohort(request_id)));
