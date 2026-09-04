// Typed bindings for the Marken OS schema.
//
// Hand-trimmed from `supabase gen types typescript` — the same shapes, without
// the generic helper machinery. Regenerate the full version any time with:
//   npm run types:gen   (requires the Supabase CLI)

export type Role = "admin" | "head" | "employee"
export type Domain = "marketing" | "design" | "socialmedia" | "webdev"
export type ProjectStatus =
  | "assigned"
  | "in_progress"
  | "in_review"
  | "approved"
  | "changes_requested"
export type Priority = "normal" | "high" | "urgent"
export type MemberRole = "lead" | "support"

export type Profile = {
  id: string
  username: string
  full_name: string | null
  domain: Domain | null
  role: Role
  avatar_url: string | null
  is_active: boolean
  created_at: string
}

export type Client = {
  id: number
  name: string | null
  created_by: string | null
  client_user_id: string | null
  created_at: string
}

export type Project = {
  id: number
  title: string | null
  client_id: number | null
  domain: Domain | null
  brief: string | null
  brief_file: string | null
  status: ProjectStatus | null
  priority: Priority | null
  due_date: string | null
  created_by: string | null
  approved_by: string | null
  approved_at: string | null
  is_pair_project: boolean | null
  created_at: string
}

export type ProjectMember = {
  id: number
  project_id: number | null
  user_id: string
  role_in_project: MemberRole | null
  assigned_by: string | null
  created_at: string
}

export type Submission = {
  id: number
  project_id: number | null
  submitted_by: string
  file_url: string | null
  file_name: string | null
  version: number | null
  created_at: string
}

export type Comment = {
  id: number
  project_id: number | null
  author_id: string | null
  message: string | null
  is_system: boolean
  tagged_submission_id: number | null
  created_at: string
}

export type Notification = {
  id: number
  for_user: string
  type: string | null
  message: string | null
  project_id: number | null
  is_read: boolean | null
  created_at: string
}

export type Attendance = {
  id: number
  user_id: string
  clock_in: string
  clock_out: string | null
  date: string
}

type Rel = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

type Table<Row, R extends Rel[] = []> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: R
}

/**
 * These mirror the foreign keys added in migration 0002 and repointed in 0004.
 * They are not decoration: supabase-js derives the shape of an embedded
 * select (`clients ( name )`) from this list, so an embed against a table
 * with an empty Relationships array fails to type-check.
 *
 * Where two keys point at the same table — projects has both created_by and
 * approved_by to profiles — the query must name the key explicitly, e.g.
 * `profiles!projects_approved_by_fkey ( … )`.
 */
type FK<N extends string, C extends string, T extends string> = {
  foreignKeyName: N
  columns: [C]
  isOneToOne: false
  referencedRelation: T
  referencedColumns: ["id"]
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>
      clients: Table<
        Client,
        [FK<"clients_created_by_fkey", "created_by", "profiles">]
      >
      projects: Table<
        Project,
        [
          FK<"projects_client_id_fkey", "client_id", "clients">,
          FK<"projects_created_by_fkey", "created_by", "profiles">,
          FK<"projects_approved_by_fkey", "approved_by", "profiles">,
        ]
      >
      project_members: Table<
        ProjectMember,
        [
          FK<"project_members_project_id_fkey", "project_id", "projects">,
          FK<"project_members_user_id_fkey", "user_id", "profiles">,
          FK<"project_members_assigned_by_fkey", "assigned_by", "profiles">,
        ]
      >
      submissions: Table<
        Submission,
        [
          FK<"submissions_project_id_fkey", "project_id", "projects">,
          FK<"submissions_submitted_by_fkey", "submitted_by", "profiles">,
        ]
      >
      comments: Table<
        Comment,
        [
          FK<"comments_project_id_fkey", "project_id", "projects">,
          FK<"comments_author_id_fkey", "author_id", "profiles">,
          FK<
            "comments_tagged_submission_id_fkey",
            "tagged_submission_id",
            "submissions"
          >,
        ]
      >
      notifications: Table<
        Notification,
        [
          FK<"notifications_project_id_fkey", "project_id", "projects">,
          FK<"notifications_for_user_fkey", "for_user", "profiles">,
        ]
      >
      attendance: Table<
        Attendance,
        [FK<"attendance_user_id_fkey", "user_id", "profiles">]
      >
    }
    Views: Record<never, never>
    Functions: {
      // Status transitions. Employees never UPDATE projects directly —
      // these validate the move server-side. See migration 0005.
      start_project: { Args: { p_project: number }; Returns: undefined }
      submit_for_review: { Args: { p_project: number }; Returns: undefined }
      approve_project: { Args: { p_project: number }; Returns: undefined }
      request_changes: {
        Args: { p_project: number; p_note: string }
        Returns: undefined
      }
      // Creation is an RPC because it writes notifications, which RLS grants
      // to admins only — see migration 0009.
      create_project: {
        Args: {
          p_title: string
          p_client_id: number
          p_domain: string
          p_brief?: string
          p_due?: string
          p_priority?: string
          p_members?: string[]
        }
        Returns: number
      }
      // RLS predicate helpers
      is_admin: { Args: never; Returns: boolean }
      is_member: { Args: { p_project: number }; Returns: boolean }
      can_see_project: { Args: { p_project: number }; Returns: boolean }
      can_manage_project: { Args: { p_project: number }; Returns: boolean }
      my_role: { Args: never; Returns: string }
      my_domain: { Args: never; Returns: string }
      username_to_email: { Args: { p_username: string }; Returns: string }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
