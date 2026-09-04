"use client"

import { useEffect } from "react"
import Link from "next/link"
import { TriangleAlert, RotateCw } from "lucide-react"

/**
 * Route-level error boundary. Without this a thrown error shows Next's own
 * screen, which is fine in development and alarming in production.
 *
 * HIG Writing on error messages: "avoid blame, and be clear about what someone
 * can do to fix it." Hence a retry as the primary action rather than an
 * apology, and no raw stack trace — `digest` is the server-side correlation id,
 * which is the only part worth showing.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[MarkenOS]", error)
  }, [error])

  return (
    <main className="grid min-h-screen place-items-center bg-page px-6">
      <div className="w-full max-w-[420px] text-center">
        <span className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-status-changes-soft text-status-changes">
          <TriangleAlert size={22} strokeWidth={2.2} aria-hidden="true" />
        </span>

        <h1 className="text-title2 font-extrabold text-label">
          That didn&rsquo;t load
        </h1>
        <p className="mt-2 text-body text-label-secondary">
          Something broke on our side. Trying again usually works — the page may
          have been mid-update.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-accent px-5 text-footnote font-bold text-on-accent transition-opacity hover:opacity-90"
          >
            <RotateCw size={15} strokeWidth={2.4} aria-hidden="true" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-control border border-border-control px-5 text-footnote font-semibold text-label-secondary transition-colors hover:bg-fill hover:text-label"
          >
            Back to dashboard
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 font-mono text-caption text-label-tertiary">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </main>
  )
}
