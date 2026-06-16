-- CohortBuy — richer project: driver/rationale + a discussion thread.

alter table public.service_requests add column if not exists driver text;

-- create_service_request gains a p_driver param (drop old signature first).
drop function if exists public.create_service_request(uuid, text, text, text, integer);
create or replace function public.create_service_request(
  p_cohort uuid, p_title text, p_category text, p_description text, p_driver text, p_min_size integer
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if not exists (
    select 1 from public.cohort_members
    where cohort_id = p_cohort and user_id = auth.uid() and status = 'approved'
  ) then
    raise exception 'not_a_member';
  end if;
  insert into public.service_requests (cohort_id, created_by, title, category, description, driver, min_size)
    values (p_cohort, auth.uid(), p_title, p_category, p_description, p_driver, coalesce(p_min_size, 2))
    returning id into new_id;
  insert into public.request_participants (request_id, user_id, role, status)
    values (new_id, auth.uid(), 'coordinator', 'joined');
  return new_id;
end; $$;

-- Project discussion / correspondence.
create table if not exists public.request_comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists request_comments_idx on public.request_comments (request_id, created_at);

alter table public.request_comments enable row level security;
create policy request_comments_select on public.request_comments for select to authenticated
  using (public.auth_request_cohort(request_id) in (select public.auth_cohort_ids())
         or public.auth_is_cohort_manager(public.auth_request_cohort(request_id)));
create policy request_comments_insert on public.request_comments for insert to authenticated
  with check (user_id = auth.uid()
              and public.auth_request_cohort(request_id) in (select public.auth_cohort_ids()));

-- Thread with author identity (members of the request's cohort only).
create or replace function public.request_comments_feed(p_request uuid)
returns table (id uuid, body text, created_at timestamptz, user_id uuid, author_name text, author_avatar text)
language sql stable security definer set search_path = public as $$
  select c.id, c.body, c.created_at, c.user_id, p.display_name, p.avatar_url
  from public.request_comments c
  join public.profiles p on p.id = c.user_id
  where c.request_id = p_request
    and public.auth_request_cohort(p_request) in (
      select cohort_id from public.cohort_members
      where user_id = auth.uid() and status = 'approved'
    )
  order by c.created_at asc
  limit 200;
$$;
