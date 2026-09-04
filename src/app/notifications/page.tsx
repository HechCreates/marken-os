import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { AppNav } from "@/components/app-nav"
import { NotificationList } from "@/components/notifications/notification-list"
import { getNotifications, getUnreadCount } from "@/lib/queries"
import { homePathFor } from "@/lib/constants"

export default async function NotificationsPage() {
  const profile = await requireProfile()
  const [items, unread] = await Promise.all([
    getNotifications(50),
    getUnreadCount(),
  ])

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

        <h1 className="mt-4 text-large-title font-extrabold text-label">
          Notifications
        </h1>

        <NotificationList items={items} />
      </main>
    </div>
  )
}
