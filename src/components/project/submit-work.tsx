"use client"

import { useRef, useState, useTransition } from "react"
import { Upload, Link2, CircleAlert, LoaderCircle, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { nextVersion, recordUpload, submitLink } from "@/app/project/[id]/actions"

const MAX_BYTES = 50 * 1024 * 1024 // matches the bucket's file_size_limit

/**
 * Two ways to hand work in: upload a file, or submit a link.
 *
 * The bytes go straight from the browser to Supabase Storage rather than
 * through a server action — a 50 MB file has no business round-tripping
 * through the Next server. Storage RLS (migration 0006) gates the write by
 * project membership, keyed on the project id in the object path.
 */
export function SubmitWork({
  projectId,
  userId,
}: {
  projectId: number
  userId: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [linkOpen, setLinkOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [pending, start] = useTransition()
  const fileInput = useRef<HTMLInputElement>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-picking the same file
    if (!file) return

    setError(undefined)

    if (file.size > MAX_BYTES) {
      setError(
        `That file is ${(file.size / 1024 / 1024).toFixed(0)} MB. The limit is 50 MB.`
      )
      return
    }

    setBusy(true)
    try {
      const version = await nextVersion(projectId, userId)
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60)
      const path = `${projectId}/${userId}/v${version}_${safe}`

      const supabase = createClient()
      const { error: upErr } = await supabase.storage
        .from("submissions")
        .upload(path, file, { upsert: false, contentType: file.type })

      if (upErr) {
        setError(
          upErr.message.toLowerCase().includes("exceeded")
            ? "That file is over the 50 MB limit."
            : "Upload failed. Check your connection and try again."
        )
        return
      }

      const res = await recordUpload(projectId, path, file.name, version)
      if (res.error) setError(res.error)
    } finally {
      setBusy(false)
    }
  }

  function onLink() {
    setError(undefined)
    start(async () => {
      const res = await submitLink(projectId, url)
      if (res.error) setError(res.error)
      else {
        setUrl("")
        setLinkOpen(false)
      }
    })
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="inline-flex h-10 items-center gap-2 rounded-control bg-accent px-4 text-footnote font-bold text-on-accent transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? (
            <LoaderCircle size={15} strokeWidth={2.4} aria-hidden="true" className="animate-spin" />
          ) : (
            <Upload size={15} strokeWidth={2.4} aria-hidden="true" />
          )}
          {busy ? "Uploading…" : "Upload file"}
        </button>

        <button
          type="button"
          onClick={() => setLinkOpen((o) => !o)}
          aria-expanded={linkOpen}
          className="inline-flex h-10 items-center gap-2 rounded-control border border-border-control px-4 text-footnote font-semibold text-label-secondary transition-colors hover:bg-fill hover:text-label"
        >
          <Link2 size={15} strokeWidth={2.2} aria-hidden="true" />
          Submit a link
        </button>

        <input
          ref={fileInput}
          type="file"
          onChange={onFile}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {linkOpen && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor="mk-link" className="sr-only">
            Link to your work
          </label>
          <input
            id="mk-link"
            type="url"
            value={url}
            autoFocus
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onLink()}
            placeholder="https://…"
            className="h-10 min-w-0 flex-1 rounded-control border border-border-control bg-input px-3.5 text-body text-label outline-none placeholder:text-label-tertiary focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
          />
          <button
            type="button"
            onClick={onLink}
            disabled={!url.trim() || pending}
            className="h-10 rounded-control bg-accent px-4 text-footnote font-bold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-35"
          >
            Submit
          </button>
          <button
            type="button"
            onClick={() => {
              setLinkOpen(false)
              setUrl("")
            }}
            aria-label="Cancel"
            className="grid size-10 place-items-center rounded-control text-label-tertiary transition-colors hover:bg-fill hover:text-label"
          >
            <X size={16} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
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
    </div>
  )
}
