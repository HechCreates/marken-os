"use client"

import { useRef, useState, useTransition } from "react"
import { SendHorizontal, CircleAlert } from "lucide-react"
import { postComment } from "@/app/project/[id]/actions"

export function CommentForm({ projectId }: { projectId: number }) {
  const [value, setValue] = useState("")
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const ref = useRef<HTMLTextAreaElement>(null)

  const send = () => {
    const text = value.trim()
    if (!text || pending) return
    setError(undefined)
    start(async () => {
      const res = await postComment(projectId, text)
      if (res.error) setError(res.error)
      else {
        setValue("")
        ref.current?.focus()
      }
    })
  }

  return (
    <div className="mt-4">
      <div className="flex items-end gap-2">
        <label htmlFor="mk-comment" className="sr-only">
          Add a comment
        </label>
        <textarea
          id="mk-comment"
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter breaks the line — the convention people
            // already have from every other comment box.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="Add a comment…"
          className="max-h-32 min-h-11 flex-1 resize-y rounded-control border border-border-control bg-input px-3.5 py-2.5 text-body text-label outline-none placeholder:text-label-tertiary focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
        />
        <button
          type="button"
          onClick={send}
          disabled={!value.trim() || pending}
          aria-label="Post comment"
          className="grid size-11 shrink-0 place-items-center rounded-control bg-accent text-on-accent transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <SendHorizontal size={17} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 inline-flex items-center gap-1.5 text-footnote text-status-changes">
          <CircleAlert size={14} strokeWidth={2.2} aria-hidden="true" />
          {error}
        </p>
      )}
      <p className="mt-1.5 text-caption text-label-tertiary">
        Enter to send · Shift + Enter for a new line
      </p>
    </div>
  )
}
