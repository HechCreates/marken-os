import Link from "next/link"
import { ChevronRight } from "lucide-react"

/**
 * Content layer — solid, not glass. HIG Liquid Glass is explicit that the
 * content layer stays opaque so the functional layer above it reads as the
 * thing that floats.
 */
export function StatCard({
  label,
  value,
  tone,
  href,
}: {
  label: string
  value: number
  tone?: "alert" | "attention" | "brand"
  href?: string
}) {
  const live = value > 0
  const valueTone =
    tone === "alert" && live
      ? "text-status-changes"
      : tone === "attention" && live
        ? "text-status-review"
        : tone === "brand"
          ? "text-accent"
          : "text-label"

  const body = (
    <>
      <span className="text-footnote font-medium text-label-secondary">
        {label}
      </span>
      <span
        className={`mt-1.5 text-title1 font-extrabold tabular-nums ${valueTone}`}
      >
        {value}
      </span>
    </>
  )

  const shell =
    "flex flex-col rounded-card border border-separator bg-card px-4 py-3.5 shadow-card transition-colors"

  return href ? (
    <Link href={href} className={`${shell} hover:bg-fill`}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  )
}

/**
 * A domain tile. The name leads and the count follows — here you're choosing
 * where to go, not reading a metric, which inverts StatCard's hierarchy.
 */
export function DomainCard({
  name,
  count,
  href,
}: {
  name: string
  count: number
  href: string
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-card border border-separator bg-card px-5 py-4 shadow-card transition-colors hover:border-accent-line hover:bg-fill"
    >
      {/* Brand edge, lit on hover — the accent used as emphasis rather than
          decoration, per HIG's rule to apply colour sparingly */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[3px] bg-accent opacity-0 transition-opacity group-hover:opacity-100"
      />
      <div className="min-w-0">
        <p className="truncate text-headline font-bold text-label">{name}</p>
        <p className="mt-0.5 text-footnote text-label-secondary">
          <span className="font-semibold text-accent tabular-nums">{count}</span>{" "}
          active {count === 1 ? "project" : "projects"}
        </p>
      </div>
      <ChevronRight
        size={18}
        strokeWidth={2}
        aria-hidden="true"
        className="shrink-0 text-label-tertiary transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  )
}
