-- CohortBuy — least-privilege admin access.
-- Previously platform staff had a blanket SELECT on private user-content tables.
-- The admin panel actually reads through curated SECURITY DEFINER RPCs (admin_*,
-- platform_public_stats, etc.) which run as the definer and BYPASS RLS — so they
-- keep working without these policies. Removing the broad table grants means an
-- admin can no longer pull raw private rows (phones, message payloads, each
-- home's scope, quotes, token ledgers) directly via the API. Least privilege:
-- admins see only the specific, minimised fields the curated views expose.

drop policy if exists profiles_staff_read on public.profiles;
drop policy if exists cohorts_staff_read on public.cohorts;
drop policy if exists cohort_members_staff_read on public.cohort_members;
drop policy if exists service_requests_staff_read on public.service_requests;
drop policy if exists request_participants_staff_read on public.request_participants;
drop policy if exists scope_items_staff_read on public.scope_items;
drop policy if exists quotes_staff_read on public.quotes;
drop policy if exists cohort_posts_staff_read on public.cohort_posts;
drop policy if exists token_accounts_staff_read on public.token_accounts;
drop policy if exists token_tx_staff_read on public.token_transactions;
drop policy if exists notifications_staff_read on public.notifications;

-- Intentionally KEPT: ai_settings / cohort_ai_settings / agent_memory staff_all
-- policies, since admin AI configuration + memory curation are explicit admin
-- features that operate on those tables directly (not user PII content).
