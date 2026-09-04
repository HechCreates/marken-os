-- Marken OS · 0002 · Close the public buckets
--
-- Both buckets are currently public with no size cap, so every client brief and
-- deliverable is readable by anyone holding the URL, and paths are guessable
-- ({project_id}/{username}/v1_{filename}).
--
-- WARNING: this breaks file downloads in the live Framer app immediately, because
-- getPublicUrl() stops resolving. Run it when you are ready to cut over, or accept
-- that file links on markeninternaltool.framer.website go dark from this point.
-- The rebuilt app uses createSignedUrl() instead.

begin;

update storage.buckets
   set public = false,
       file_size_limit = 52428800  -- 50 MB
 where id = 'submissions';

update storage.buckets
   set public = false,
       file_size_limit = 5242880   -- 5 MB
 where id = 'avatars';

commit;
