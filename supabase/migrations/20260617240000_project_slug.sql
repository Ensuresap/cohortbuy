-- CohortBuy — human-friendly project slug for share/invite links.
-- The invite link becomes /invite/<slug> (e.g. backyard-fence-replacement-a1b2)
-- instead of a UUID. Internal routes (/requests/<uuid>) keep the UUID.

alter table public.service_requests add column if not exists slug text;

-- Backfill existing rows: slugified title + short deterministic suffix from the id.
update public.service_requests
   set slug = left(coalesce(nullif(trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')), ''), 'project'), 40)
              || '-' || substr(md5(id::text), 1, 4)
 where slug is null;

create unique index if not exists service_requests_slug_idx on public.service_requests (slug);

-- create_service_request now also sets a slug (drop the prior 12-arg signature).
drop function if exists public.create_service_request(uuid, text, text, text, text, date, date, text, text, text, boolean, integer);
create or replace function public.create_service_request(
  p_cohort uuid, p_title text, p_category text, p_description text,
  p_driver text, p_target date, p_deadline date,
  p_type text, p_service_scope text, p_split text,
  p_locked boolean, p_min_size integer
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid; v_base text;
begin
  if not exists (
    select 1 from public.cohort_members
    where cohort_id = p_cohort and user_id = auth.uid() and status = 'approved'
  ) then
    raise exception 'not_a_member';
  end if;
  insert into public.service_requests
    (cohort_id, created_by, title, category, description, driver, target_date, join_deadline,
     project_type, service_scope, split_method, locked, min_size)
    values (p_cohort, auth.uid(), p_title, p_category, p_description, p_driver, p_target, p_deadline,
            coalesce(p_type, 'service'), coalesce(p_service_scope, 'service'), coalesce(p_split, 'even'),
            coalesce(p_locked, false), coalesce(p_min_size, 2))
    returning id into new_id;

  v_base := left(coalesce(nullif(trim(both '-' from regexp_replace(lower(p_title), '[^a-z0-9]+', '-', 'g')), ''), 'project'), 40);
  update public.service_requests set slug = v_base || '-' || substr(md5(new_id::text), 1, 4) where id = new_id;

  insert into public.request_participants (request_id, user_id, role, status)
    values (new_id, auth.uid(), 'coordinator', 'joined');
  return new_id;
end; $$;

-- Teaser by slug (the invite landing looks projects up by slug, not UUID).
create or replace function public.project_teaser_by_slug(p_slug text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', r.id,
    'slug', r.slug,
    'title', r.title,
    'category', r.category,
    'description', r.description,
    'status', r.status,
    'locked', r.locked,
    'join_deadline', r.join_deadline,
    'min_size', r.min_size,
    'project_type', r.project_type,
    'cohort_id', c.id,
    'cohort_handle', c.handle,
    'cohort_name', c.name,
    'cohort_visibility', c.visibility,
    'coordinator_name', p.display_name,
    'participants', (
      select count(*) from public.request_participants rp
      where rp.request_id = r.id and rp.status = 'joined'
    )
  )
  from public.service_requests r
  join public.cohorts c on c.id = r.cohort_id
  left join public.profiles p on p.id = r.created_by
  where r.slug = p_slug;
$$;

grant execute on function public.project_teaser_by_slug(text) to anon, authenticated;
