import { requireRole } from "@/lib/auth"
import { AppNav } from "@/components/app-nav"
import { StatCard, DomainCard } from "@/components/stat-card"
import { ActivityFeed } from "@/components/activity-feed"
import {
  getAdminStats,
  getDomainCounts,
  getRecentActivity,
  getUnreadCount,
} from "@/lib/queries"
import { DOMAIN_LABELS, DOMAINS } from "@/lib/constants"

export default async function AdminDashboard() {
  const profile = await requireRole("admin")

  const [stats, counts, activity, unread] = await Promise.all([
    getAdminStats(),
    getDomainCounts(),
    getRecentActivity(8),
    getUnreadCount(),
  ])

  const firstName = (profile.full_name ?? profile.username).split(" ")[0]

  return (
    <div className="min-h-screen bg-page">
      <AppNav profile={profile} unread={unread} />

      <main className="mx-auto max-w-[1100px] px-6 py-8">
        <h1 className="text-large-title font-extrabold text-label">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-body text-label-secondary">
          Everything across all domains
        </p>

        {/* Summary before detail. Overdue and pending are the two that need
            action, so both carry a tone; the other two stay neutral. */}
        <section aria-labelledby="overview" className="mt-6">
          <h2 id="overview" className="sr-only">
            Overview
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Active projects" value={stats.active} />
            <StatCard label="Overdue" value={stats.overdue} tone="alert" />
            <StatCard
              label="Pending approvals"
              value={stats.pending}
              tone="attention"
            />
            <StatCard label="Clients" value={stats.clients} />
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <section aria-labelledby="domains">
            <h2
              id="domains"
              className="mb-3 text-footnote font-semibold text-label-secondary"
            >
              Domains
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {DOMAINS.map((d) => (
                <DomainCard
                  key={d}
                  name={DOMAIN_LABELS[d]}
                  count={counts[d]}
                  href={`/d/${d}`}
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="activity">
            <h2
              id="activity"
              className="mb-3 text-footnote font-semibold text-label-secondary"
            >
              Recent activity
            </h2>
            <ActivityFeed items={activity} />
          </section>
        </div>
      </main>
    </div>
  )
}
