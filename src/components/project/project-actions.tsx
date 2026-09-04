"use client"

import { useRef, useState, useTransition } from "react"
import {
  Play,
  Send,
  Check,
  Undo2,
  CircleAlert,
  LoaderCircle,
  Hourglass,
} from "lucide-react"
import {
  startProject,
  submitForReview,
  approveProject,
  requestChanges,
  type ActionState,
} from "@/app/project/[id]/actions"
import type { ProjectStatus, Role } from "@/types/database"

/**
 * What you can do here depends on who you are and where the project has got
 * to. Nothing in this component is a security boundary — the RPCs behind it
 * re-check both, so a tampered client gets a Postgres exception, not a
 * transition.
 */
export function ProjectActions({
  projectId,
  status,
  role,
  isMember,
}: {
  projectId: number
  status: ProjectStatus
  role: Role
  isMember: boolean
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string>()
  const dialog = useRef<HTMLDialogElement>(null)
  const [note, setNote] = useState("")

  const run = (fn: () => Promise<ActionState>) => {
    setError(undefined)
    start(async () => {
      const res = await fn()
      if (res.error) setError(res.error)
    })
  }

  const isManager = role === "admin" || role === "head"

  let controls: React.ReactNode = null
  let hint: string | null = null

  if (status === "approved") {
    controls = (
      <p className="inline-flex items-center gap-2 text-body font-semibold text-status-approved">
        <Check size={17} strokeWidth={2.6} aria-hidden="true" />
        This project has been approved
      </p>
    )
  } else if (isMember && !isManager) {
    if (status === "assigned" || status === "changes_requested") {
      controls = (
        <Button onClick={() => run(() => startProject(projectId))} pending={pending}>
          <Play size={15} strokeWidth={2.4} aria-hidden="true" />
          {status === "assigned" ? "Start project" : "Resume work"}
        </Button>
      )
      hint =
        status === "assigned"
          ? "Mark this as in progress to begin."
          : "Pick the work back up after the review notes below."
    } else if (status === "in_progress") {
      controls = (
        <Button onClick={() => run(() => submitForReview(projectId))} pending={pending}>
          <Send size={15} strokeWidth={2.4} aria-hidden="true" />
          Submit for review
        </Button>
      )
      hint = "Your domain head will be asked to approve it."
    } else if (status === "in_review") {
      hint = null
      controls = (
        <p className="inline-flex items-center gap-2 text-footnote font-medium text-label-secondary">
          <Hourglass size={15} strokeWidth={2} aria-hidden="true" />
          Submitted. Waiting for approval.
        </p>
      )
    }
  } else if (isManager) {
    if (status === "in_review") {
      controls = (
        <>
          <Button
            onClick={() => run(() => approveProject(projectId))}
            pending={pending}
            tone="approve"
          >
            <Check size={15} strokeWidth={2.6} aria-hidden="true" />
            Approve
          </Button>
          <Button
            onClick={() => dialog.current?.showModal()}
            pending={false}
            tone="ghost"
          >
            <Undo2 size={15} strokeWidth={2.4} aria-hidden="true" />
            Request changes
          </Button>
        </>
      )
    } else {
      hint =
        status === "assigned"
          ? "Waiting for the team to start."
          : "The team is working on this."
    }
  } else {
    hint = "You're viewing this project but aren't assigned to it."
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">{controls}</div>
      {hint && (
        <p className="mt-3 text-footnote text-label-secondary">{hint}</p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 inline-flex items-start gap-2 rounded-control bg-status-changes-soft px-3.5 py-2.5 text-footnote text-status-changes"
        >
          <CircleAlert size={15} strokeWidth={2.2} aria-hidden="true" className="mt-px shrink-0" />
          {error}
        </p>
      )}

      {/* Native <dialog>: Escape closes it and focus is trapped without extra
          code. HIG Cognitive: prefer dismissing views with an explicit action. */}
      <dialog
        ref={dialog}
        className="w-[min(460px,92vw)] rounded-card border border-glass-line bg-surface p-0 text-label shadow-raised backdrop:bg-black/60 backdrop:backdrop-blur-sm"
        onClose={() => setNote("")}
      >
        <form
          method="dialog"
          onSubmit={(e) => {
            if ((e.nativeEvent as SubmitEvent).submitter?.dataset.confirm) {
              run(() => requestChanges(projectId, note))
            }
          }}
          className="p-6"
        >
          <h2 className="text-title3 font-bold">Request changes</h2>
          <p className="mt-1 text-footnote text-label-secondary">
            Say what needs changing. This goes to everyone assigned.
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="e.g. The type hierarchy on slides 4–7 doesn't match the brand guide."
            className="mt-4 w-full resize-y rounded-control border border-border-control bg-input px-3.5 py-2.5 text-body text-label outline-none placeholder:text-label-tertiary focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
          />
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="h-10 flex-1 rounded-control border border-border-control text-footnote font-semibold text-label-secondary transition-colors hover:bg-fill hover:text-label"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-confirm="1"
              className="h-10 flex-[2] rounded-control bg-status-changes text-footnote font-bold text-page transition-opacity hover:opacity-90"
            >
              Request changes
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}

function Button({
  children,
  onClick,
  pending,
  tone = "primary",
}: {
  children: React.ReactNode
  onClick: () => void
  pending: boolean
  tone?: "primary" | "approve" | "ghost"
}) {
  const tones = {
    primary: "bg-accent text-on-accent hover:opacity-90",
    approve: "bg-status-approved text-page hover:opacity-90",
    ghost:
      "border border-border-control text-label-secondary hover:bg-fill hover:text-label",
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`inline-flex h-10 items-center gap-2 rounded-control px-4 text-footnote font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
    >
      {pending ? (
        <LoaderCircle size={15} strokeWidth={2.4} aria-hidden="true" className="animate-spin" />
      ) : null}
      {children}
    </button>
  )
}
