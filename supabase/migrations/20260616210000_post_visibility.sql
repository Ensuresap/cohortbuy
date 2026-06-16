-- CohortBuy — per-post visibility (members-only by default; admins can make public).

alter table public.cohort_posts add column if not exists visibility text not null default 'members'
  check (visibility in ('members', 'public'));

-- Tighten direct reads: non-members only see public posts of a public cohort.
drop policy if exists cohort_posts_select on public.cohort_posts;
create policy cohort_posts_select on public.cohort_posts for select to authenticated
  using (
    public.auth_is_cohort_manager(cohort_id)
    or cohort_id in (select public.auth_cohort_ids())
    or (visibility = 'public'
        and exists (select 1 from public.cohorts c where c.id = cohort_id and c.visibility = 'public'))
  );

-- Feed: members see all posts; non-members (public cohort) see only public posts.
drop function if exists public.cohort_posts_feed(uuid);
create or replace function public.cohort_posts_feed(p_cohort uuid)
returns table (
  id uuid, body text, image_url text, visibility text, created_at timestamptz,
  author_id uuid, author_name text, author_avatar text
) language sql stable security definer set search_path = public as $$
  select po.id, po.body, po.image_url, po.visibility, po.created_at,
         po.author_id, p.display_name, p.avatar_url
  from public.cohort_posts po
  join public.profiles p on p.id = po.author_id
  where po.cohort_id = p_cohort
    and (
      exists (select 1 from public.cohort_members me
              where me.cohort_id = p_cohort and me.user_id = auth.uid() and me.status = 'approved')
      or (po.visibility = 'public'
          and exists (select 1 from public.cohorts c where c.id = p_cohort and c.visibility = 'public'))
    )
  order by po.created_at desc
  limit 50;
$$;

-- Change a post's visibility (author or cohort manager).
create or replace function public.set_post_visibility(p_post uuid, p_visibility text)
returns void language plpgsql security definer set search_path = public as $$
declare v_cohort uuid;
begin
  if p_visibility not in ('members', 'public') then raise exception 'invalid'; end if;
  select cohort_id into v_cohort from public.cohort_posts where id = p_post;
  if not (public.auth_is_cohort_manager(v_cohort)
          or exists (select 1 from public.cohort_posts where id = p_post and author_id = auth.uid())) then
    raise exception 'forbidden';
  end if;
  update public.cohort_posts set visibility = p_visibility where id = p_post;
end; $$;
