-- CohortBuy — Addendum E (Phase 1): the project profile. Setup now captures the
-- shape that will later parameterize a configurable lifecycle. These fields are
-- set at setup because earlier stages depend on them; contract structure + payment
-- mode (Addendum D) stay deferred to after vendor selection.
--   project_type:  'service' (RFQ to vendors) | 'group_buy' (volume product order)
--   service_scope: 'service' | 'equipment' | 'both'
--   split_method:  'even' | 'by_quantity' | 'by_usage' | 'custom'
-- join_deadline + min_size already exist on the table; now captured at setup.

alter table public.service_requests
  add column if not exists project_type text not null default 'service'
  check (project_type in ('service', 'group_buy'));

alter table public.service_requests
  add column if not exists service_scope text not null default 'service'
  check (service_scope in ('service', 'equipment', 'both'));

alter table public.service_requests
  add column if not exists split_method text not null default 'even'
  check (split_method in ('even', 'by_quantity', 'by_usage', 'custom'));

-- Extend create_service_request with the profile fields (drop the prior 8-arg form).
drop function if exists public.create_service_request(uuid, text, text, text, text, date, boolean, integer);
create or replace function public.create_service_request(
  p_cohort uuid, p_title text, p_category text, p_description text,
  p_driver text, p_target date, p_deadline date,
  p_type text, p_service_scope text, p_split text,
  p_locked boolean, p_min_size integer
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if not exists (
    select 1 from public.cohort_members
    where cohort_id = p_cohort and user_id = auth.uid() and status = 'approved'
  ) then
    raise exception 'not_a_member';
  end if;
  insert into public.service_requests
    (cohort_id, created_by, title, category, description, driver, target_date, join_deadline,
     project_type, service_scope, split_method, locked, min_size)
    values (p_cohort, auth.uid(), p_title, p_category, p_description, p_driver, p_target, p_deadline,
            coalesce(p_type, 'service'), coalesce(p_service_scope, 'service'), coalesce(p_split, 'even'),
            coalesce(p_locked, false), coalesce(p_min_size, 2))
    returning id into new_id;
  insert into public.request_participants (request_id, user_id, role, status)
    values (new_id, auth.uid(), 'coordinator', 'joined');
  return new_id;
end; $$;
