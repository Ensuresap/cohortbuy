-- CohortBuy — Capability 6: decision policy (coordinator decides vs group vote)
-- + advisory votes + an AI recommendation. Votes are advisory: the coordinator
-- still selects the winner, but can see the tally.

alter table public.service_requests add column if not exists decision_policy text not null default 'coordinator'
  check (decision_policy in ('coordinator', 'vote'));
alter table public.service_requests add column if not exists ai_recommendation text;
alter table public.service_requests add column if not exists ai_recommended_quote_id uuid references public.quotes (id);

-- create_service_request gains p_decision_policy (drop the prior 13-arg form).
drop function if exists public.create_service_request(uuid, text, text, text, text, date, date, text, text, text, boolean, text, integer);
create or replace function public.create_service_request(
  p_cohort uuid, p_title text, p_category text, p_description text,
  p_driver text, p_target date, p_deadline date,
  p_type text, p_service_scope text, p_split text,
  p_locked boolean, p_join_policy text, p_decision_policy text, p_min_size integer
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid; v_base text;
begin
  if not exists (
    select 1 from public.cohort_members
    where cohort_id = p_cohort and user_id = auth.uid() and status = 'approved'
  ) then raise exception 'not_a_member'; end if;
  insert into public.service_requests
    (cohort_id, created_by, title, category, description, driver, target_date, join_deadline,
     project_type, service_scope, split_method, locked, join_policy, decision_policy, min_size)
    values (p_cohort, auth.uid(), p_title, p_category, p_description, p_driver, p_target, p_deadline,
            coalesce(p_type, 'service'), coalesce(p_service_scope, 'service'), coalesce(p_split, 'even'),
            coalesce(p_locked, false), coalesce(p_join_policy, 'auto'), coalesce(p_decision_policy, 'coordinator'),
            coalesce(p_min_size, 2))
    returning id into new_id;
  v_base := left(coalesce(nullif(trim(both '-' from regexp_replace(lower(p_title), '[^a-z0-9]+', '-', 'g')), ''), 'project'), 40);
  update public.service_requests set slug = v_base || '-' || substr(md5(new_id::text), 1, 4) where id = new_id;
  insert into public.request_participants (request_id, user_id, role, status)
    values (new_id, auth.uid(), 'coordinator', 'joined');
  return new_id;
end; $$;

-- One advisory vote per participant per project, pointing at a quote.
create table if not exists public.quote_votes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  quote_id uuid not null references public.quotes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (request_id, user_id)
);
alter table public.quote_votes enable row level security;
create policy quote_votes_select on public.quote_votes for select to authenticated
  using (public.auth_request_cohort(request_id) in (select public.auth_cohort_ids())
         or public.auth_is_cohort_manager(public.auth_request_cohort(request_id)));

-- A joined participant casts (or changes) their vote.
create or replace function public.cast_vote(p_request uuid, p_quote uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.request_participants where request_id = p_request and user_id = auth.uid() and status = 'joined') then
    raise exception 'not_participant';
  end if;
  if not exists (select 1 from public.quotes where id = p_quote and request_id = p_request) then
    raise exception 'bad_quote';
  end if;
  insert into public.quote_votes (request_id, quote_id, user_id)
    values (p_request, p_quote, auth.uid())
    on conflict (request_id, user_id) do update set quote_id = excluded.quote_id, created_at = now();
end; $$;

create or replace function public.clear_vote(p_request uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.quote_votes where request_id = p_request and user_id = auth.uid();
$$;

create or replace function public.my_vote(p_request uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select quote_id from public.quote_votes where request_id = p_request and user_id = auth.uid();
$$;

create or replace function public.vote_tally(p_request uuid)
returns table (quote_id uuid, votes bigint)
language sql stable security definer set search_path = public as $$
  select quote_id, count(*) from public.quote_votes
  where request_id = p_request
    and (public.auth_request_cohort(p_request) in (select public.auth_cohort_ids())
         or public.auth_is_cohort_manager(public.auth_request_cohort(p_request)))
  group by quote_id;
$$;

-- Coordinator/manager records the AI's recommended quote + rationale.
create or replace function public.set_ai_recommendation(p_request uuid, p_quote uuid, p_text text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.service_requests r
    where r.id = p_request and (r.created_by = auth.uid() or public.auth_is_cohort_manager(r.cohort_id))
  ) then raise exception 'not_coordinator'; end if;
  update public.service_requests set ai_recommended_quote_id = p_quote, ai_recommendation = nullif(p_text, '') where id = p_request;
end; $$;
