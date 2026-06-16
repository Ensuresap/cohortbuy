-- CohortBuy — Storage bucket for cohort media (post images, logos).

insert into storage.buckets (id, name, public)
  values ('cohort-media', 'cohort-media', true)
  on conflict (id) do nothing;

-- Public read (bucket is public; images shown via public URL).
drop policy if exists "cohort_media_read" on storage.objects;
create policy "cohort_media_read" on storage.objects
  for select to public
  using (bucket_id = 'cohort-media');

-- Any authenticated user may upload to this bucket.
drop policy if exists "cohort_media_upload" on storage.objects;
create policy "cohort_media_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cohort-media');

-- Uploaders manage their own objects.
drop policy if exists "cohort_media_update" on storage.objects;
create policy "cohort_media_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'cohort-media' and owner = auth.uid());

drop policy if exists "cohort_media_delete" on storage.objects;
create policy "cohort_media_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'cohort-media' and owner = auth.uid());
