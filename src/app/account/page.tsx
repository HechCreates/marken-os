import Link from "next/link"
import { ChevronLeft, Clock } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { AppNav } from "@/components/app-nav"
import { ProfilePanel, PasswordPanel } from "@/components/account/account-panels"
import { getAccountStats, getUnreadCount } from "@/lib/queries"
import { DOMAIN_LABELS, ROLE_LABELS, homePathFor } from "@/lib/constants"
import type { Domain } from "@/types/database"

export default async function AccountPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  const [stats, unread] = await Promise.all([
    getAccountStats(profile.id),
    getUnreadCount(),
  ])

  // avatar_url holds a storage path, not a URL — the bucket went private in
  // migration 0003, so it has to be signed for each view.
  let avatarUrl: string | null = null
  if (profile.avatar_url) {
    const { data } = await supabase.storage
      .from("avatars")
      .createSignedUrl(profile.avatar_url, 3600)
    avatarUrl = data?.signedUrl ?? null
  }

  return (
    <div className="min-h-screen bg-page">
      <AppNav profile={profile} unread={unread} />

      <main className="mx-auto max-w-[720px] px-6 py-8">
        <Link
          href={homePathFor(profile.role, profile.domain)}
          className="inline-flex h-9 items-center gap-1.5 rounded-control px-2.5 text-footnote font-medium text-label-secondary transition-colors hover:bg-fill hover:text-label"
        >
          <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
          Dashboard
        </Link>

        <header className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-large-title font-extrabold text-label">Account</h1>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-pill bg-fill-strong px-3 py-1 text-caption font-bold text-label-secondary">
              {ROLE_LABELS[profile.role]}
            </span>
            <span className="rounded-pill border border-accent-line bg-accent-soft px-3 py-1 text-caption font-bold text-accent">
              {profile.domain ? DOMAIN_LABELS[profile.domain as Domain] : "All domains"}
            </span>
          </div>
        </header>

        {stats.clockedInAt && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-pill bg-status-approved-soft px-3.5 py-1.5 text-footnote font-semibold text-status-approved">
            <Clock size={14} strokeWidth={2.2} aria-hidden="true" />
            Clocked in since{" "}
            {new Date(stats.clockedInAt).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Projects" value={String(stats.projects)} />
          <Stat label="Submissions" value={String(stats.submissions)} />
          <Stat label="Comments" value={String(stats.comments)} />
          <Stat label="This week" value={stats.hoursThisWeek} />
        </dl>

        <div className="mt-4 flex flex-col gap-4">
          <ProfilePanel profile={profile} avatarUrl={avatarUrl} />
          <PasswordPanel />
        </div>
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-separator bg-card px-4 py-3.5 shadow-card">
      <dt className="text-caption font-medium text-label-secondary">{label}</dt>
      <dd className="mt-1.5 text-title2 font-extrabold tabular-nums text-label">
        {value}
      </dd>
    </div>
  )
}
