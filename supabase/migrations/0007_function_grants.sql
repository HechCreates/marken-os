-- Marken OS · 0007 · Lock down function execution
--
-- 0005 revoked EXECUTE on the four transition RPCs but left the helpers on
-- Postgres's default grant, which is EXECUTE to PUBLIC. That meant anon could
-- call them over /rest/v1/rpc/. Most would simply return null for an
-- unauthenticated caller, but close_stale_attendance WRITES — an anonymous
-- request could close attendance sessions.
--
-- RLS policy expressions are evaluated as the querying role, so `authenticated`
-- genuinely needs EXECUTE on the four predicate helpers. anon does not: every
-- policy in 0005 is scoped `to authenticated`.

begin;

-- Pure string helper — pin the search_path so it cannot be shadowed.
create or replace function public.username_to_email(p_username text)
returns text language sql immutable security invoker set search_path = pg_catalog as $fn$
  select lower(trim(p_username)) || '@markenos.internal';
$fn$;

-- ── Predicate helpers: authenticated only ──
revoke all on function public.my_role()                      from public, anon;
revoke all on function public.my_domain()                    from public, anon;
revoke all on function public.is_admin()                     from public, anon;
revoke all on function public.is_member(bigint)              from public, anon;
revoke all on function public.can_see_project(bigint)        from public, anon;
revoke all on function public.can_manage_project(bigint)     from public, anon;

grant execute on function public.my_role()                   to authenticated;
grant execute on function public.my_domain()                 to authenticated;
grant execute on function public.is_admin()                  to authenticated;
grant execute on function public.is_member(bigint)           to authenticated;
grant execute on function public.can_see_project(bigint)     to authenticated;
grant execute on function public.can_manage_project(bigint)  to authenticated;

-- ── Transition RPCs: close the anon hole 0005 left open ──
revoke all on function public.start_project(bigint)          from anon;
revoke all on function public.submit_for_review(bigint)      from anon;
revoke all on function public.approve_project(bigint)        from anon;
revoke all on function public.request_changes(bigint, text)  from anon;

-- ── Trigger functions are invoked by the trigger, never by a caller ──
revoke all on function public.handle_new_user()              from public, anon, authenticated;
revoke all on function public.guard_profile_privileges()     from public, anon, authenticated;

-- ── Maintenance: service_role / scheduled job only, never a client ──
revoke all on function public.close_stale_attendance()       from public, anon, authenticated;

commit;
