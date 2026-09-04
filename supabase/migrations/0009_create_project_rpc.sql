-- Marken OS · 0009 · create_project RPC
--
-- Creating a project touches three tables: projects, project_members and
-- notifications. A head can insert into the first two under RLS but NOT into
-- notifications — 0005 grants inserts there to admins only, because everything
-- else that writes them is a SECURITY DEFINER RPC.
--
-- Rather than widen that policy (which would let any signed-in user forge a
-- notification to anyone), creation goes through one function that validates
-- the caller, writes all three atomically, and returns the new id.

begin;

create or replace function public.create_project(
  p_title      text,
  p_client_id  bigint,
  p_domain     text,
  p_brief      text default null,
  p_due        date default null,
  p_priority   text default 'normal',
  p_members    uuid[] default '{}'
)
returns bigint language plpgsql security definer set search_path = public as $fn$
declare
  new_id bigint;
  me uuid := auth.uid();
  bad_member uuid;
begin
  if coalesce(trim(p_title), '') = '' then
    raise exception 'A project needs a title';
  end if;

  if not (public.is_admin() or (public.my_role() = 'head' and public.my_domain() = p_domain)) then
    raise exception 'Only an admin or the head of that domain can create projects there';
  end if;

  if p_client_id is null or not exists (select 1 from public.clients c where c.id = p_client_id) then
    raise exception 'Pick a client';
  end if;

  -- Assignees must belong to the project's domain. Without this a head could
  -- pull someone from another domain onto their work.
  select m into bad_member
    from unnest(p_members) as m
   where not exists (
     select 1 from public.profiles pr
      where pr.id = m and pr.domain = p_domain and pr.is_active
   )
   limit 1;
  if bad_member is not null then
    raise exception 'Everyone assigned must be an active member of that domain';
  end if;

  insert into public.projects (title, client_id, domain, brief, due_date, priority, status, created_by)
  values (trim(p_title), p_client_id, p_domain, nullif(trim(coalesce(p_brief,'')), ''),
          p_due, coalesce(p_priority,'normal'), 'assigned', me)
  returning id into new_id;

  -- First person named is lead, the rest support — matching how the original
  -- build assigned pair projects.
  insert into public.project_members (project_id, user_id, role_in_project, assigned_by)
  select new_id, m, case when ord = 1 then 'lead' else 'support' end, me
    from unnest(p_members) with ordinality as t(m, ord);

  insert into public.notifications (for_user, type, message, project_id)
  select m, 'project_assigned', 'You have been assigned to ' || trim(p_title), new_id
    from unnest(p_members) as m;

  return new_id;
end $fn$;

revoke all on function public.create_project(text, bigint, text, text, date, text, uuid[]) from public, anon;
grant execute on function public.create_project(text, bigint, text, text, date, text, uuid[]) to authenticated;

commit;
