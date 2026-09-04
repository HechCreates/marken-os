-- Marken OS · 0004 · Supabase Auth + profiles, identity moves to UUID
--
-- REQUIRES 0003 to have run (or a manual backfill). The guard below stops the
-- migration rather than silently orphaning rows.
--
-- Login identity: staff keep typing a username. The app maps it to a synthetic
-- address via username_to_email() before calling signInWithPassword. Passwords
-- become bcrypt hashes managed by Supabase; public.users.password disappears.
-- Note the tradeoff you accepted: synthetic addresses receive no mail, so
-- password reset is an admin action, not a self-service email link.

begin;

do $$
begin
  if exists (select 1 from public.users) then
    raise exception
      'public.users still has rows. Run 0003_purge_demo_data.sql first, or backfill UUIDs by hand before applying 0004.';
  end if;
end $$;

-- ── Drop the dead policies from an earlier schema iteration ──
-- The "Staff full access" policies match users.username against an auth email
-- and check for role 'domain_head', which this app has never used. They could
-- never have matched a row, and they hold a dependency on public.users.
-- The "Client reads own ..." policies are correct — they key on
-- clients.client_user_id — so they survive for the client portal work.
drop policy if exists "Staff full access clients"          on public.clients;
drop policy if exists "Staff full access projects"         on public.projects;
drop policy if exists "Staff full access meetings"         on public.meetings;
drop policy if exists "Staff full access meeting_minutes"  on public.meeting_minutes;
drop policy if exists "Staff full access client_documents" on public.client_documents;

-- These were open-to-everyone (using true) and inert while RLS was off.
-- 0005 replaces them with real ones under the same names.
drop policy if exists attendance_select    on public.attendance;
drop policy if exists attendance_insert    on public.attendance;
drop policy if exists attendance_update    on public.attendance;
drop policy if exists comments_select      on public.comments;
drop policy if exists comments_insert      on public.comments;
drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_insert on public.notifications;
drop policy if exists notifications_update on public.notifications;
drop policy if exists submissions_select   on public.submissions;
drop policy if exists submissions_insert   on public.submissions;

-- ── Username <-> synthetic email ──
create or replace function public.username_to_email(p_username text)
returns text language sql immutable as $$
  select lower(trim(p_username)) || '@markenos.internal';
$$;

-- ── profiles: the app-facing identity, keyed to auth.users ──
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,
  full_name   text,
  domain      text,
  role        text not null default 'employee',
  avatar_url  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint profiles_role_check   check (role in ('admin','head','employee')),
  constraint profiles_domain_check check (domain is null or domain in ('marketing','design','socialmedia','webdev')),
  constraint profiles_domain_required_for_staff check (role = 'admin' or domain is not null)
);
create index profiles_domain_role_idx on public.profiles(domain, role);

-- Auto-create a profile whenever an auth user is created. Admin-side user
-- creation passes username/full_name/domain/role in raw_user_meta_data.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, full_name, domain, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)),
    nullif(new.raw_user_meta_data->>'full_name',''),
    nullif(new.raw_user_meta_data->>'domain',''),
    coalesce(nullif(new.raw_user_meta_data->>'role',''), 'employee')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Repoint every username column at profiles(id) ──

alter table public.project_members
  drop constraint if exists project_members_unique,
  drop column username,
  drop column assigned_by,
  add  column user_id     uuid not null references public.profiles(id) on delete cascade,
  add  column assigned_by uuid references public.profiles(id) on delete set null,
  add  constraint project_members_unique unique (project_id, user_id);

alter table public.submissions
  drop constraint if exists submissions_version_unique,
  drop column submitted_by,
  drop column file_type,
  drop column note,
  drop column link_url,
  add  column submitted_by uuid not null references public.profiles(id) on delete cascade,
  add  constraint submissions_version_unique unique (project_id, submitted_by, version);

-- author_id NULL means a system-generated message. Replaces the "__system__"
-- magic username the overrides string-matched on.
alter table public.comments
  drop column from_user,
  drop column is_feedback,
  add  column author_id uuid references public.profiles(id) on delete set null,
  add  column is_system boolean not null default false;

alter table public.notifications
  drop column for_user,
  add  column for_user uuid not null references public.profiles(id) on delete cascade;
create index notifications_inbox_idx2 on public.notifications(for_user, is_read, created_at desc);

alter table public.attendance
  drop column username,
  add  column user_id uuid not null references public.profiles(id) on delete cascade;
create index attendance_user_date_idx2 on public.attendance(user_id, date);

-- One open session per person, ever. Makes the stale-record bug unrepresentable.
create unique index attendance_one_open_session
  on public.attendance(user_id) where clock_out is null;

alter table public.projects
  drop column created_by,
  drop column approved_by,
  add  column created_by  uuid references public.profiles(id) on delete set null,
  add  column approved_by uuid references public.profiles(id) on delete set null;

alter table public.clients
  drop column created_by,
  drop column logo_url,
  add  column created_by uuid references public.profiles(id) on delete set null;

-- ── public.users is now replaced by profiles ──
drop table public.users;

-- ── Close any attendance session left open past its day ──
-- Call from a scheduled job, or on login. Stops staff being scored down for
-- closing a tab instead of clicking Logout.
create or replace function public.close_stale_attendance()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with closed as (
    update public.attendance
       set clock_out = (date + time '23:59:59') at time zone 'UTC'
     where clock_out is null
       and date < current_date
    returning 1
  ) select count(*) into n from closed;
  return n;
end $$;

commit;
