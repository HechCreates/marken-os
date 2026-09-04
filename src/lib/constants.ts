import type { Domain, Priority, ProjectStatus, Role } from "@/types/database"

// Marken brand, carried over from the Framer overrides so the rebuild looks
// like the same product.
export const BRAND = {
  yellow: "#FBFF12",
  black: "#3C3D2A",
  pageBg: "#1A1B12",
  cardBg: "#2E3021",
  inputBg: "#1E1F14",
} as const

export const DOMAIN_LABELS: Record<Domain, string> = {
  marketing: "Marketing and Sales",
  design: "Design and Creatives",
  socialmedia: "Social Media Management",
  webdev: "Website Design and Development",
}

export const DOMAIN_SHORT: Record<Domain, string> = {
  marketing: "Marketing",
  design: "Design",
  socialmedia: "Social Media",
  webdev: "Web Dev",
}

export const DOMAINS = Object.keys(DOMAIN_LABELS) as Domain[]

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  head: "Domain Head",
  employee: "Employee",
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  assigned: "Assigned",
  in_progress: "In Progress",
  in_review: "In Review",
  approved: "Approved",
  changes_requested: "Changes Requested",
}

// Same values the overrides used, so the pipeline reads identically.
export const STATUS_COLOR: Record<ProjectStatus, { bg: string; fg: string }> = {
  assigned: { bg: "#FBFF12", fg: "#3C3D2A" },
  in_progress: { bg: "#3B82F6", fg: "#FFFFFF" },
  in_review: { bg: "#F97316", fg: "#FFFFFF" },
  approved: { bg: "#22C55E", fg: "#FFFFFF" },
  changes_requested: { bg: "#EF4444", fg: "#FFFFFF" },
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
}

/**
 * Where a user lands after signing in. Admins oversee every domain; everyone
 * else goes to their own.
 */
export function homePathFor(role: Role, domain: Domain | null): string {
  if (role === "admin") return "/admin"
  return domain ? `/d/${domain}` : "/dashboard"
}

/**
 * Mirrors public.username_to_email() in migration 0004. Staff type a username;
 * Supabase Auth needs an address, so we synthesise a non-deliverable one.
 * Both sides must agree or logins silently fail to match an account.
 */
export function usernameToEmail(username: string): string {
  const domain = process.env.NEXT_PUBLIC_LOGIN_EMAIL_DOMAIN ?? "markenos.internal"
  return `${username.trim().toLowerCase()}@${domain}`
}

/**
 * Employees see the pipeline in their own words. "Sent for approval" and
 * "Rework" describe what happened to their work; in_review and
 * changes_requested describe the row. HIG Writing: name things the way the
 * person recognises them, not the way the system stores them.
 */
export const EMPLOYEE_STATUS_LABELS: Record<ProjectStatus, string> = {
  assigned: "Assigned",
  in_progress: "In progress",
  in_review: "Sent for approval",
  changes_requested: "Rework",
  approved: "Completed",
}
