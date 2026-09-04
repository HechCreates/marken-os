"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient, ADMIN_NOT_CONFIGURED } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth"
import { usernameToEmail, DOMAINS } from "@/lib/constants"
import type { Domain, Role } from "@/types/database"

export type Result = { error?: string; ok?: string; password?: string }

const refresh = () => revalidatePath("/settings")

const ROLES: Role[] = ["admin", "head", "employee"]
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._-]{1,30})[a-z0-9]$/

function validate(username: string, role: string, domain: string): string | null {
  if (!USERNAME_RE.test(username))
    return "Usernames are 3–32 characters: lowercase letters, numbers, dots, dashes or underscores."
  if (!ROLES.includes(role as Role)) return "Pick a role."
  // Mirrors the profiles_domain_required_for_staff constraint, so the form
  // catches it before Postgres has to.
  if (role !== "admin" && !DOMAINS.includes(domain as Domain))
    return "Heads and employees need a domain."
  return null
}

/** Readable, unambiguous — no O/0 or l/1 confusion when read aloud. */
function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => chars[b % chars.length]).join("")
}

// ─────────────────────────────────────────────────────────────
// People
// ─────────────────────────────────────────────────────────────

/**
 * Creates the auth user; the on_auth_user_created trigger from migration 0004
 * writes the matching profile. The password is returned once, for the admin to
 * pass on — synthetic @markenos.internal addresses receive no mail, so there is
 * no reset-by-email path. That was the trade-off accepted when we chose
 * usernames over real addresses.
 */
export async function createUser(form: FormData): Promise<Result> {
  await requireRole("admin")

  const username = String(form.get("username") ?? "").trim().toLowerCase()
  const fullName = String(form.get("full_name") ?? "").trim()
  const role = String(form.get("role") ?? "")
  const domain = role === "admin" ? "" : String(form.get("domain") ?? "")

  const invalid = validate(username, role, domain)
  if (invalid) return { error: invalid }
  if (!fullName) return { error: "Enter a full name." }

  const admin = createAdminClient()
  if (!admin) return { error: ADMIN_NOT_CONFIGURED }

  const password = generatePassword()

  const { error } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
    user_metadata: { username, full_name: fullName, role, domain },
  })

  if (error) {
    return {
      error: error.message.toLowerCase().includes("already")
        ? `Someone already uses the username "${username}".`
        : `Couldn't create that account: ${error.message}`,
    }
  }

  refresh()
  return { ok: `Created @${username}`, password }
}

/** Name, role and domain. Username is immutable — it is the login handle. */
export async function updateUser(form: FormData): Promise<Result> {
  await requireRole("admin")

  const id = String(form.get("id") ?? "")
  const fullName = String(form.get("full_name") ?? "").trim()
  const role = String(form.get("role") ?? "")
  const domain = role === "admin" ? null : String(form.get("domain") ?? "")

  if (!id) return { error: "Missing user." }
  if (!fullName) return { error: "Enter a full name." }
  const invalid = validate("placeholder", role, domain ?? "")
  if (invalid && !invalid.startsWith("Usernames")) return { error: invalid }

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, role: role as Role, domain: domain as Domain | null })
    .eq("id", id)

  if (error) return { error: `Couldn't save: ${error.message}` }
  refresh()
  return { ok: "Saved" }
}

/**
 * Deactivation, not deletion — the default for someone leaving.
 * requireProfile() signs out an inactive account on their next request, and
 * their history stays intact.
 */
export async function setActive(id: string, active: boolean): Promise<Result> {
  const me = await requireRole("admin")
  if (id === me.id) return { error: "You can't deactivate your own account." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: active })
    .eq("id", id)

  if (error) return { error: `Couldn't update: ${error.message}` }
  refresh()
  return { ok: active ? "Reactivated" : "Deactivated" }
}

/**
 * Permanent. profiles cascades from auth.users, and project_members and
 * submissions cascade from profiles — so this destroys the person's uploaded
 * work along with the account. Comments survive with a null author.
 * Deactivation is almost always what someone actually wants.
 */
export async function deleteUser(id: string): Promise<Result> {
  const me = await requireRole("admin")
  if (id === me.id) return { error: "You can't delete your own account." }

  const admin = createAdminClient()
  if (!admin) return { error: ADMIN_NOT_CONFIGURED }

  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return { error: `Couldn't delete: ${error.message}` }
  refresh()
  return { ok: "Account deleted" }
}

/** New random password, shown once. There is no email to send it to. */
export async function resetPassword(id: string): Promise<Result> {
  await requireRole("admin")

  const admin = createAdminClient()
  if (!admin) return { error: ADMIN_NOT_CONFIGURED }

  const password = generatePassword()
  const { error } = await admin.auth.admin.updateUserById(id, { password })
  if (error) return { error: `Couldn't reset: ${error.message}` }

  return { ok: "Password reset", password }
}

// ─────────────────────────────────────────────────────────────
// Clients
// ─────────────────────────────────────────────────────────────

export async function createClientRecord(form: FormData): Promise<Result> {
  const me = await requireRole("admin")
  const name = String(form.get("name") ?? "").trim()
  if (!name) return { error: "Enter a client name." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("clients")
    .insert({ name, created_by: me.id })

  if (error) return { error: `Couldn't add that client: ${error.message}` }
  refresh()
  return { ok: `Added ${name}` }
}

export async function updateClientRecord(form: FormData): Promise<Result> {
  await requireRole("admin")
  const id = Number(form.get("id"))
  const name = String(form.get("name") ?? "").trim()
  if (!id || !name) return { error: "Enter a client name." }

  const supabase = await createClient()
  const { error } = await supabase.from("clients").update({ name }).eq("id", id)
  if (error) return { error: `Couldn't save: ${error.message}` }
  refresh()
  return { ok: "Saved" }
}

/**
 * projects.client_id is ON DELETE RESTRICT, so Postgres refuses this while the
 * client still has work. That is the intended answer — deleting a client
 * should never quietly take its projects with it.
 */
export async function deleteClientRecord(id: number): Promise<Result> {
  await requireRole("admin")

  const supabase = await createClient()
  const { error } = await supabase.from("clients").delete().eq("id", id)

  if (error) {
    if (error.code === "23503" || error.message.includes("violates foreign key"))
      return {
        error:
          "This client still has projects. Reassign or delete them first.",
      }
    return { error: `Couldn't delete: ${error.message}` }
  }
  refresh()
  return { ok: "Client deleted" }
}
