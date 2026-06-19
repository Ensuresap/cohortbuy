-- CohortBuy — Capability 5: an AI-drafted, coordinator-editable RFQ the group
-- sends to shortlisted vendors (off-platform). Stored on the project.
alter table public.service_requests add column if not exists rfq_draft text;

create or replace function public.set_rfq_draft(p_request uuid, p_text text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.service_requests r
    where r.id = p_request and (r.created_by = auth.uid() or public.auth_is_cohort_manager(r.cohort_id))
  ) then raise exception 'not_coordinator'; end if;
  update public.service_requests set rfq_draft = nullif(p_text, ''), last_activity_at = now() where id = p_request;
end; $$;
