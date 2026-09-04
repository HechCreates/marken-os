"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/auth"
import { DOMAINS } from "@/lib/constants"
import type { Domain } from "@/types/database"

export type CreateState = { error?: string; projectId?: number }

/**
 * Creation goes through the create_project RPC (migration 0009) rather than
 * three separate inserts. A head can write projects and members under RLS but
 * not notifications, and doing it in one function also means a half-created
 * project can't survive a failure partway through.
 */
export async function createProject(form: FormData): Promise<CreateState> {
  const profile = await requireProfile()

  const domain = String(form.get("domain") ?? "")
  if (!DOMAINS.includes(domain as Domain)) return { error: "Unknown domain." }

  const title = String(form.get("title") ?? "").trim()
  if (!title) return { error: "Give the project a title." }
  if (title.length > 200) return { error: "That title is too long." }

  const clientId = Number(form.get("client_id"))
  if (!clientId) return { error: "Choose a client." }

  const due = String(form.get("due_date") ?? "").trim()
  const priority = String(form.get("priority") ?? "normal")
  const brief = String(form.get("brief") ?? "").trim()
  const links = form
    .getAll("link")
    .map((l) => String(l).trim())
    .filter(Boolean)

  const members = form.getAll("member").map((m) => String(m))

  // Links ride along in the brief text under a marker the detail page splits
  // back out. Inherited from the Framer build; kept so old and new rows read
  // the same way.
  const fullBrief =
    links.length > 0 ? `${brief}\n\nLinks:\n${links.join("\n")}`.trim() : brief

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("create_project", {
    p_title: title,
    p_client_id: clientId,
    p_domain: domain,
    p_brief: fullBrief || undefined,
    p_due: due || undefined,
    p_priority: priority,
    p_members: members,
  })

  if (error) {
    const m = error.message
    if (m.includes("Only an admin or the head"))
      return { error: "You can only create projects in your own domain." }
    if (m.includes("must be an active member"))
      return { error: "Everyone assigned has to be active and in this domain." }
    if (m.includes("Pick a client")) return { error: "Choose a client." }
    if (m.includes("needs a title")) return { error: "Give the project a title." }
    return { error: "Couldn't create the project. Try again." }
  }

  revalidatePath(`/d/${domain}`)
  return { projectId: data as unknown as number }
}

/**
 * Records brief attachments after the browser has uploaded them. Storage RLS
 * keys on the project id in the object path, so the project must exist first —
 * which is why this is a second step rather than part of creation.
 */
export async function attachBriefFiles(
  projectId: number,
  paths: string[]
): Promise<{ error?: string }> {
  await requireProfile()
  if (paths.length === 0) return {}

  const supabase = await createClient()
  const { error } = await supabase
    .from("projects")
    .update({ brief_file: JSON.stringify(paths) })
    .eq("id", projectId)

  if (error) return { error: "Project created, but the attachments didn't save." }
  revalidatePath(`/project/${projectId}`)
  return {}
}

/** Heads and admins can both add clients — clients_write in migration 0005. */
export async function quickAddClient(
  name: string
): Promise<{ error?: string; id?: number; name?: string }> {
  const profile = await requireProfile()
  if (profile.role === "employee") return { error: "Only heads and admins can add clients." }

  const trimmed = name.trim()
  if (!trimmed) return { error: "Enter a client name." }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("clients")
    .insert({ name: trimmed, created_by: profile.id })
    .select("id, name")
    .single()

  if (error) return { error: "Couldn't add that client." }
  return { id: data.id, name: data.name ?? trimmed }
}
