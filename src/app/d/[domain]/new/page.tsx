import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { AppNav } from "@/components/app-nav"
import { NewProjectForm } from "@/components/project/new-project-form"
import { getUnreadCount } from "@/lib/queries"
import { DOMAINS, DOMAIN_LABELS } from "@/lib/constants"
import type { Domain } from "@/types/database"

export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ domain: string }>
}) {
  const { domain: raw } = await params
  if (!DOMAINS.includes(raw as Domain)) notFound()
  const domain = raw as Domain

  const profile = await requireProfile()

  // create_project re-checks all of this server-side; this is here so someone
  // who can't create anything never sees a form that will only reject them.
  const canCreate =
    profile.role === "admin" ||
    (profile.role === "head" && profile.domain === domain)
  if (!canCreate) redirect(`/d/${domain}`)

  const supabase = await createClient()
  const [clientsRes, peopleRes, unread] = await Promise.all([
    supabase.from("clients").select("id, name").order("name"),
    // Heads and employees both — a head can put themselves on a project.
    supabase
      .from("profiles")
      .select("id, full_name, username")
      .eq("domain", domain)
      .eq("is_active", true)
      .in("role", ["employee", "head"])
      .order("full_name"),
    getUnreadCount(),
  ])

  const assignees = (peopleRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.full_name ?? p.username,
    username: p.username,
  }))

  return (
    <div className="min-h-screen bg-page">
      <AppNav profile={profile} unread={unread} />

      <main className="mx-auto max-w-[720px] px-6 py-8">
        <Link
          href={`/d/${domain}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-control px-2.5 text-footnote font-medium text-label-secondary transition-colors hover:bg-fill hover:text-label"
        >
          <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
          {DOMAIN_LABELS[domain]}
        </Link>

        <header className="mt-4">
          <h1 className="text-large-title font-extrabold text-label">
            New project
          </h1>
          <p className="mt-1 text-body text-label-secondary">
            It starts as Assigned. Whoever you pick gets a notification.
          </p>
        </header>

        <NewProjectForm
          domain={domain}
          clients={clientsRes.data ?? []}
          assignees={assignees}
        />
      </main>
    </div>
  )
}
