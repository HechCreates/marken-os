"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/auth"
import { usernameToEmail } from "@/lib/constants"

export type AccountResult = { error?: string; ok?: string }

/**
 * Your own display name. profiles_update_self permits the row, and the
 * guard_profile_privileges trigger silently reverts role, domain, username and
 * is_active if anyone tries to slip them in — so this can only ever change what
 * it says it changes.
 */
export async function updateName(name: string): Promise<AccountResult> {
  const profile = await requireProfile()
  const trimmed = name.trim()

  if (!trimmed) return { error: "Your name can't be empty." }
  if (trimmed.length > 80) return { error: "That name is too long." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: trimmed })
    .eq("id", profile.id)

  if (error) return { error: "Couldn't save your name. Try again." }
  revalidatePath("/", "layout")
  return { ok: "Name updated" }
}

/**
 * Changing your password.
 *
 * Supabase has no "verify my current password" call, so the check is a real
 * sign-in with the old one. Without that, anyone who walked up to an unlocked
 * screen could change the password without knowing it.
 *
 * Note what this file never does: compare passwords itself. Supabase verifies
 * the bcrypt hash. The old build fetched the row and did `data.password !== p`
 * in the browser.
 */
export async function updatePassword(
  current: string,
  next: string,
  confirm: string
): Promise<AccountResult> {
  const profile = await requireProfile()

  if (!current) return { error: "Enter your current password." }
  if (next.length < 8) return { error: "Use at least 8 characters." }
  if (next !== confirm) return { error: "The two new passwords don't match." }
  if (next === current) return { error: "That's the password you already have." }

  const supabase = await createClient()

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(profile.username),
    password: current,
  })
  if (authError) return { error: "Your current password isn't right." }

  const { error } = await supabase.auth.updateUser({ password: next })
  if (error) return { error: "Couldn't update your password. Try again." }

  return { ok: "Password updated" }
}

/**
 * Records an avatar the browser has already uploaded. The avatars bucket is
 * private (migration 0003), so this stores the storage PATH and pages mint a
 * signed URL to display it — there is no permanent public address any more.
 */
export async function setAvatar(path: string): Promise<AccountResult> {
  const profile = await requireProfile()

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: path })
    .eq("id", profile.id)

  if (error) return { error: "Uploaded, but couldn't save it to your profile." }
  revalidatePath("/", "layout")
  return { ok: "Photo updated" }
}
