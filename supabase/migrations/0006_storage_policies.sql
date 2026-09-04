-- Marken OS · 0006 · Storage access follows project membership
--
-- Requires 0002 (buckets made private) and 0005 (helper functions).
--
-- Path convention, unchanged from the current app:
--   submissions/{project_id}/...            → project files and briefs
--   avatars/{user_id}/avatar.{ext}          → note: keyed by UUID now, not username
--
-- The project id is the first path segment, which is what these policies key on.
-- Storage RLS therefore inherits the project visibility rules automatically:
-- if you cannot see the project, you cannot fetch its files, and signed URLs
-- can only be minted for objects you already pass a policy on.

begin;

-- ── Drop the pre-existing anon policies ──
-- These were granted TO anon with no check beyond bucket_id, so making the
-- buckets private in 0003 was not sufficient on its own: anyone holding the
-- publishable key could still read every submission through them.
drop policy if exists avatars_select             on storage.objects;
drop policy if exists avatars_insert             on storage.objects;
drop policy if exists avatars_update             on storage.objects;
drop policy if exists submissions_storage_select on storage.objects;
drop policy if exists submissions_storage_insert on storage.objects;

create policy submissions_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'submissions'
    and public.can_see_project(((storage.foldername(name))[1])::bigint)
  );

create policy submissions_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and public.can_see_project(((storage.foldername(name))[1])::bigint)
  );

create policy submissions_admin_manage on storage.objects
  for all to authenticated
  using (bucket_id = 'submissions' and public.is_admin())
  with check (bucket_id = 'submissions' and public.is_admin());

-- Avatars stay readable across the team so member chips and comment threads
-- render, but you may only write into your own folder.
create policy avatars_read on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars');

create policy avatars_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
