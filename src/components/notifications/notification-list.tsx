"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { CircleCheck, Undo2, ClipboardList, Bell, CheckCheck } from "lucide-react"
import { markRead, markAllRead } from "@/app/notifications/actions"
import type { NotificationRow } from "@/lib/queries"

const KIND = {
  project_assigned: {
    Icon: ClipboardList,
    tone: "bg-accent-soft text-accent",
  },
  project_approved: {
    Icon: CircleCheck,
    tone: "bg-status-approved-soft text-status-approved",
  },
  changes_requested: {
    Icon: Undo2,
    tone: "bg-status-changes-soft text-status-changes",
  },
} as const

export function NotificationList({ items }: { items: NotificationRow[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const unread = items.filter((n) => !n.is_read).length

  if (items.length === 0) {
    return (
      <div className="mt-6 rounded-card border border-separator bg-card px-6 py-16 text-center shadow-card">
        <Bell
          size={22}
          strokeWidth={1.8}
          aria-hidden="true"
          className="mx-auto mb-3 text-label-tertiary"
        />
        <p className="text-body font-semibold text-label">You&rsquo;re all caught up</p>
        <p className="mt-1 text-footnote text-label-secondary">
          Assignments, approvals and change requests land here.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-footnote text-label-secondary">
          {unread > 0 ? `${unread} unread` : "Nothing unread"}
        </p>
        {unread > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() => start(() => markAllRead())}
            className="inline-flex h-9 items-center gap-1.5 rounded-control border border-border-control px-3.5 text-footnote font-semibold text-label-secondary transition-colors hover:bg-fill hover:text-label disabled:opacity-50"
          >
            <CheckCheck size={15} strokeWidth={2.2} aria-hidden="true" />
            Mark all read
          </button>
        )}
      </div>

      <ul className="mt-4 divide-y divide-separator overflow-hidden rounded-card border border-separator bg-card shadow-card">
        {items.map((n) => {
          const kind = KIND[n.type as keyof typeof KIND] ?? {
            Icon: Bell,
            tone: "bg-fill-strong text-label-secondary",
          }
          const { Icon, tone } = kind

          return (
            <li key={n.id}>
              {/* A button, not a link: opening a notification also marks it
                  read, so it isn't a plain navigation. */}
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    if (!n.is_read) await markRead(n.id)
                    if (n.project_id) router.push(`/project/${n.project_id}`)
                  })
                }
                className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-fill ${
                  n.is_read ? "" : "bg-accent-soft/40"
                }`}
              >
                <span
                  className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${tone}`}
                  aria-hidden="true"
                >
                  <Icon size={15} strokeWidth={2.2} />
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-footnote leading-snug ${
                      n.is_read ? "text-label-secondary" : "font-semibold text-label"
                    }`}
                  >
                    {n.message}
                  </span>
                  <span className="mt-0.5 block text-caption text-label-tertiary">
                    {n.project_title ? `${n.project_title} · ` : ""}
                    {relative(n.created_at)}
                  </span>
                </span>

                {/* Unread is carried by weight and background as well as this
                    dot — never colour alone. */}
                {!n.is_read && (
                  <span
                    className="mt-2 size-2 shrink-0 rounded-full bg-accent"
                    aria-label="Unread"
                  />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function relative(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })
}
