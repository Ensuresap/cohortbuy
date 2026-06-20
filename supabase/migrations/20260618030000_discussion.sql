-- CohortBuy — stage-scoped discussion + AI replies. Comments carry the stage they
-- were posted under, and a kind ('member' | 'ai').
alter table public.request_comments add column if not exists stage text;
alter table public.request_comments add column if not exists kind text not null default 'member'
  check (kind in ('member', 'ai'));

drop function if exists public.request_comments_feed(uuid);
create or replace function public.request_comments_feed(p_request uuid)
returns table (id uuid, body text, created_at timestamptz, user_id uuid, author_name text, author_avatar text, stage text, kind text)
language sql stable security definer set search_path = public as $$
  select c.id, c.body, c.created_at, c.user_id, p.display_name, p.avatar_url, c.stage, c.kind
  from public.request_comments c
  join public.profiles p on p.id = c.user_id
  where c.request_id = p_request
    and public.auth_request_cohort(p_request) in (
      select cohort_id from public.cohort_members where user_id = auth.uid() and status = 'approved'
    )
  order by c.created_at asc
  limit 300;
$$;
