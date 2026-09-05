-- Marken OS · 0011 · Run the attendance close nightly
--
-- Separate from 0010 because it needs pg_cron, which some environments won't
-- have. 0010 stands alone; if this one can't run, the function still works when
-- called by hand.
--
-- On Supabase, pg_cron may need enabling first via Database → Extensions.

begin;

create extension if not exists pg_cron;

-- Unschedule first so re-running this migration doesn't stack duplicate jobs.
do $do$
begin
  perform cron.unschedule('close-stale-attendance');
exception when others then
  null; -- no such job yet, which is the normal first run
end $do$;

-- 00:20 UTC daily. After midnight so `date < current_date` has become true for
-- the day just ended, with enough margin that a late sign-out still wins.
select cron.schedule(
  'close-stale-attendance',
  '20 0 * * *',
  $job$ select public.close_stale_attendance(); $job$
);

commit;
