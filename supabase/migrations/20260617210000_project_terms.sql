-- CohortBuy — Addendum D: contract structure + payment mode as two independent,
-- coordinator-set flags (set after vendor selection). Negotiation stays collective;
-- only the back half (contract assembly + settlement) branches on these.
--   contract_structure: 'individual' (per-member contracts) | 'combined' (one group contract)
--   payment_mode:       'individual_direct' (each pays the vendor; off-platform)
--                       | 'pooled_escrow' (platform-held; DEFERRED — not yet enabled)
-- Launch posture: lead no-money (individual_direct); escrow is a later opt-in.

alter table public.service_requests
  add column if not exists contract_structure text not null default 'individual'
  check (contract_structure in ('combined', 'individual'));

alter table public.service_requests
  add column if not exists payment_mode text not null default 'individual_direct'
  check (payment_mode in ('pooled_escrow', 'individual_direct'));

-- Coordinator (creator) or cohort manager sets the two flags. RLS on
-- service_requests already restricts updates to creator/manager, so a guarded
-- SECURITY DEFINER wrapper keeps the check in one place and validates values.
create or replace function public.set_project_terms(
  p_request uuid, p_structure text, p_payment text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_structure not in ('combined', 'individual') then raise exception 'bad_structure'; end if;
  if p_payment not in ('pooled_escrow', 'individual_direct') then raise exception 'bad_payment'; end if;
  if not exists (
    select 1 from public.service_requests r
    where r.id = p_request
      and (r.created_by = auth.uid() or public.auth_is_cohort_manager(r.cohort_id))
  ) then
    raise exception 'not_coordinator';
  end if;
  update public.service_requests
     set contract_structure = p_structure, payment_mode = p_payment, last_activity_at = now()
   where id = p_request;
end; $$;
