import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronLeft, Plus } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { AppNav } from "@/components/app-nav"
import { StatCard } from "@/components/stat-card"
import { ProjectList, FilterChips } from "@/components/project-list"
import { getProjects, getDomainStats, getUnreadCount } from "@/lib/queries"
import {
  DOMAINS,
  DOMAIN_LABELS,
  EMPLOYEE_STATUS_LABELS,
  STATUS_LABELS,
} from "@/lib/constants"
import type { Domain, ProjectStatus } from "@/types/database"

export default async function DomainDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string }>
  searchParams: Promise<{ status?: string }>
}) {
  const { domain: raw } = await params
  const { status: filter = "all" } = await searchParams

  if (!DOMAINS.includes(raw as Domain)) notFound()
  const domain = raw as Domain

  const profile = await requireProfile()

  // RLS would already return nothing for another domain, but an empty page is
  // a confusing answer to "why can't I see this?" — send them somewhere useful.
  if (profile.role !== "admin" && profile.domain !== domain) {
    redirect(profile.domain ? `/d/${profile.domain}` : "/")
  }

  const isEmployee = profile.role === "employee"
  const canCreate = profile.role === "admin" || profile.role === "head"

  const [projects, stats, unread] = await Promise.all([
    getProjects(domain),
    getDomainStats(domain),
    getUnreadCount(),
  ])

  const visible =
    filter === "all" ? projects : projects.filter((p) => p.status === filter)

  const countOf = (s: ProjectStatus) =>
    projects.filter((p) => p.status === s).length

  const firstName = (profile.full_name ?? profile.username).split(" ")[0]

  return (
    <div className="min-h-screen bg-page">
      <AppNav profile={profile} unread={unread} />

      <main className="mx-auto max-w-[1100px] px-6 py-8">
        {/* Admins arrive here from the domain grid, so give them the way back */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {profile.role === "admin" ? (
            <Link
              href="/admin"
              className="inline-flex h-9 items-center gap-1.5 rounded-control px-2.5 text-footnote font-medium text-label-secondary transition-colors hover:bg-fill hover:text-label"
            >
              <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
              All domains
            </Link>
          ) : (
            <span />
          )}

          {canCreate && (
            <Link
              href={`/d/${domain}/new`}
              className="inline-flex h-9 items-center gap-1.5 rounded-control bg-accent px-4 text-footnote font-bold text-on-accent transition-opacity hover:opacity-90"
            >
              <Plus size={15} strokeWidth={2.6} aria-hidden="true" />
              New project
            </Link>
          )}
        </div>

        <header className="mt-4">
          <h1 className="text-large-title font-extrabold text-label">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-body text-label-secondary">
            {DOMAIN_LABELS[domain]}
            {isEmployee && " · Your assigned work"}
          </p>
        </header>

        {/* Employees get their own four cards, in their own vocabulary — the
            pipeline as it affects them, not the domain's aggregate health. */}
        <section aria-labelledby="stats" className="mt-6">
          <h2 id="stats" className="sr-only">
            Overview
          </h2>
          {isEmployee ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label={EMPLOYEE_STATUS_LABELS.assigned}
                value={countOf("assigned")}
                href={`/d/${domain}?status=assigned`}
              />
              <StatCard
                label={EMPLOYEE_STATUS_LABELS.in_review}
                value={countOf("in_review")}
                href={`/d/${domain}?status=in_review`}
              />
              <StatCard
                label={EMPLOYEE_STATUS_LABELS.changes_requested}
                value={countOf("changes_requested")}
                tone="alert"
                href={`/d/${domain}?status=changes_requested`}
              />
              <StatCard
                label={EMPLOYEE_STATUS_LABELS.approved}
                value={countOf("approved")}
                href={`/d/${domain}?status=approved`}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Active projects" value={stats.active} />
              <StatCard
                label="In review"
                value={stats.inReview}
                tone="attention"
              />
              <StatCard label="Overdue" value={stats.overdue} tone="alert" />
              <StatCard label="Due this month" value={stats.dueThisMonth} />
            </div>
          )}
        </section>

        {/* Heads filter the whole domain; employees already have the stat cards
            acting as filters, so the chip row would be redundant for them. */}
        {!isEmployee && (
          <div className="mt-7">
            <FilterChips
              base={`/d/${domain}`}
              active={filter}
              options={[
                { value: "all", label: "All", count: projects.length },
                {
                  value: "assigned",
                  label: STATUS_LABELS.assigned,
                  count: countOf("assigned"),
                },
                {
                  value: "in_progress",
                  label: STATUS_LABELS.in_progress,
                  count: countOf("in_progress"),
                },
                {
                  value: "in_review",
                  label: STATUS_LABELS.in_review,
                  count: countOf("in_review"),
                },
                {
                  value: "approved",
                  label: STATUS_LABELS.approved,
                  count: countOf("approved"),
                },
              ]}
            />
          </div>
        )}

        <section aria-labelledby="projects" className="mt-6">
          <h2 id="projects" className="sr-only">
            Projects
          </h2>
          <ProjectList
            projects={visible}
            statusLabels={isEmployee ? EMPLOYEE_STATUS_LABELS : undefined}
            emptyTitle={
              filter === "all"
                ? isEmployee
                  ? "Nothing assigned to you yet"
                  : "No projects in this domain yet"
                : "Nothing in this state"
            }
            emptyBody={
              filter === "all"
                ? isEmployee
                  ? "Work assigned to you will appear here."
                  : "Create a project to get started."
                : "Try a different filter."
            }
          />
        </section>
      </main>
    </div>
  )
}
