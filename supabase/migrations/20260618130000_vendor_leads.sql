-- CohortBuy — inbound vendor/seller leads from the public "For vendors" page.
create table if not exists public.vendor_leads (
  id uuid primary key default gen_random_uuid(),
  business text not null,
  contact_name text,
  email text not null,
  phone text,
  categories text,
  service_area text,
  message text,
  source text default 'vendors',
  created_at timestamptz not null default now()
);

alter table public.vendor_leads enable row level security;

-- Anonymous visitors may submit a lead (insert only); not publicly readable.
drop policy if exists vendor_leads_insert on public.vendor_leads;
create policy vendor_leads_insert on public.vendor_leads
  for insert to anon, authenticated
  with check (true);
