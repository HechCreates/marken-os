-- Marken OS · 0010 · Honest auto-close for abandoned attendance sessions
--
-- Two problems with the 0004 version.
--
-- 1. It set clock_out to 23:59:59 of the session's day. Someone who clocked in
--    at 09:00 and closed their laptop was credited with ~15 hours. Missing data
--    became wrong data, which is worse — the old build at least under-reported
--    visibly.
--
-- 2. Nothing ever called it, so sessions accumulated indefinitely. Sign-out was
--    the only writer of clock_out and it was unreachable from the UI.
--
-- The fix caps an abandoned session at a plausible working day, and marks it so
-- an estimate is never mistaken for a real sign-out.

begin;

alter table public.attendance
  add column if not exists auto_closed boolean not null default false;

comment on column public.attendance.auto_closed is
  'True when close_stale_attendance() ended this session rather than the person signing out. The clock_out is a capped estimate, not a recorded time.';

/**
 * Closes sessions left open past their day.
 *
 * clock_out becomes the EARLIER of clock_in + p_max_hours and the end of that
 * day — so a normal forgotten sign-out records a plausible shift, and a session
 * started at 23:00 cannot spill past midnight into the next day's figures.
 *
 * Returns the number of rows closed.
 */
create or replace function public.close_stale_attendance(p_max_hours integer default 9)
returns integer language plpgsql security definer set search_path = public as $fn$
declare n integer;
begin
  with closed as (
    update public.attendance a
       set clock_out = least(
             a.clock_in + make_interval(hours => p_max_hours),
             ((a.date + 1) at time zone 'UTC') - interval '1 second'
           ),
           auto_closed = true
     where a.clock_out is null
       and a.date < current_date
    returning 1
  )
  select count(*) into n from closed;
  return n;
end $fn$;

-- Same posture as 0007: never reachable from a browser.
revoke all on function public.close_stale_attendance(integer) from public, anon, authenticated;

-- The old zero-argument signature is replaced by the defaulted one above.
drop function if exists public.close_stale_attendance();

commit;
