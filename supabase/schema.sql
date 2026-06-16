-- CohortBuy — waitlist table
-- Run this in the Supabase SQL editor (Project: cohortbuy).

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  zip text,
  source text default 'landing',
  created_at timestamptz not null default now()
);

-- Enable Row Level Security.
alter table public.waitlist enable row level security;

-- Allow anonymous visitors to sign up (insert only) from the landing page.
create policy "Anyone can join the waitlist"
  on public.waitlist
  for insert
  to anon
  with check (true);

-- Note: no select/update/delete policy for anon, so the list is not publicly
-- readable. Read it from the Supabase dashboard or a service-role backend.
