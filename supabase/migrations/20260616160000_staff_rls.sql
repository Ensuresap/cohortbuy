-- CohortBuy — platform staff/admin read access (for the admin panel).
-- SECURITY DEFINER helper avoids recursive RLS on profiles.

create or replace function public.is_platform_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('staff', 'admin')
  );
$$;

-- Staff can read everything (admin dashboards). User policies still apply via OR.
create policy profiles_staff_read on public.profiles for select to authenticated using (public.is_platform_staff());
create policy cohorts_staff_read on public.cohorts for select to authenticated using (public.is_platform_staff());
create policy cohort_members_staff_read on public.cohort_members for select to authenticated using (public.is_platform_staff());
create policy service_requests_staff_read on public.service_requests for select to authenticated using (public.is_platform_staff());
create policy request_participants_staff_read on public.request_participants for select to authenticated using (public.is_platform_staff());
create policy scope_items_staff_read on public.scope_items for select to authenticated using (public.is_platform_staff());
create policy quotes_staff_read on public.quotes for select to authenticated using (public.is_platform_staff());
create policy cohort_posts_staff_read on public.cohort_posts for select to authenticated using (public.is_platform_staff());
create policy token_accounts_staff_read on public.token_accounts for select to authenticated using (public.is_platform_staff());
create policy token_tx_staff_read on public.token_transactions for select to authenticated using (public.is_platform_staff());
create policy notifications_staff_read on public.notifications for select to authenticated using (public.is_platform_staff());

-- AI config + memory: staff can manage directly (previously server-role only).
create policy ai_settings_staff_all on public.ai_settings for all to authenticated
  using (public.is_platform_staff()) with check (public.is_platform_staff());
create policy cohort_ai_settings_staff_all on public.cohort_ai_settings for all to authenticated
  using (public.is_platform_staff()) with check (public.is_platform_staff());
create policy agent_memory_staff_all on public.agent_memory for all to authenticated
  using (public.is_platform_staff()) with check (public.is_platform_staff());
