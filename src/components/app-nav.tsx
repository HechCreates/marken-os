import Link from "next/link"
import { Bell, CircleUserRound, Settings } from "lucide-react"
import type { Profile } from "@/types/database"

/**
 * The functional layer. This is where glass belongs — HIG Liquid Glass:
 * a "distinct functional layer for controls and navigation elements… that
 * floats above the content layer", with content scrolling through beneath.
 *
 * Regular variant, not Clear: it blurs and lifts what's behind rather than
 * maximising transparency, because this bar carries text and controls.
 */
export function AppNav({
  profile,
  unread,
}: {
  profile: Profile
  unread: number
}) {
  const isAdmin = profile.role === "admin"

  return (
    <header
      className="sticky top-0 z-30 border-b border-glass-line bg-glass"
      style={{
        backdropFilter: "blur(var(--glass-blur)) saturate(160%)",
        WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(160%)",
      }}
    >
      {/* Hairline of light along the top edge — how a glass pane catches light */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "var(--glass-sheen)" }}
      />

      <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-4 px-6">
        <Link
          href="/"
          className="text-headline font-extrabold tracking-tight text-label"
        >
          Marken<span className="text-accent">OS</span>
        </Link>

        <nav className="flex items-center gap-0.5" aria-label="Account">
          <IconLink href="/notifications" label="Notifications" badge={unread}>
            <Bell size={19} strokeWidth={1.75} aria-hidden="true" />
          </IconLink>
          <IconLink href="/account" label="Your account">
            <CircleUserRound size={19} strokeWidth={1.75} aria-hidden="true" />
          </IconLink>
          {isAdmin && (
            <IconLink href="/settings" label="Settings">
              <Settings size={19} strokeWidth={1.75} aria-hidden="true" />
            </IconLink>
          )}
        </nav>
      </div>
    </header>
  )
}

/**
 * 36px hit area, past the 20pt desktop minimum, with spacing between so
 * adjacent icons can't be mis-clicked (HIG Accessibility > Mobility).
 */
function IconLink({
  href,
  label,
  badge,
  children,
}: {
  href: string
  label: string
  badge?: number
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-label={badge ? `${label}, ${badge} unread` : label}
      title={label}
      className="relative grid size-9 place-items-center rounded-control text-label-secondary transition-colors hover:bg-fill hover:text-label"
    >
      {children}
      {badge != null && badge > 0 && (
        <span
          className="absolute right-0.5 top-0.5 grid min-w-[17px] place-items-center rounded-pill bg-accent px-1 text-[10px] font-extrabold leading-[17px] text-on-accent"
          aria-hidden="true"
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  )
}
