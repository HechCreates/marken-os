import { notFound } from "next/navigation"
import { requireProfile } from "@/lib/auth"
import { AppNav } from "@/components/app-nav"
import { ProjectDetailView } from "@/components/project/project-detail-view"
import { getProject, getUnreadCount } from "@/lib/queries"
import { homePathFor } from "@/lib/constants"

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: raw } = await params
  const id = Number(raw)
  if (!Number.isInteger(id) || id < 1) notFound()

  const profile = await requireProfile()
  const [project, unread] = await Promise.all([getProject(id), getUnreadCount()])

  // RLS hiding the row and the project not existing look identical from out
  // here, deliberately — a 404 leaks less than a 403.
  if (!project) notFound()

  const back = project.domain
    ? `/d/${project.domain}`
    : homePathFor(profile.role, profile.domain)

  return (
    <div className="min-h-screen bg-page">
      <AppNav profile={profile} unread={unread} />
      <ProjectDetailView project={project} profile={profile} backHref={back} />
    </div>
  )
}
