-- CohortBuy — allow editing a post (author or cohort manager). Delete policy already exists.

drop policy if exists cohort_posts_update on public.cohort_posts;
create policy cohort_posts_update on public.cohort_posts for update to authenticated
  using (author_id = auth.uid() or public.auth_is_cohort_manager(cohort_id))
  with check (author_id = auth.uid() or public.auth_is_cohort_manager(cohort_id));
