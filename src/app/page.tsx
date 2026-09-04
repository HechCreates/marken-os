import { redirect } from "next/navigation"
import { requireProfile } from "@/lib/auth"
import { homePathFor } from "@/lib/constants"

/**
 * There is no generic dashboard — where "home" lands depends on who you are.
 * Admins oversee every domain, heads and employees land in their own.
 */
export default async function RootPage() {
  const profile = await requireProfile()
  redirect(homePathFor(profile.role, profile.domain))
}
