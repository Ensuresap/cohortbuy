-- CohortBuy — in-app tokens (Web2 ledger). Non-cash: points/credits only,
-- never redeemable for money. Append-only transaction log + derived balance.

create table if not exists public.token_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance integer not null default 0,          -- spendable
  lifetime_earned integer not null default 0,  -- drives reputation/status tier
  updated_at timestamptz not null default now()
);

create table if not exists public.token_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null,                       -- + earn/grant, - spend
  type text not null check (type in ('earn', 'grant', 'spend', 'adjust')),
  reason text,
  ref jsonb not null default '{}'::jsonb,
  created_by text,                               -- 'system' | 'agent' | user/admin id
  created_at timestamptz not null default now()
);

create index if not exists token_tx_user_idx
  on public.token_transactions (user_id, created_at desc);

-- Atomic apply: ensures balance + ledger stay consistent and blocks overspend.
create or replace function public.apply_token_tx(
  p_user uuid,
  p_amount integer,
  p_type text,
  p_reason text,
  p_created_by text,
  p_ref jsonb default '{}'::jsonb
) returns integer
language plpgsql
as $$
declare
  new_balance integer;
begin
  insert into public.token_accounts (user_id) values (p_user)
    on conflict (user_id) do nothing;

  update public.token_accounts
    set balance = balance + p_amount,
        lifetime_earned = lifetime_earned + greatest(p_amount, 0),
        updated_at = now()
    where user_id = p_user
    returning balance into new_balance;

  if new_balance < 0 then
    raise exception 'insufficient_tokens';
  end if;

  insert into public.token_transactions (user_id, amount, type, reason, ref, created_by)
    values (p_user, p_amount, p_type, p_reason, p_ref, p_created_by);

  return new_balance;
end;
$$;

alter table public.token_accounts enable row level security;
alter table public.token_transactions enable row level security;
-- RLS policies (members read own balance/history; staff/admin manage) added with auth.
