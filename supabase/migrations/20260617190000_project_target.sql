-- CohortBuy — projects gain a target date (aspirational "done by"), shown in the
-- project hero alongside the start date. create_service_request takes p_target.

alter table public.service_requests add column if not exists target_date date;

drop function if exists public.create_service_request(uuid, text, text, text, text, integer);
create or replace function public.create_service_request(
  p_cohort uuid, p_title text, p_category text, p_description text,
  p_driver text, p_target date, p_min_size integer
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if not exists (
    select 1 from public.cohort_members
    where cohort_id = p_cohort and user_id = auth.uid() and status = 'approved'
  ) then
    raise exception 'not_a_member';
  end if;
  insert into public.service_requests (cohort_id, created_by, title, category, description, driver, target_date, min_size)
    values (p_cohort, auth.uid(), p_title, p_category, p_description, p_driver, p_target, coalesce(p_min_size, 2))
    returning id into new_id;
  insert into public.request_participants (request_id, user_id, role, status)
    values (new_id, auth.uid(), 'coordinator', 'joined');
  return new_id;
end; $$;
