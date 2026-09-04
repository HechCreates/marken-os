import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { Profile, Role } from "@/types/database"

/**
 * The signed-in user's profile, or a redirect to /login.
 *
 * Called by every protected page and Server Action. proxy.ts already redirects
 * unauthenticated requests, but Next's own docs warn that Server Functions can
 * fall outside proxy coverage after a refactor — so authorization is checked
 * here too rather than assumed. RLS is the third layer underneath both.
 */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error || !profile) {
    // Authenticated but no profile row — the on_auth_user_created trigger
    // didn't fire. Signing out avoids a redirect loop against the proxy.
    await supabase.auth.signOut()
    redirect("/login?error=no-profile")
  }

  if (!profile.is_active) {
    await supabase.auth.signOut()
    redirect("/login?error=deactivated")
  }

  return profile as Profile
}

/** Same, but refuses anyone outside `roles`. */
export async function requireRole(...roles: Role[]): Promise<Profile> {
  const profile = await requireProfile()
  if (!roles.includes(profile.role)) redirect("/")
  return profile
}
