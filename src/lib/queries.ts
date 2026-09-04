import { createClient } from "@/lib/supabase/server"
import { DOMAINS } from "@/lib/constants"
import type { Domain, MemberRole, Priority, ProjectStatus } from "@/types/database"

/**
 * Every query here runs under the caller's session, so RLS decides the rows.
 * Nothing below filters by role — an employee and an admin run the identical
 * SQL and get different answers. That is the point.
 */

const today = () => new Date().toISOString().split("T")[0]

export type ProjectRow = {
  id: number
  title: string | null
  domain: Domain | null
  status: ProjectStatus | null
  priority: string | null
  due_date: string | null
  client: string | null
  members: string[]
}

/** Projects, optionally narrowed to one domain, with client and member names. */
export async function getProjects(domain?: Domain): Promise<ProjectRow[]> {
  const supabase = await createClient()

  // One request. The foreign keys added in migration 0002 are what make this
  // embed possible — the old build fired four sequential queries and stitched
  // the results together in JavaScript because no FKs existed.
  // project_members has two keys into profiles (user_id and assigned_by), so
  // the embed has to name which one it means.
  let q = supabase
    .from("projects")
    .select(
      `id, title, domain, status, priority, due_date,
       clients ( name ),
       project_members ( profiles!project_members_user_id_fkey ( full_name, username ) )`
    )
    .order("due_date", { ascending: true, nullsFirst: false })

  if (domain) q = q.eq("domain", domain)

  const { data, error } = await q
  if (error) {
    console.error("[MarkenOS] projects query failed:", error.message)
    return []
  }

  return (data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    domain: p.domain as Domain | null,
    status: p.status as ProjectStatus | null,
    priority: p.priority,
    due_date: p.due_date,
    client: p.clients?.name ?? null,
    members: (p.project_members ?? [])
      .map((m) => m.profiles?.full_name ?? m.profiles?.username)
      .filter((n): n is string => Boolean(n)),
  }))
}

/** Counts for the four cards across the top of the admin dashboard. */
export async function getAdminStats() {
  const supabase = await createClient()
  const t = today()

  const [active, overdue, pending, clients] = await Promise.all([
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .neq("status", "approved"),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .lt("due_date", t)
      .neq("status", "approved"),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_review"),
    supabase.from("clients").select("id", { count: "exact", head: true }),
  ])

  return {
    active: active.count ?? 0,
    overdue: overdue.count ?? 0,
    pending: pending.count ?? 0,
    clients: clients.count ?? 0,
  }
}

/** Active project count per domain, for the domain cards. */
export async function getDomainCounts(): Promise<Record<Domain, number>> {
  const supabase = await createClient()

  const results = await Promise.all(
    DOMAINS.map((d) =>
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("domain", d)
        .neq("status", "approved")
    )
  )

  return Object.fromEntries(
    DOMAINS.map((d, i) => [d, results[i].count ?? 0])
  ) as Record<Domain, number>
}

/** Counts for the four cards on a domain dashboard. */
export async function getDomainStats(domain: Domain) {
  const supabase = await createClient()
  const t = today()
  const now = new Date()
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0]

  const base = () =>
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("domain", domain)

  const [active, inReview, overdue, dueThisMonth] = await Promise.all([
    base().neq("status", "approved"),
    base().eq("status", "in_review"),
    base().lt("due_date", t).neq("status", "approved"),
    base().gte("due_date", t).lte("due_date", monthEnd).neq("status", "approved"),
  ])

  return {
    active: active.count ?? 0,
    inReview: inReview.count ?? 0,
    overdue: overdue.count ?? 0,
    dueThisMonth: dueThisMonth.count ?? 0,
  }
}

export type ActivityItem = {
  id: string
  text: string
  at: string
  kind: "submission" | "comment" | "approval"
}

/**
 * Merged feed of submissions, comments and approvals. Only rows the viewer is
 * allowed to see appear, so a head's activity column is their domain's.
 */
export async function getRecentActivity(limit = 8): Promise<ActivityItem[]> {
  const supabase = await createClient()

  const [subs, comments, approvals] = await Promise.all([
    supabase
      .from("submissions")
      .select(
        `id, version, created_at,
         profiles ( full_name, username ),
         projects ( title, domain )`
      )
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("comments")
      .select(
        `id, created_at, is_system,
         profiles ( full_name, username ),
         projects ( title, domain )`
      )
      .eq("is_system", false)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("projects")
      .select("id, title, domain, approved_at, profiles!projects_approved_by_fkey ( full_name, username )")
      .eq("status", "approved")
      .not("approved_at", "is", null)
      .order("approved_at", { ascending: false })
      .limit(limit),
  ])

  const who = (p: { full_name: string | null; username: string } | null) =>
    p?.full_name ?? p?.username ?? "Someone"

  const items: ActivityItem[] = []

  for (const s of subs.data ?? []) {
    items.push({
      id: `s${s.id}`,
      kind: "submission",
      at: s.created_at,
      text: `${who(s.profiles)} submitted v${s.version ?? 1} of ${s.projects?.title ?? "a project"}`,
    })
  }
  for (const c of comments.data ?? []) {
    items.push({
      id: `c${c.id}`,
      kind: "comment",
      at: c.created_at,
      text: `${who(c.profiles)} commented on ${c.projects?.title ?? "a project"}`,
    })
  }
  for (const a of approvals.data ?? []) {
    if (!a.approved_at) continue
    items.push({
      id: `a${a.id}`,
      kind: "approval",
      at: a.approved_at,
      text: `${who(a.profiles)} approved ${a.title ?? "a project"}`,
    })
  }

  return items
    .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
    .slice(0, limit)
}

/** Unread notification count for the nav badge. */
export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false)
  return count ?? 0
}

// ─────────────────────────────────────────────────────────────
// Project detail
// ─────────────────────────────────────────────────────────────

export type Member = {
  user_id: string
  name: string
  username: string
  role_in_project: MemberRole
}

export type SubmissionRow = {
  id: number
  version: number
  file_name: string | null
  /** Ready-to-open URL: an external link as-is, or a signed URL for storage. */
  href: string | null
  is_link: boolean
  submitted_by: string
  author: string
  created_at: string
}

export type CommentRow = {
  id: number
  message: string | null
  is_system: boolean
  author_id: string | null
  author: string
  created_at: string
}

export type ProjectDetail = {
  id: number
  title: string | null
  brief: string | null
  brief_links: string[]
  brief_files: { name: string; href: string | null }[]
  status: ProjectStatus
  priority: Priority
  due_date: string | null
  domain: Domain | null
  client: string | null
  approved_at: string | null
  approved_by_name: string | null
  members: Member[]
  submissions: SubmissionRow[]
  comments: CommentRow[]
}

/**
 * Everything the detail page needs. Returns null when RLS hides the row —
 * which is how a non-member "not found" and a genuinely missing project look
 * identical from outside, and deliberately so.
 */
export async function getProject(id: number): Promise<ProjectDetail | null> {
  const supabase = await createClient()

  const { data: p, error } = await supabase
    .from("projects")
    .select(
      `id, title, brief, brief_file, status, priority, due_date, domain,
       approved_at,
       clients ( name ),
       profiles!projects_approved_by_fkey ( full_name, username )`
    )
    .eq("id", id)
    .maybeSingle()

  if (error || !p) return null

  const [membersRes, subsRes, commentsRes] = await Promise.all([
    supabase
      .from("project_members")
      .select(
        `user_id, role_in_project,
         profiles!project_members_user_id_fkey ( full_name, username )`
      )
      .eq("project_id", id),
    supabase
      .from("submissions")
      .select(
        `id, version, file_name, file_url, submitted_by, created_at,
         profiles ( full_name, username )`
      )
      .eq("project_id", id)
      .order("version", { ascending: true }),
    supabase
      .from("comments")
      .select(`id, message, is_system, author_id, created_at, profiles ( full_name, username )`)
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
  ])

  // The brief packs links into the text after a "Links:" marker — a convention
  // inherited from the Framer build. Split them back out for real anchors.
  let briefText = p.brief ?? ""
  let briefLinks: string[] = []
  const marker = "\n\nLinks:\n"
  const at = briefText.indexOf(marker)
  if (at !== -1) {
    briefLinks = briefText.slice(at + marker.length).split("\n").filter(Boolean)
    briefText = briefText.slice(0, at)
  }

  let briefFiles: string[] = []
  if (p.brief_file) {
    try {
      briefFiles = JSON.parse(p.brief_file)
    } catch {
      briefFiles = [p.brief_file]
    }
  }

  // Buckets are private now, so anything stored in Supabase needs a signed URL.
  // Values starting with http are external links someone pasted. Brief
  // attachments and submissions live in the same bucket, so they sign together.
  const storagePaths = [
    ...(subsRes.data ?? [])
      .map((s) => s.file_url)
      .filter((u): u is string => u !== null && !u.startsWith("http")),
    ...briefFiles,
  ]

  const signed = new Map<string, string>()
  if (storagePaths.length > 0) {
    // One hour: long enough to open and read, short enough that a leaked URL
    // stops working. Nothing here is a permanent public address any more.
    const { data } = await supabase.storage
      .from("submissions")
      .createSignedUrls(storagePaths, 60 * 60)
    for (const s of data ?? []) {
      if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl)
    }
  }

  const name = (pr: { full_name: string | null; username: string } | null) =>
    pr?.full_name ?? pr?.username ?? "Unknown"

  return {
    id: p.id,
    title: p.title,
    brief: briefText.trim() || null,
    brief_links: briefLinks,
    brief_files: briefFiles.map((path) => ({
      name: path.split("/").pop() ?? "Attachment",
      href: signed.get(path) ?? null,
    })),
    status: (p.status ?? "assigned") as ProjectStatus,
    priority: (p.priority ?? "normal") as Priority,
    due_date: p.due_date,
    domain: p.domain as Domain | null,
    client: p.clients?.name ?? null,
    approved_at: p.approved_at,
    approved_by_name: p.profiles ? name(p.profiles) : null,
    members: (membersRes.data ?? []).map((m) => ({
      user_id: m.user_id,
      name: name(m.profiles),
      username: m.profiles?.username ?? "",
      role_in_project: (m.role_in_project ?? "support") as MemberRole,
    })),
    submissions: (subsRes.data ?? []).map((s) => {
      const isLink = Boolean(s.file_url?.startsWith("http"))
      return {
        id: s.id,
        version: s.version ?? 1,
        file_name: s.file_name,
        href: isLink ? s.file_url : (signed.get(s.file_url ?? "") ?? null),
        is_link: isLink,
        submitted_by: s.submitted_by,
        author: name(s.profiles),
        created_at: s.created_at,
      }
    }),
    comments: (commentsRes.data ?? []).map((c) => ({
      id: c.id,
      message: c.message,
      is_system: c.is_system,
      author_id: c.author_id,
      author: name(c.profiles),
      created_at: c.created_at,
    })),
  }
}

// ─────────────────────────────────────────────────────────────
// Notifications and account
// ─────────────────────────────────────────────────────────────

export type NotificationRow = {
  id: number
  type: string | null
  message: string | null
  project_id: number | null
  project_title: string | null
  is_read: boolean
  created_at: string
}

/**
 * Your inbox. notifications_select restricts this to for_user = auth.uid(),
 * so there is no ownership filter written here — the policy is the filter.
 */
export async function getNotifications(limit = 50): Promise<NotificationRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, message, project_id, is_read, created_at, projects ( title )")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[MarkenOS] notifications query failed:", error.message)
    return []
  }

  return (data ?? []).map((n) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    project_id: n.project_id,
    project_title: n.projects?.title ?? null,
    is_read: n.is_read ?? false,
    created_at: n.created_at,
  }))
}

export type AccountStats = {
  projects: number
  submissions: number
  comments: number
  hoursThisWeek: string
  clockedInAt: string | null
}

/** The figures on your own account page. All RLS-scoped to you. */
export async function getAccountStats(userId: string): Promise<AccountStats> {
  const supabase = await createClient()

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekStartStr = weekStart.toISOString().split("T")[0]

  const [projects, submissions, comments, attendance, open] = await Promise.all([
    supabase
      .from("project_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("submitted_by", userId),
    supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId)
      .eq("is_system", false),
    supabase
      .from("attendance")
      .select("clock_in, clock_out")
      .eq("user_id", userId)
      .gte("date", weekStartStr),
    supabase
      .from("attendance")
      .select("clock_in")
      .eq("user_id", userId)
      .is("clock_out", null)
      .limit(1)
      .maybeSingle(),
  ])

  // Only closed sessions count. The old build did the same but never closed
  // stale ones, so hours silently under-reported; migration 0004's
  // close_stale_attendance() is what keeps this honest now.
  let minutes = 0
  for (const r of attendance.data ?? []) {
    if (r.clock_in && r.clock_out) {
      minutes += Math.round(
        (new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime()) / 60000
      )
    }
  }

  return {
    projects: projects.count ?? 0,
    submissions: submissions.count ?? 0,
    comments: comments.count ?? 0,
    hoursThisWeek: `${Math.floor(minutes / 60)}h ${minutes % 60}m`,
    clockedInAt: open.data?.clock_in ?? null,
  }
}
