-- CohortBuy — token economy gates.
--  • Creating a cohort requires a minimum lifetime_earned (anti-spam; staff exempt).
--  • A cohort's runner earns `run_cohort` (+100) once — when it lands a completed
--    project AND has enough approved members (so it can't be farmed by spinning
--    up empty cohorts).
-- Thresholds mirror MIN_LIFETIME_TO_CREATE_COHORT / RUN_COHORT_MIN_MEMBERS in
-- src/core/tokens/domain/tokens.ts.

alter table public.cohorts add column if not exists run_rewarded boolean not null default false;

-- Create cohort — now gated on lifetime tokens earned.
create or replace function public.create_cohort(
  p_name text, p_handle text, p_description text,
  p_visibility text, p_country text, p_kind text, p_tags text[],
  p_coverage_zips text[] default '{}', p_city text default null, p_region text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if not public.is_platform_staff()
     and coalesce((select lifetime_earned from public.token_accounts where user_id = auth.uid()), 0) < 25 then
    raise exception 'need_tokens';
  end if;

  insert into public.cohorts
      (name, handle, description, visibility, country, kind, tags,
       coverage_zips, city, region, created_by)
    values (p_name, lower(p_handle), p_description,
            coalesce(p_visibility, 'public'), coalesce(p_country, 'US'),
            coalesce(p_kind, 'service'), coalesce(p_tags, '{}'),
            coalesce(p_coverage_zips, '{}'), p_city, p_region, auth.uid())
    returning id into new_id;
  insert into public.cohort_members (cohort_id, user_id, access_level, status)
    values (new_id, auth.uid(), 'manager', 'approved');
  return new_id;
end; $$;

-- Project completion — award participants (+50 each) and, on the first qualifying
-- completion, the cohort runner (+100) if the cohort has >= 5 approved members.
create or replace function public.complete_project(p_request uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare v_already boolean; r record; v_cohort uuid; v_creator uuid; v_rewarded boolean; v_members int;
begin
  if not exists (select 1 from public.service_requests where id = p_request and created_by = auth.uid()) then
    raise exception 'not_coordinator';
  end if;
  select status = 'completed' into v_already from public.service_requests where id = p_request;

  update public.service_requests
    set status = 'completed', completion_note = nullif(p_note, ''),
        completed_at = now(), last_activity_at = now()
    where id = p_request;

  if not coalesce(v_already, false) then
    for r in select user_id from public.request_participants where request_id = p_request and status = 'joined' loop
      perform public.award_event(r.user_id, 'complete_project');
    end loop;

    -- Reward the cohort's runner once the cohort is real (completed work + members).
    select c.id, c.created_by, c.run_rewarded into v_cohort, v_creator, v_rewarded
      from public.cohorts c
      join public.service_requests sr on sr.cohort_id = c.id
      where sr.id = p_request;
    select count(*) into v_members from public.cohort_members
      where cohort_id = v_cohort and status = 'approved';

    if not v_rewarded and v_members >= 5 then
      perform public.award_event(v_creator, 'run_cohort');
      update public.cohorts set run_rewarded = true where id = v_cohort;
    end if;
  end if;
end; $$;
