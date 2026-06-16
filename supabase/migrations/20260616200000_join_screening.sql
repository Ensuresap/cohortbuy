-- CohortBuy — join screening: admin questions, requestor answers, ask-info loop.

alter table public.cohorts add column if not exists join_questions jsonb not null default '[]'::jsonb;
alter table public.cohort_members add column if not exists answers jsonb;
alter table public.cohort_members add column if not exists info_request text;   -- admin's "please clarify" message
alter table public.cohort_members add column if not exists info_response text;  -- requestor's reply

-- Request to join with screening answers (re-request allowed after reject/needs_info).
create or replace function public.request_join(p_cohort uuid, p_answers jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.cohort_members (cohort_id, user_id, access_level, status, answers)
    values (p_cohort, auth.uid(), 'member', 'requested', p_answers)
  on conflict (cohort_id, user_id) do update
    set status = 'requested', answers = excluded.answers,
        info_request = null, info_response = null, updated_at = now()
    where public.cohort_members.status in ('rejected', 'needs_info', 'requested');
end; $$;

-- Requestor responds to a "needs more info" request.
create or replace function public.respond_join_info(p_cohort uuid, p_response text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.cohort_members
    set info_response = p_response, status = 'requested', updated_at = now()
    where cohort_id = p_cohort and user_id = auth.uid() and status = 'needs_info';
end; $$;

-- Manager decision (approve / reject / needs_info with a message).
create or replace function public.review_join(p_cohort uuid, p_user uuid, p_decision text, p_message text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.auth_is_cohort_manager(p_cohort) then
    raise exception 'forbidden';
  end if;
  update public.cohort_members
    set status = case p_decision
                   when 'approve' then 'approved'
                   when 'reject' then 'rejected'
                   else 'needs_info' end,
        info_request = case when p_decision = 'needs_info' then p_message else info_request end,
        updated_at = now()
    where cohort_id = p_cohort and user_id = p_user;
end; $$;

-- Pending requests with requester identity + screening answers (managers only).
create or replace function public.cohort_join_requests(p_cohort uuid)
returns table (
  user_id uuid, display_name text, avatar_url text,
  answers jsonb, info_response text, created_at timestamptz
) language sql stable security definer set search_path = public as $$
  select m.user_id, p.display_name, p.avatar_url, m.answers, m.info_response, m.created_at
  from public.cohort_members m
  join public.profiles p on p.id = m.user_id
  where m.cohort_id = p_cohort and m.status = 'requested'
    and public.auth_is_cohort_manager(p_cohort)
  order by m.created_at asc;
$$;
