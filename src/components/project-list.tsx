import Link from "next/link"
import { CalendarClock, Users } from "lucide-react"
import { StatusPill, PriorityTag } from "@/components/status-pill"
import { DOMAIN_SHORT } from "@/lib/constants"
import type { ProjectRow } from "@/lib/queries"
import type { Priority, ProjectStatus } from "@/types/database"

export function ProjectList({
  projects,
  showDomain = false,
  statusLabels,
  emptyTitle = "No projects here",
  emptyBody = "Projects will appear here once they're assigned.",
}: {
  projects: ProjectRow[]
  showDomain?: boolean
  /** Employees see their own vocabulary — "Rework", "Sent for approval" */
  statusLabels?: Record<ProjectStatus, string>
  emptyTitle?: string
  emptyBody?: string
}) {
  if (projects.length === 0) {
    return (
      <div className="rounded-card border border-separator bg-card px-6 py-14 text-center shadow-card">
        <p className="text-body font-semibold text-label">{emptyTitle}</p>
        <p className="mt-1 text-footnote text-label-secondary">{emptyBody}</p>
      </div>
    )
  }

  const today = new Date().toISOString().split("T")[0]

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {projects.map((p) => {
        const status = (p.status ?? "assigned") as ProjectStatus
        const overdue = p.due_date && p.due_date < today && status !== "approved"

        return (
          <li key={p.id}>
            {/* Content layer: solid card. The accent appears only as the status
                rail, so it stays an emphasis signal rather than decoration. */}
            <Link
              href={`/project/${p.id}`}
              className="group relative flex h-full flex-col overflow-hidden rounded-card border border-separator bg-card p-4 shadow-card transition-colors hover:border-accent-line hover:bg-fill"
            >
              <div className="flex items-start justify-between gap-3">
                <StatusPill status={status} label={statusLabels?.[status]} />
                <PriorityTag priority={(p.priority ?? "normal") as Priority} />
              </div>

              {p.client && (
                <p className="mt-3 text-caption font-semibold uppercase tracking-wide text-label-tertiary">
                  {p.client}
                </p>
              )}
              <p className="mt-1 text-headline font-bold leading-snug text-label">
                {p.title}
              </p>

              {/* Pushed to the bottom so cards in a row align on their footer
                  however long the titles run */}
              <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-4 text-caption text-label-secondary">
                {showDomain && p.domain && (
                  <span className="rounded-pill bg-fill-strong px-2 py-0.5 font-medium">
                    {DOMAIN_SHORT[p.domain]}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 ${
                    overdue ? "font-bold text-status-changes" : ""
                  }`}
                >
                  <CalendarClock size={12} strokeWidth={2} aria-hidden="true" />
                  {p.due_date
                    ? `${overdue ? "Overdue" : "Due"} ${new Date(
                        p.due_date
                      ).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}`
                    : "No due date"}
                </span>
                {p.members.length > 0 && (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <Users size={12} strokeWidth={2} aria-hidden="true" />
                    <span className="truncate">{p.members.join(", ")}</span>
                  </span>
                )}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Filter chips sit on the functional layer, so they take the glass treatment.
 * They are links, not buttons — the active filter lives in the URL, so a
 * filtered view can be shared, bookmarked and restored on back.
 */
export function FilterChips({
  base,
  active,
  options,
}: {
  base: string
  active: string
  options: { value: string; label: string; count?: number }[]
}) {
  return (
    <nav aria-label="Filter projects" className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === active
        return (
          <Link
            key={o.value}
            href={o.value === "all" ? base : `${base}?status=${o.value}`}
            aria-current={on ? "page" : undefined}
            className={`inline-flex h-9 items-center gap-1.5 rounded-pill border px-3.5 text-footnote font-semibold transition-colors ${
              on
                ? "border-accent bg-accent text-on-accent"
                : "border-glass-line bg-glass text-label-secondary hover:border-accent-line hover:text-label"
            }`}
            style={
              on
                ? undefined
                : {
                    backdropFilter: "blur(var(--glass-blur)) saturate(160%)",
                    WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(160%)",
                  }
            }
          >
            {o.label}
            {o.count != null && (
              <span
                className={`tabular-nums ${on ? "opacity-70" : "text-label-tertiary"}`}
              >
                {o.count}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
