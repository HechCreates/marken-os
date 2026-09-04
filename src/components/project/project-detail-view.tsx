import Link from "next/link"
import {
  ChevronLeft,
  CalendarClock,
  Paperclip,
  Link2,
  ExternalLink,
  Download,
  Crown,
} from "lucide-react"
import { StatusPill, PriorityTag } from "@/components/status-pill"
import { ProjectActions } from "@/components/project/project-actions"
import { CommentForm } from "@/components/project/comment-form"
import { SubmitWork } from "@/components/project/submit-work"
import { DOMAIN_LABELS, EMPLOYEE_STATUS_LABELS } from "@/lib/constants"
import type { ProjectDetail, SubmissionRow } from "@/lib/queries"
import type { Profile } from "@/types/database"

/**
 * Presentational. Takes everything it needs as props so the route stays a thin
 * data-fetching shell — which also makes this screen renderable in isolation,
 * the only way to check it without a live session.
 */
export function ProjectDetailView({
  project,
  profile,
  backHref,
}: {
  project: ProjectDetail
  profile: Profile
  backHref: string
}) {
  const isMember = project.members.some((m) => m.user_id === profile.id)
  const isEmployee = profile.role === "employee"
  const today = new Date().toISOString().split("T")[0]
  const overdue =
    project.due_date && project.due_date < today && project.status !== "approved"

  const byMember = new Map<string, SubmissionRow[]>()
  for (const s of project.submissions) {
    const list = byMember.get(s.submitted_by) ?? []
    list.push(s)
    byMember.set(s.submitted_by, list)
  }

  const conversation = project.comments.filter((c) => !c.is_system).length

  return (
    <main className="mx-auto max-w-[880px] px-6 py-8">
      <Link
        href={backHref}
        className="inline-flex h-9 items-center gap-1.5 rounded-control px-2.5 text-footnote font-medium text-label-secondary transition-colors hover:bg-fill hover:text-label"
      >
        <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
        {project.domain ? DOMAIN_LABELS[project.domain] : "Back"}
      </Link>

      {/* ── Header ── */}
      <header className="mt-4">
        {project.client && (
          <p className="text-caption font-bold uppercase tracking-wide text-label-tertiary">
            {project.client}
          </p>
        )}
        <h1 className="mt-1.5 text-large-title font-extrabold leading-tight text-label">
          {project.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusPill
            status={project.status}
            label={isEmployee ? EMPLOYEE_STATUS_LABELS[project.status] : undefined}
          />
          <PriorityTag priority={project.priority} />
          <span
            className={`inline-flex items-center gap-1.5 rounded-pill bg-fill-strong px-2.5 py-1 text-caption font-semibold ${
              overdue ? "text-status-changes" : "text-label-secondary"
            }`}
          >
            <CalendarClock size={12} strokeWidth={2.2} aria-hidden="true" />
            {project.due_date
              ? `${overdue ? "Overdue" : "Due"} ${new Date(
                  project.due_date
                ).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}`
              : "No due date"}
          </span>
        </div>

        {project.members.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {project.members.map((m) => (
              <li
                key={m.user_id}
                className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 text-caption font-semibold ${
                  m.role_in_project === "lead"
                    ? "border-accent-line bg-accent-soft text-accent"
                    : "border-separator bg-fill text-label-secondary"
                }`}
              >
                {m.role_in_project === "lead" && (
                  <Crown size={11} strokeWidth={2.4} aria-hidden="true" />
                )}
                {m.name}
                {m.user_id === profile.id && (
                  <span className="font-normal opacity-60">(you)</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </header>

      {/* ── Brief ── */}
      <Section title="Brief">
        {project.brief ? (
          <p className="whitespace-pre-wrap text-body leading-relaxed text-label-secondary">
            {project.brief}
          </p>
        ) : (
          <p className="text-body text-label-tertiary">No brief written yet.</p>
        )}

        {project.brief_links.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1.5">
            {project.brief_links.map((l) => (
              <li key={l}>
                <a
                  href={l}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1.5 text-footnote font-semibold text-accent hover:underline"
                >
                  <Link2 size={13} strokeWidth={2.2} aria-hidden="true" className="shrink-0" />
                  <span className="truncate">{l}</span>
                  <ExternalLink size={11} strokeWidth={2.2} aria-hidden="true" className="shrink-0 opacity-60" />
                </a>
              </li>
            ))}
          </ul>
        )}

        {project.brief_files.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {project.brief_files.map((f) => (
              <li key={f.name}>
                <a
                  href={f.href ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!f.href}
                  className="inline-flex items-center gap-2 rounded-control border border-border-control px-3 py-2 text-footnote font-medium text-label-secondary transition-colors hover:border-accent-line hover:text-label aria-disabled:pointer-events-none aria-disabled:opacity-50"
                >
                  <Paperclip size={13} strokeWidth={2.2} aria-hidden="true" />
                  {f.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* ── Actions ── */}
      <Section title="Actions">
        <ProjectActions
          projectId={project.id}
          status={project.status}
          role={profile.role}
          isMember={isMember}
        />
      </Section>

      {/* ── Submissions ── */}
      <Section title="Submissions">
        {project.members.length === 0 ? (
          <p className="text-body text-label-tertiary">
            Nobody is assigned to this project yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {project.members.map((m) => {
              const versions = byMember.get(m.user_id) ?? []
              const isMe = m.user_id === profile.id
              return (
                <div
                  key={m.user_id}
                  className={`rounded-control border p-4 ${
                    isMe ? "border-accent-line bg-accent-soft" : "border-separator bg-fill"
                  }`}
                >
                  <p className="text-footnote font-bold text-label">
                    {m.name}
                    <span className="ml-2 font-medium text-label-tertiary">
                      {m.role_in_project === "lead" ? "Lead" : "Support"}
                    </span>
                  </p>

                  {versions.length === 0 ? (
                    <p className="mt-2 text-footnote text-label-tertiary">
                      Nothing submitted yet
                    </p>
                  ) : (
                    <ul className="mt-3 flex flex-col gap-1.5">
                      {versions.map((v, i) => {
                        const latest = i === versions.length - 1
                        return (
                          <li
                            key={v.id}
                            className={`flex flex-wrap items-center justify-between gap-2 rounded-control px-3 py-2 ${
                              latest ? "bg-fill-strong" : "bg-fill"
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${
                                  latest
                                    ? "bg-accent text-on-accent"
                                    : "bg-fill-strong text-label-tertiary"
                                }`}
                              >
                                v{v.version}
                              </span>
                              {v.is_link ? (
                                <Link2 size={13} strokeWidth={2.2} aria-hidden="true" className="shrink-0 text-label-tertiary" />
                              ) : (
                                <Paperclip size={13} strokeWidth={2.2} aria-hidden="true" className="shrink-0 text-label-tertiary" />
                              )}
                              <span className="truncate text-footnote text-label">
                                {v.file_name ?? "File"}
                              </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-3">
                              <time
                                dateTime={v.created_at}
                                className="text-caption text-label-tertiary"
                              >
                                {new Date(v.created_at).toLocaleDateString(undefined, {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </time>
                              {v.href && (
                                <a
                                  href={v.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-caption font-bold text-accent hover:underline"
                                >
                                  {v.is_link ? (
                                    <ExternalLink size={12} strokeWidth={2.4} aria-hidden="true" />
                                  ) : (
                                    <Download size={12} strokeWidth={2.4} aria-hidden="true" />
                                  )}
                                  Open
                                </a>
                              )}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  {isMe && project.status !== "approved" && (
                    <SubmitWork projectId={project.id} userId={profile.id} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* ── Comments ── */}
      <Section title={`Comments (${conversation})`}>
        {project.comments.length === 0 ? (
          <p className="text-body text-label-tertiary">
            No comments yet. Start the conversation.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {project.comments.map((c) =>
              c.is_system ? (
                // System entries are the audit trail, not conversation —
                // quieter, centred, visually a different kind of thing.
                <li
                  key={c.id}
                  className="flex items-center gap-2 text-caption text-label-tertiary"
                >
                  <span className="h-px flex-1 bg-separator" aria-hidden="true" />
                  <span className="text-center">
                    {c.author} · {c.message} ·{" "}
                    {new Date(c.created_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="h-px flex-1 bg-separator" aria-hidden="true" />
                </li>
              ) : (
                <li key={c.id} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-caption font-extrabold uppercase text-accent"
                  >
                    {c.author.slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline gap-2">
                      <span className="text-footnote font-bold text-label">
                        {c.author}
                      </span>
                      <time
                        dateTime={c.created_at}
                        title={new Date(c.created_at).toLocaleString()}
                        className="text-caption text-label-tertiary"
                      >
                        {new Date(c.created_at).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })}
                      </time>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap rounded-control rounded-tl-none bg-fill px-3.5 py-2.5 text-body leading-relaxed text-label-secondary">
                      {c.message}
                    </p>
                  </div>
                </li>
              )
            )}
          </ul>
        )}

        <CommentForm projectId={project.id} />
      </Section>
    </main>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-4 rounded-card border border-separator bg-card p-5 shadow-card">
      <h2 className="mb-4 text-caption font-bold uppercase tracking-wide text-label-tertiary">
        {title}
      </h2>
      {children}
    </section>
  )
}
