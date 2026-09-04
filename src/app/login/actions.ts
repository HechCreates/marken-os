"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { usernameToEmail } from "@/lib/constants"

export type LoginState = { error?: string }

/**
 * Sign in with a username. Supabase Auth works in email addresses, so the
 * username is mapped to a synthetic one that mirrors public.username_to_email().
 *
 * Note what is NOT here: no password comparison. Supabase verifies the bcrypt
 * hash server-side. The old build fetched the user row and compared
 * `data.password !== password` in the browser.
 */
export async function signIn(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const next = String(formData.get("next") ?? "")

  if (!username || !password) {
    return { error: "Enter both a username and a password." }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  })

  if (error || !data.user) {
    // Deliberately vague: saying which half was wrong tells an attacker
    // whether a username exists.
    return { error: "That username and password don't match." }
  }

  // ── Clock in ──
  // Best-effort: a failure here must never block the login. The partial unique
  // index on attendance(user_id) WHERE clock_out IS NULL means a second open
  // session is rejected by the database, so this is safe to attempt blindly.
  try {
    const { data: open } = await supabase
      .from("attendance")
      .select("id")
      .is("clock_out", null)
      .limit(1)

    if (!open || open.length === 0) {
      await supabase.from("attendance").insert({
        user_id: data.user.id,
        clock_in: new Date().toISOString(),
        date: new Date().toISOString().split("T")[0],
      })
    }
  } catch {
    // Non-fatal.
  }

  revalidatePath("/", "layout")
  redirect(next && next.startsWith("/") ? next : "/")
}

export async function signOut() {
  const supabase = await createClient()

  // ── Clock out ──
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: open } = await supabase
      .from("attendance")
      .select("id")
      .is("clock_out", null)
      .limit(1)

    if (open && open.length > 0) {
      await supabase
        .from("attendance")
        .update({ clock_out: new Date().toISOString() })
        .eq("id", open[0].id)
    }
  }

  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}
