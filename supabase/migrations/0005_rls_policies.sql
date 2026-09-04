-- Marken OS · 0005 · Row Level Security
--
-- This is where the three-role model stops being a JavaScript if-statement.
-- Helpers are SECURITY DEFINER so policies don't recurse back through profiles
-- (a policy on profiles that itself queries profiles will recurse).
--
-- Status transitions are NOT granted to employees as UPDATE. They go through the
-- RPCs at the bottom, which validate each move server-side. The old code let the
-- browser write any status it liked.

begin;

-- ── Helpers ──
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $fn$
  select role from public.profiles where id = auth.uid();
$fn$;

create or replace function public.my_domain()
returns text language sql stable security definer set search_path = public as $fn$
  select domain from public.profiles where id = auth.uid();
$fn$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $fn$
  select coalesce(public.my_role() = 'admin', false);
$fn$;

create or replace function public.is_member(p_project bigint)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from public.project_members
     where project_id = p_project and user_id = auth.uid()
  );
$fn$;

-- Admin sees everything · head sees their domain · employee sees their own work.
create or replace function public.can_see_project(p_project bigint)
returns boolean language sql stable security definer set search_path = public as $fn$
  select public.is_admin()
      or public.is_member(p_project)
      or exists (
           select 1 from public.projects p
            where p.id = p_project
              and public.my_role() = 'head'
              and p.domain = public.my_domain()
         );
$fn$;

create or replace function public.can_manage_project(p_project bigint)
returns boolean language sql stable security definer set search_path = public as $fn$
  select public.is_admin()
      or exists (
           select 1 from public.projects p
            where p.id = p_project
              and public.my_role() = 'head'
              and p.domain = public.my_domain()
         );
$fn$;

-- ── Enable RLS everywhere ──
alter table public.profiles        enable row level security;
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.submissions     enable row level security;
alter table public.comments        enable row level security;
alter table public.notifications   enable row level security;
alter table public.attendance      enable row level security;
alter table public.clients         enable row level security;

-- ── profiles ──
-- Readable by all staff: assignee pickers, comment authors and member chips all
-- need names. Nobody may edit their own role or domain — enforced by the trigger
-- below, because RLS cannot restrict individual columns.
create policy profiles_select on public.profiles
  for select to authenticated using (true);

create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin_all on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_admin() then
    new.role      := old.role;
    new.domain    := old.domain;
    new.username  := old.username;
    new.is_active := old.is_active;
  end if;
  return new;
end $fn$;

create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ── clients ──
create policy clients_select on public.clients
  for select to authenticated using (true);
create policy clients_write on public.clients
  for all to authenticated
  using (public.is_admin() or public.my_role() = 'head')
  with check (public.is_admin() or public.my_role() = 'head');

-- ── projects ──
create policy projects_select on public.projects
  for select to authenticated using (public.can_see_project(id));

create policy projects_insert on public.projects
  for insert to authenticated
  with check (
    public.is_admin()
    or (public.my_role() = 'head' and domain = public.my_domain())
  );

create policy projects_update on public.projects
  for update to authenticated
  using (public.can_manage_project(id))
  with check (public.can_manage_project(id));

create policy projects_delete on public.projects
  for delete to authenticated using (public.is_admin());

-- ── project_members ──
create policy project_members_select on public.project_members
  for select to authenticated using (public.can_see_project(project_id));
create policy project_members_write on public.project_members
  for all to authenticated
  using (public.can_manage_project(project_id))
  with check (public.can_manage_project(project_id));

-- ── submissions ── append-only; you may only submit as yourself
create policy submissions_select on public.submissions
  for select to authenticated using (public.can_see_project(project_id));
create policy submissions_insert on public.submissions
  for insert to authenticated
  with check (submitted_by = auth.uid() and public.is_member(project_id));
create policy submissions_admin on public.submissions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── comments ── you may only post as yourself, and never as the system
create policy comments_select on public.comments
  for select to authenticated using (public.can_see_project(project_id));
create policy comments_insert on public.comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and is_system = false
    and public.can_see_project(project_id)
  );
create policy comments_admin on public.comments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── notifications ── read your own, mark your own read. Writes come from RPCs.
create policy notifications_select on public.notifications
  for select to authenticated using (for_user = auth.uid());
create policy notifications_update on public.notifications
  for update to authenticated
  using (for_user = auth.uid()) with check (for_user = auth.uid());
create policy notifications_admin on public.notifications
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── attendance ── own rows; heads see their domain; admin sees all
create policy attendance_select on public.attendance
  for select to authenticated using (
    user_id = auth.uid()
    or public.is_admin()
    or (public.my_role() = 'head'
        and exists (select 1 from public.profiles p
                     where p.id = attendance.user_id
                       and p.domain = public.my_domain()))
  );
create policy attendance_insert on public.attendance
  for insert to authenticated with check (user_id = auth.uid());
create policy attendance_update on public.attendance
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ══════════════════════════════════════════════════════════════
-- Status transitions as RPCs
-- Each validates the move server-side, writes the audit comment, and fans out
-- notifications. Employees never UPDATE projects directly.
-- ══════════════════════════════════════════════════════════════

create or replace function public.start_project(p_project bigint)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_member(p_project) then
    raise exception 'Not a member of this project';
  end if;
  update public.projects set status = 'in_progress'
   where id = p_project and status in ('assigned','changes_requested');
  if not found then raise exception 'Project is not in a startable state'; end if;
  insert into public.comments (project_id, author_id, message)
  values (p_project, auth.uid(), 'Started project');
end $fn$;

create or replace function public.submit_for_review(p_project bigint)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_member(p_project) then
    raise exception 'Not a member of this project';
  end if;
  update public.projects set status = 'in_review'
   where id = p_project and status = 'in_progress';
  if not found then raise exception 'Project must be in progress to submit'; end if;
  insert into public.comments (project_id, author_id, message)
  values (p_project, auth.uid(), 'Submitted for review');
end $fn$;

create or replace function public.approve_project(p_project bigint)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.can_manage_project(p_project) then
    raise exception 'Only a domain head or admin can approve';
  end if;
  -- approved_by / approved_at were never written by the old code
  update public.projects
     set status = 'approved', approved_by = auth.uid(), approved_at = now()
   where id = p_project and status = 'in_review';
  if not found then raise exception 'Project must be in review to approve'; end if;
  insert into public.comments (project_id, author_id, message)
  values (p_project, auth.uid(), 'Project approved');
  insert into public.notifications (for_user, type, message, project_id)
  select m.user_id, 'project_approved', 'Your project was approved', p_project
    from public.project_members m where m.project_id = p_project;
end $fn$;

create or replace function public.request_changes(p_project bigint, p_note text)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.can_manage_project(p_project) then
    raise exception 'Only a domain head or admin can request changes';
  end if;
  update public.projects set status = 'changes_requested'
   where id = p_project and status = 'in_review';
  if not found then raise exception 'Project must be in review'; end if;
  -- A real status plus a real comment, rather than the old string-prefix convention
  insert into public.comments (project_id, author_id, message)
  values (p_project, auth.uid(), coalesce(nullif(trim(p_note), ''), 'Changes requested'));
  insert into public.notifications (for_user, type, message, project_id)
  select m.user_id, 'changes_requested', 'Changes requested on your project', p_project
    from public.project_members m where m.project_id = p_project;
end $fn$;

revoke all on function public.start_project(bigint)         from public;
revoke all on function public.submit_for_review(bigint)     from public;
revoke all on function public.approve_project(bigint)       from public;
revoke all on function public.request_changes(bigint, text) from public;
grant execute on function public.start_project(bigint)         to authenticated;
grant execute on function public.submit_for_review(bigint)     to authenticated;
grant execute on function public.approve_project(bigint)       to authenticated;
grant execute on function public.request_changes(bigint, text) to authenticated;

commit;
