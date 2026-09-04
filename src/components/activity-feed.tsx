import { Check, ArrowUp, MessageSquare } from "lucide-react"
import type { ActivityItem } from "@/lib/queries"

/**
 * Content layer — solid card. Each entry gets a glyph keyed to its kind so the
 * column is scannable without reading every line, and timestamps carry the
 * absolute time in `title` for anyone who needs precision.
 */
export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-card border border-separator bg-card px-5 py-8 text-center shadow-card">
        <p className="text-footnote text-label-secondary">No activity yet</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-separator overflow-hidden rounded-card border border-separator bg-card shadow-card">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3 px-4 py-3">
          <ActivityGlyph kind={item.kind} />
          <div className="min-w-0 flex-1">
            <p className="text-footnote leading-snug text-label">{item.text}</p>
            <time
              dateTime={item.at}
              title={new Date(item.at).toLocaleString()}
              className="mt-0.5 block text-caption text-label-tertiary"
            >
              {relative(item.at)}
            </time>
          </div>
        </li>
      ))}
    </ul>
  )
}

function ActivityGlyph({ kind }: { kind: ActivityItem["kind"] }) {
  const map = {
    approval: {
      tone: "bg-status-approved-soft text-status-approved",
      Icon: Check,
    },
    submission: {
      tone: "bg-accent-soft text-accent",
      Icon: ArrowUp,
    },
    comment: {
      tone: "bg-fill-strong text-label-secondary",
      Icon: MessageSquare,
    },
  } as const
  const { tone, Icon } = map[kind]

  return (
    <span
      className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${tone}`}
      aria-hidden="true"
    >
      <Icon size={13} strokeWidth={2.6} />
    </span>
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
