import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/proxy"

// Next 16 renamed the `middleware` convention to `proxy`.
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Everything except static assets and image optimisation. Note that
    // _next/data still runs through here by design, so a protected page's
    // data route cannot be fetched around the gate.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
}
