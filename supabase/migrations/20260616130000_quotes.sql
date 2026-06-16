-- CohortBuy — quotes recorded against a service request (manual entry phase).
-- Money stored as integer minor units + ISO currency code (never floats).

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  vendor_name text not null,
  amount_cents bigint not null,
  currency text not null default 'USD',
  kind text not null default 'indicative' check (kind in ('indicative', 'final')),
  timeline text,
  warranty text,
  notes text,
  status text not null default 'received'
    check (status in ('received', 'shortlisted', 'selected', 'rejected')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists quotes_request_idx on public.quotes (request_id, amount_cents);

alter table public.quotes enable row level security;

create policy quotes_select on public.quotes for select to authenticated
  using (public.auth_request_cohort(request_id) in (select public.auth_cohort_ids())
         or public.auth_is_cohort_manager(public.auth_request_cohort(request_id)));
create policy quotes_insert on public.quotes for insert to authenticated
  with check (public.auth_request_cohort(request_id) in (select public.auth_cohort_ids()));
create policy quotes_update on public.quotes for update to authenticated
  using (created_by = auth.uid()
         or public.auth_is_cohort_manager(public.auth_request_cohort(request_id)));
create policy quotes_delete on public.quotes for delete to authenticated
  using (created_by = auth.uid()
         or public.auth_is_cohort_manager(public.auth_request_cohort(request_id)));
