-- CohortBuy — make tokens actually earn. Awards are embedded inside the existing
-- gated SECURITY DEFINER RPCs (join approval, project completion) so they can't be
-- farmed by calling a token function directly. Amounts mirror EARN_RULES in
-- src/core/tokens/domain/tokens.ts — keep them in sync.

-- Private award helper: NOT callable by clients (revoked), only by the trusted
-- RPCs below. Runs as owner so it can write the ledger past RLS.
create or replace function public.award_event(p_user uuid, p_event text)
returns void language plpgsql security definer set search_path = public as $$
declare amt int;
begin
  amt := case p_event
    when 'join_cohort' then 10
    when 'complete_project' then 50
    when 'refer_neighbor' then 25
    when 'run_cohort' then 100
    when 'leave_rating' then 5
    else 0 end;
  if amt = 0 or p_user is null then return; end if;
  perform public.apply_token_tx(p_user, amt, 'earn', p_event, 'system');
end; $$;
revoke all on function public.award_event(uuid, text) from public;

-- Referral attribution: who invited this member.
alter table public.cohort_members add column if not exists invited_by uuid references public.profiles (id) on delete set null;

-- Request to join — now also records who referred them (kept from the first request).
drop function if exists public.request_join(uuid, jsonb);
create or replace function public.request_join(p_cohort uuid, p_answers jsonb, p_invited_by uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.cohort_members (cohort_id, user_id, access_level, status, answers, invited_by)
    values (p_cohort, auth.uid(), 'member', 'requested', p_answers,
            case when p_invited_by = auth.uid() then null else p_invited_by end)
  on conflict (cohort_id, user_id) do update
    set status = 'requested', answers = excluded.answers,
        invited_by = coalesce(public.cohort_members.invited_by, excluded.invited_by),
        info_request = null, info_response = null, updated_at = now()
    where public.cohort_members.status in ('rejected', 'needs_info', 'requested');
end; $$;

-- Manager decision — on first approval, award the new member (join_cohort) and,
-- if they were referred, the inviter (refer_neighbor).
create or replace function public.review_join(p_cohort uuid, p_user uuid, p_decision text, p_message text)
returns void language plpgsql security definer set search_path = public as $$
declare v_old text; v_inviter uuid;
begin
  if not public.auth_is_cohort_manager(p_cohort) then
    raise exception 'forbidden';
  end if;
  select status, invited_by into v_old, v_inviter
    from public.cohort_members where cohort_id = p_cohort and user_id = p_user;

  update public.cohort_members
    set status = case p_decision
                   when 'approve' then 'approved'
                   when 'reject' then 'rejected'
                   else 'needs_info' end,
        info_request = case when p_decision = 'needs_info' then p_message else info_request end,
        updated_at = now()
    where cohort_id = p_cohort and user_id = p_user;

  if p_decision = 'approve' and v_old is distinct from 'approved' then
    perform public.award_event(p_user, 'join_cohort');
    if v_inviter is not null and v_inviter <> p_user then
      perform public.award_event(v_inviter, 'refer_neighbor');
    end if;
  end if;
end; $$;

-- Project completion — award each joined participant once.
create or replace function public.complete_project(p_request uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare v_already boolean; r record;
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
  end if;
end; $$;
