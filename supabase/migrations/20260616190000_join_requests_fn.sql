-- CohortBuy — join requests with requester identity (managers only).

create or replace function public.cohort_join_requests(p_cohort uuid)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  note text,
  created_at timestamptz
) language sql stable security definer set search_path = public as $$
  select m.user_id, p.display_name, p.avatar_url, m.note, m.created_at
  from public.cohort_members m
  join public.profiles p on p.id = m.user_id
  where m.cohort_id = p_cohort
    and m.status = 'requested'
    and public.auth_is_cohort_manager(p_cohort)   -- only managers get rows
  order by m.created_at asc;
$$;
