import "server-only"

import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

/**
 * Service-role client. This key bypasses EVERY RLS policy in migration 0005,
 * so it exists for exactly one reason: creating and deleting auth users, which
 * the publishable key cannot do.
 *
 * Three guards around it:
 *   1. `import "server-only"` — the build fails if this file is ever pulled
 *      into a client bundle, rather than shipping the key to a browser.
 *   2. No NEXT_PUBLIC_ prefix, so Next will not inline it.
 *   3. Every caller re-checks requireRole("admin") first.
 *
 * Use the request-scoped client from ./server for everything else. If a query
 * can go through RLS, it should.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export const ADMIN_NOT_CONFIGURED =
  "User management needs SUPABASE_SERVICE_ROLE_KEY set on the server. Everything else on this page works without it."
