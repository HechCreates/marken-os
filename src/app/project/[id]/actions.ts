"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/auth"

export type ActionState = { error?: string; ok?: boolean }

const refresh = (id: number) => revalidatePath(`/project/${id}`)

/**
 * Status transitions call the SECURITY DEFINER RPCs from migration 0005.
 * The rules — who may approve, which states can follow which — live in the
 * database, so these wrappers stay thin on purpose. Their job is to translate
 * a Postgres exception into a sentence someone can act on.
 *
 * requireProfile() still runs first: Next's own docs warn that Server Actions
 * can fall outside proxy coverage after a refactor, so authorization is
 * checked here too rather than assumed.
 */
async function callRpc(
  id: number,
  fn: "start_project" | "submit_for_review" | "approve_project",
  fallback: string
): Promise<ActionState> {
  await requireProfile()
  const supabase = await createClient()
  const { error } = await supabase.rpc(fn, { p_project: id })
  if (error) return { error: humanise(error.message, fallback) }
  refresh(id)
  return { ok: true }
}

export async function startProject(id: number): Promise<ActionState> {
  return callRpc(id, "start_project", "Couldn't start this project.")
}

export async function submitForReview(id: number): Promise<ActionState> {
  return callRpc(id, "submit_for_review", "Couldn't submit this for review.")
}

export async function approveProject(id: number): Promise<ActionState> {
  return callRpc(id, "approve_project", "Couldn't approve this project.")
}

export async function requestChanges(
  id: number,
  note: string
): Promise<ActionState> {
  await requireProfile()
  const supabase = await createClient()
  const { error } = await supabase.rpc("request_changes", {
    p_project: id,
    p_note: note,
  })
  if (error) return { error: humanise(error.message, "Couldn't request changes.") }
  refresh(id)
  return { ok: true }
}

/** Post a comment as yourself. RLS enforces author_id = auth.uid(). */
export async function postComment(
  id: number,
  message: string
): Promise<ActionState> {
  const profile = await requireProfile()
  const text = message.trim()
  if (!text) return { error: "Write something first." }
  if (text.length > 4000) return { error: "That comment is too long." }

  const supabase = await createClient()
  const { error } = await supabase.from("comments").insert({
    project_id: id,
    author_id: profile.id,
    message: text,
    is_system: false,
  })
  if (error) return { error: "Couldn't post that comment. Try again." }
  refresh(id)
  return { ok: true }
}

/** Submit a link rather than a file — the lighter path for shared docs. */
export async function submitLink(
  id: number,
  url: string
): Promise<ActionState> {
  const profile = await requireProfile()
  const trimmed = url.trim()
  if (!/^https?:\/\/\S+$/i.test(trimmed)) {
    return { error: "Enter a full URL starting with http:// or https://" }
  }

  const version = await nextVersion(id, profile.id)
  const supabase = await createClient()
  const { error } = await supabase.from("submissions").insert({
    project_id: id,
    submitted_by: profile.id,
    file_url: trimmed,
    file_name: trimmed.replace(/^https?:\/\//, "").slice(0, 80),
    version,
  })
  if (error) return { error: "Couldn't save that link. Try again." }

  await supabase.from("comments").insert({
    project_id: id,
    author_id: profile.id,
    message: `Submitted link v${version}`,
    is_system: true,
  })
  refresh(id)
  return { ok: true }
}

/**
 * Record a file that the browser has already uploaded to storage.
 * The upload itself happens client-side so the bytes never round-trip through
 * the server; storage RLS (migration 0006) gates it by project membership.
 */
export async function recordUpload(
  id: number,
  path: string,
  fileName: string,
  version: number
): Promise<ActionState> {
  const profile = await requireProfile()
  const supabase = await createClient()

  const { error } = await supabase.from("submissions").insert({
    project_id: id,
    submitted_by: profile.id,
    file_url: path,
    file_name: fileName,
    version,
  })
  if (error) return { error: "Uploaded, but couldn't record it. Try again." }

  await supabase.from("comments").insert({
    project_id: id,
    author_id: profile.id,
    message: `Uploaded v${version}: ${fileName}`,
    is_system: true,
  })
  refresh(id)
  return { ok: true }
}

/**
 * Next version for this person on this project.
 *
 * The old build computed this from an in-memory array, so two concurrent
 * uploads both claimed v3. The unique constraint on
 * (project_id, submitted_by, version) now makes that collision impossible —
 * this reads the current maximum so the common case is right first time, and
 * the constraint is the backstop if two requests still race.
 */
export async function nextVersion(id: number, userId: string): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("submissions")
    .select("version")
    .eq("project_id", id)
    .eq("submitted_by", userId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data?.version ?? 0) + 1
}

/** Postgres exceptions are precise but not written for people. */
function humanise(message: string, fallback: string): string {
  if (message.includes("Not a member")) return "You're not assigned to this project."
  if (message.includes("Only a domain head or admin"))
    return "Only a domain head or an admin can do that."
  if (message.includes("not in a startable state"))
    return "This project has already been started."
  if (message.includes("must be in progress"))
    return "Start the project before submitting it for review."
  if (message.includes("must be in review"))
    return "This project isn't awaiting review right now."
  return fallback
}
