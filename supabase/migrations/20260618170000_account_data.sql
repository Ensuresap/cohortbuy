-- CohortBuy — member data rights: self-serve export + account deletion.
alter table public.profiles add column if not exists deletion_requested_at timestamptz;

-- Export everything we hold about the caller (their own data only).
create or replace function public.export_my_data()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) - 'role' from public.profiles p where p.id = auth.uid()),
    'cohorts', (select coalesce(jsonb_agg(jsonb_build_object(
        'cohort_id', cm.cohort_id, 'status', cm.status, 'access_level', cm.access_level, 'joined', cm.created_at)), '[]'::jsonb)
      from public.cohort_members cm where cm.user_id = auth.uid()),
    'projects', (select coalesce(jsonb_agg(jsonb_build_object(
        'request_id', rp.request_id, 'role', rp.role, 'status', rp.status)), '[]'::jsonb)
      from public.request_participants rp where rp.user_id = auth.uid()),
    'scope_items', (select coalesce(jsonb_agg(to_jsonb(si)), '[]'::jsonb)
      from public.scope_items si where si.user_id = auth.uid()),
    'comments', (select coalesce(jsonb_agg(jsonb_build_object(
        'request_id', c.request_id, 'body', c.body, 'created_at', c.created_at)), '[]'::jsonb)
      from public.request_comments c where c.user_id = auth.uid()),
    'cost_shares', (select coalesce(jsonb_agg(jsonb_build_object(
        'request_id', cs.request_id, 'amount_cents', cs.amount_cents, 'currency', cs.currency, 'paid', cs.paid)), '[]'::jsonb)
      from public.cost_shares cs where cs.user_id = auth.uid()),
    'orders', (select coalesce(jsonb_agg(jsonb_build_object(
        'request_id', o.request_id, 'variant_id', o.variant_id, 'quantity', o.quantity)), '[]'::jsonb)
      from public.group_buy_orders o where o.user_id = auth.uid()),
    'tokens', (select to_jsonb(t) from public.token_accounts t where t.user_id = auth.uid())
  );
$$;
grant execute on function public.export_my_data() to authenticated;

-- Close the account: scrub personal data and mark for deletion. We anonymize
-- rather than hard-delete because the member's records are entangled with other
-- members' shared projects (splits, group orders) — destroying them would corrupt
-- other people's data. Full erasure of the auth record is an ops step.
create or replace function public.request_account_deletion()
returns void language plpgsql security definer set search_path = public as $$
begin
  -- Must hand off any in-flight project they coordinate first.
  if exists (
    select 1 from public.service_requests r
    where r.created_by = auth.uid() and r.status not in ('completed', 'cancelled')
  ) then
    raise exception 'reassign_first';
  end if;

  update public.profiles set
    display_name = 'Deleted member',
    email = null, phone = null, avatar_url = null, handle = null,
    sms_opt_in = false, sms_opt_in_at = null, notification_prefs = '{}'::jsonb,
    deletion_requested_at = now()
  where id = auth.uid();

  -- Remove cohort memberships so they drop out of directories.
  delete from public.cohort_members where user_id = auth.uid();
end; $$;
grant execute on function public.request_account_deletion() to authenticated;
