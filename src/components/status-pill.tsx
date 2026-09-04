import {
  Square,
  CircleDot,
  Clock,
  CircleCheck,
  TriangleAlert,
  ChevronUp,
  ChevronsUp,
} from "lucide-react"
import type { Priority, ProjectStatus } from "@/types/database"
import { STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants"

/**
 * Status carries three signals: colour, a distinct icon shape, and the written
 * label. HIG Accessibility: "Convey information with more than color alone…
 * Offer visual indicators, like distinct shapes or icons."
 *
 * The shapes are deliberately unalike — square, dotted circle, clock, tick,
 * triangle — because in-review orange and changes-requested red are a common
 * confusion pair for red-green colour blindness.
 */
const STATUS_STYLE: Record<
  ProjectStatus,
  { text: string; fill: string; Icon: typeof Square }
> = {
  assigned: {
    text: "text-status-assigned",
    fill: "bg-status-assigned-soft",
    Icon: Square,
  },
  in_progress: {
    text: "text-status-progress",
    fill: "bg-status-progress-soft",
    Icon: CircleDot,
  },
  in_review: {
    text: "text-status-review",
    fill: "bg-status-review-soft",
    Icon: Clock,
  },
  approved: {
    text: "text-status-approved",
    fill: "bg-status-approved-soft",
    Icon: CircleCheck,
  },
  changes_requested: {
    text: "text-status-changes",
    fill: "bg-status-changes-soft",
    Icon: TriangleAlert,
  },
}

export function StatusPill({
  status,
  label,
}: {
  status: ProjectStatus
  /** Override the wording — employees see "Rework", heads see the raw state */
  label?: string
}) {
  const { text, fill, Icon } = STATUS_STYLE[status]
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-1 text-caption font-bold ${fill} ${text}`}
    >
      <Icon size={12} strokeWidth={2.4} aria-hidden="true" />
      {label ?? STATUS_LABELS[status]}
    </span>
  )
}

/**
 * Priority stays quiet — it is secondary to status, and "normal" renders as
 * nothing rather than as a badge on every single row.
 */
export function PriorityTag({ priority }: { priority: Priority }) {
  if (priority === "normal") return null
  const urgent = priority === "urgent"
  const Icon = urgent ? ChevronsUp : ChevronUp
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 text-caption font-semibold ${
        urgent ? "text-status-changes" : "text-status-review"
      }`}
    >
      <Icon size={13} strokeWidth={2.6} aria-hidden="true" />
      {PRIORITY_LABELS[priority]}
    </span>
  )
}
