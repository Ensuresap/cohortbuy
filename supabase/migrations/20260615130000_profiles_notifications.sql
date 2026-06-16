-- CohortBuy — profiles + notifications

-- User profiles (1:1 with auth.users). Includes notification preferences and
-- SMS consent. Per-project roles live on request_members (added later), not here.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  handle text unique,
  avatar_url text,
  email text,
  phone text,                          -- E.164, e.g. +14155550123
  sms_opt_in boolean not null default false,
  sms_opt_in_at timestamptz,           -- when consent was captured (TCPA record)
  preferred_channel text not null default 'sms'
    check (preferred_channel in ('sms', 'whatsapp', 'email')),
  notification_prefs jsonb not null default '{}'::jsonb,
  country text not null default 'US',
  role text not null default 'member'
    check (role in ('member', 'staff', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
-- RLS policies (self read/update; staff/admin read) are added with auth wiring.

-- Append-only notification log (delivery audit).
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  event text not null,
  channel text not null check (channel in ('sms', 'whatsapp', 'email')),
  status text not null check (status in ('sent', 'failed', 'skipped')),
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
