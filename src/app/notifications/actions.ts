"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/auth"

/**
 * notifications_update in migration 0005 restricts both the USING and the
 * WITH CHECK to for_user = auth.uid(), so neither of these needs an ownership
 * filter — passing someone else's id simply matches nothing.
 */

export async function markRead(id: number) {
  await requireProfile()
  const supabase = await createClient()
  await supabase.from("notifications").update({ is_read: true }).eq("id", id)
  revalidatePath("/notifications")
  revalidatePath("/", "layout") // the nav badge lives on every page
}

export async function markAllRead() {
  await requireProfile()
  const supabase = await createClient()
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false)
  revalidatePath("/notifications")
  revalidatePath("/", "layout")
}
