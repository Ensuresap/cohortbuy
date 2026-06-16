-- CohortBuy — cohort posts (admin/co-admin feed, LinkedIn-style).

create table if not exists public.cohort_posts (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  author_id uuid references public.profiles (id),
  body text not null,
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists cohort_posts_cohort_idx on public.cohort_posts (cohort_id, created_at desc);

alter table public.cohort_posts enable row level security;

-- Read: members/managers, or anyone if the cohort is public.
create policy cohort_posts_select on public.cohort_posts for select to authenticated
  using (
    public.auth_is_cohort_manager(cohort_id)
    or cohort_id in (select public.auth_cohort_ids())
    or exists (select 1 from public.cohorts c where c.id = cohort_id and c.visibility = 'public')
  );
-- Write: only managers (admins / co-admins), authoring as themselves.
create policy cohort_posts_insert on public.cohort_posts for insert to authenticated
  with check (author_id = auth.uid() and public.auth_is_cohort_manager(cohort_id));
create policy cohort_posts_delete on public.cohort_posts for delete to authenticated
  using (author_id = auth.uid() or public.auth_is_cohort_manager(cohort_id));

-- Feed with author identity (SECURITY DEFINER so viewers see author names).
create or replace function public.cohort_posts_feed(p_cohort uuid)
returns table (
  id uuid, body text, image_url text, created_at timestamptz,
  author_id uuid, author_name text, author_avatar text
) language sql stable security definer set search_path = public as $$
  select po.id, po.body, po.image_url, po.created_at,
         po.author_id, p.display_name, p.avatar_url
  from public.cohort_posts po
  join public.profiles p on p.id = po.author_id
  where po.cohort_id = p_cohort
    and (
      exists (select 1 from public.cohorts c where c.id = p_cohort and c.visibility = 'public')
      or exists (
        select 1 from public.cohort_members me
        where me.cohort_id = p_cohort and me.user_id = auth.uid() and me.status = 'approved'
      )
    )
  order by po.created_at desc
  limit 50;
$$;
