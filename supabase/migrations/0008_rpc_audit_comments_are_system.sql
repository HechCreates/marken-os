-- Marken OS · 0008 · Transition RPCs mark their audit comments as system
--
-- The four RPCs from 0005 inserted their audit lines without is_system, so it
-- defaulted to false. "Started project" and "Project approved" then rendered as
-- ordinary conversation instead of the quiet audit entries the project detail
-- page styles them as.
--
-- request_changes is deliberately unchanged: the reviewer's note IS
-- conversation, and correctly stays is_system = false.

begin;

create or replace function public.start_project(p_project bigint)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_member(p_project) then
    raise exception 'Not a member of this project';
  end if;
  update public.projects set status = 'in_progress'
   where id = p_project and status in ('assigned','changes_requested');
  if not found then raise exception 'Project is not in a startable state'; end if;
  insert into public.comments (project_id, author_id, message, is_system)
  values (p_project, auth.uid(), 'Started project', true);
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
  insert into public.comments (project_id, author_id, message, is_system)
  values (p_project, auth.uid(), 'Submitted for review', true);
end $fn$;

create or replace function public.approve_project(p_project bigint)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.can_manage_project(p_project) then
    raise exception 'Only a domain head or admin can approve';
  end if;
  update public.projects
     set status = 'approved', approved_by = auth.uid(), approved_at = now()
   where id = p_project and status = 'in_review';
  if not found then raise exception 'Project must be in review to approve'; end if;
  insert into public.comments (project_id, author_id, message, is_system)
  values (p_project, auth.uid(), 'Project approved', true);
  insert into public.notifications (for_user, type, message, project_id)
  select m.user_id, 'project_approved', 'Your project was approved', p_project
    from public.project_members m where m.project_id = p_project;
end $fn$;

-- CREATE OR REPLACE keeps existing grants, so 0007's revokes still stand.

-- Backfill the audit lines already written with the wrong flag. Matched on the
-- exact strings the RPCs emit, so someone who happened to type the same words
-- keeps their comment as conversation.
update public.comments
   set is_system = true
 where is_system = false
   and message in ('Started project', 'Submitted for review', 'Project approved');

commit;
