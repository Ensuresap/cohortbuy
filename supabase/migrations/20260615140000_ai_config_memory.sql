-- CohortBuy — AI model configuration + scoped agent memory

-- Global default model (single 'global' row).
create table if not exists public.ai_settings (
  id text primary key default 'global',
  provider text not null,
  model text not null,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

-- Per-cohort model override (cohort_id → a cohort/request; FK added with the
-- cohorts table). Absence means "use the global default".
create table if not exists public.cohort_ai_settings (
  cohort_id uuid primary key,
  provider text not null,
  model text not null,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

-- Agent memory, scoped to a cohort and (optionally) a specific work item, so
-- the agent loads the right context. (Vector embeddings can be added later.)
create table if not exists public.agent_memory (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('cohort', 'work')),
  cohort_id uuid not null,
  work_item_id uuid,
  key text,
  content text not null,
  created_by text,                 -- 'agent' | user id | 'admin'
  created_at timestamptz not null default now()
);

create index if not exists agent_memory_scope_idx
  on public.agent_memory (cohort_id, work_item_id, created_at desc);

alter table public.ai_settings enable row level security;
alter table public.cohort_ai_settings enable row level security;
alter table public.agent_memory enable row level security;
-- RLS policies (admin/staff write ai_settings & overrides; agent/members scoped
-- memory access) are added with auth wiring.
