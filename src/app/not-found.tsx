import Link from "next/link"
import { SearchX } from "lucide-react"

/**
 * Also what you get for a project RLS hides from you — getProject returns null
 * and the page calls notFound(). "Doesn't exist" and "isn't yours" look
 * identical from out here on purpose: a 403 would confirm the row exists.
 */
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-page px-6">
      <div className="w-full max-w-[420px] text-center">
        <span className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-fill-strong text-label-secondary">
          <SearchX size={22} strokeWidth={2} aria-hidden="true" />
        </span>

        <h1 className="text-title2 font-extrabold text-label">
          Nothing here
        </h1>
        <p className="mt-2 text-body text-label-secondary">
          This page doesn&rsquo;t exist, or it isn&rsquo;t shared with your
          account.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-control bg-accent px-5 text-footnote font-bold text-on-accent transition-opacity hover:opacity-90"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  )
}
