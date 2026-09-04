import Link from "next/link"
import { ChevronLeft, TriangleAlert } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { AppNav } from "@/components/app-nav"
import { PeoplePanel } from "@/components/settings/people-panel"
import { ClientsPanel, type ClientRow } from "@/components/settings/clients-panel"
import { getUnreadCount } from "@/lib/queries"
import type { Profile } from "@/types/database"

const TABS = [
  { value: "people", label: "People" },
  { value: "clients", label: "Clients" },
] as const

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  // Admin only — and this is checked here rather than trusted from the fact
  // that the nav hides the gear for everyone else.
  const profile = await requireRole("admin")
  const { tab = "people" } = await searchParams
  const active = TABS.some((t) => t.value === tab) ? tab : "people"

  const supabase = await createClient()
  const [peopleRes, clientsRes, unread] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .order("role")
      .order("full_name"),
    supabase
      .from("clients")
      .select("id, name, projects(count)")
      .order("name"),
    getUnreadCount(),
  ])

  const people = (peopleRes.data ?? []) as Profile[]
  const clients: ClientRow[] = (clientsRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    // A client with live projects can't be deleted — projects.client_id is
    // ON DELETE RESTRICT — so surface the count that explains why.
    projectCount:
      (c.projects as unknown as { count: number }[])?.[0]?.count ?? 0,
  }))

  const userMgmtReady = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

  return (
    <div className="min-h-screen bg-page">
      <AppNav profile={profile} unread={unread} />

      <main className="mx-auto max-w-[1000px] px-6 py-8">
        <Link
          href="/admin"
          className="inline-flex h-9 items-center gap-1.5 rounded-control px-2.5 text-footnote font-medium text-label-secondary transition-colors hover:bg-fill hover:text-label"
        >
          <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
          Dashboard
        </Link>

        <header className="mt-4">
          <h1 className="text-large-title font-extrabold text-label">Settings</h1>
          <p className="mt-1 text-body text-label-secondary">
            Manage who works here and who they work for
          </p>
        </header>

        {!userMgmtReady && (
          <p className="mt-5 flex items-start gap-2.5 rounded-control bg-status-review-soft px-4 py-3 text-footnote text-status-review">
            <TriangleAlert size={16} strokeWidth={2.2} aria-hidden="true" className="mt-px shrink-0" />
            <span>
              <strong className="font-bold">Creating accounts is unavailable.</strong>{" "}
              Set <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> in
              your server environment — the publishable key can&rsquo;t create or
              delete auth users. Editing and deactivating work without it.
            </span>
          </p>
        )}

        <nav aria-label="Settings sections" className="mt-6 flex gap-2">
          {TABS.map((t) => {
            const on = t.value === active
            return (
              <Link
                key={t.value}
                href={`/settings?tab=${t.value}`}
                aria-current={on ? "page" : undefined}
                className={`inline-flex h-9 items-center rounded-pill border px-4 text-footnote font-semibold transition-colors ${
                  on
                    ? "border-accent bg-accent text-on-accent"
                    : "border-glass-line bg-glass text-label-secondary hover:border-accent-line hover:text-label"
                }`}
              >
                {t.label}
              </Link>
            )
          })}
        </nav>

        <section className="mt-6">
          {active === "people" ? (
            <PeoplePanel people={people} meId={profile.id} />
          ) : (
            <ClientsPanel clients={clients} />
          )}
        </section>
      </main>
    </div>
  )
}
