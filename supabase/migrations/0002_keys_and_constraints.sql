-- Marken OS · 0002 · Keys, constraints, indexes
--
-- Runs after the purge, so every table here is empty and no orphan cleanup or
-- NOT VALID dance is needed. Gives the schema the referential integrity it never
-- had — which is also what lets PostgREST embed related rows in one query
-- instead of the four sequential round trips the Framer overrides hand-rolled.
--
-- Nothing here touches public.users: that table is replaced by profiles in 0004,
-- so constraining it now would be wasted work. It already carries its own
-- users_role_check and users_domain_check from the original schema.

begin;

-- ── Foreign keys on the project hot path ──
alter table public.project_members
  add constraint project_members_project_id_fkey foreign key (project_id)
  references public.projects(id) on delete cascade;

alter table public.submissions
  add constraint submissions_project_id_fkey foreign key (project_id)
  references public.projects(id) on delete cascade;

alter table public.comments
  add constraint comments_project_id_fkey foreign key (project_id)
  references public.projects(id) on delete cascade;

alter table public.comments
  add constraint comments_tagged_submission_id_fkey foreign key (tagged_submission_id)
  references public.submissions(id) on delete set null;

alter table public.notifications
  add constraint notifications_project_id_fkey foreign key (project_id)
  references public.projects(id) on delete cascade;

-- Clients are restricted, not cascaded: deleting a client with live projects
-- should fail loudly rather than silently delete the work.
alter table public.projects
  add constraint projects_client_id_fkey foreign key (client_id)
  references public.clients(id) on delete restrict;

-- ── Value constraints ──
alter table public.projects
  add constraint projects_domain_check
  check (domain in ('marketing','design','socialmedia','webdev'));

alter table public.projects
  add constraint projects_status_check
  check (status in ('assigned','in_progress','in_review','approved','changes_requested'));

alter table public.projects
  add constraint projects_priority_check
  check (priority in ('normal','high','urgent'));

alter table public.project_members
  add constraint project_members_role_check
  check (role_in_project in ('lead','support'));

-- ── Resolve the duplicated brief column ──
-- projects carried both brief_file_url and brief_file; only the latter was ever
-- read, holding a JSON array of storage paths in a text column.
alter table public.projects drop column if exists brief_file_url;

-- ── Indexes for the queries the app actually runs ──
create index if not exists submissions_project_idx    on public.submissions(project_id);
create index if not exists comments_project_idx       on public.comments(project_id, created_at);
create index if not exists projects_domain_status_idx on public.projects(domain, status);
create index if not exists projects_due_idx           on public.projects(due_date) where status <> 'approved';

commit;
