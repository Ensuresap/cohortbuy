-- CohortBuy — cohort cover image + leave-cohort.

alter table public.cohorts add column if not exists cover_url text;

-- A member leaves a cohort (owner must transfer first — blocked here).
create or replace function public.leave_cohort(p_cohort uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.cohorts where id = p_cohort and created_by = auth.uid()) then
    raise exception 'owner_cannot_leave';
  end if;
  delete from public.cohort_members where cohort_id = p_cohort and user_id = auth.uid();
end; $$;
