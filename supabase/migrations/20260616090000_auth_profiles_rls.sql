-- CohortBuy — auth wiring: auto-create profile on signup + self-access RLS.

-- Create a profile shell when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
    values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profiles: users manage their own row.
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Tokens & notifications: users can read their own.
drop policy if exists token_accounts_self on public.token_accounts;
create policy token_accounts_self on public.token_accounts
  for select to authenticated using (user_id = auth.uid());

drop policy if exists token_tx_self on public.token_transactions;
create policy token_tx_self on public.token_transactions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists notifications_self on public.notifications;
create policy notifications_self on public.notifications
  for select to authenticated using (user_id = auth.uid());

-- NOTE: staff/admin cross-row access is added later via a SECURITY DEFINER
-- helper (avoids recursive RLS on profiles). Server-side writes use the
-- service-role key, which bypasses RLS.
