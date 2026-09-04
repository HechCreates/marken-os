/**
 * Shown while a route's data resolves. Every page here is server-rendered
 * behind auth, so without this the browser sits on the previous screen with no
 * sign anything is happening.
 *
 * Deliberately a shape, not a spinner — HIG Loading: "show content as soon as
 * possible… use a placeholder that suggests the layout to come" reads as faster
 * than an indeterminate spinner, even at identical timings.
 *
 * The pulse is disabled under prefers-reduced-motion by the global rule.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-page" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>

      {/* Chrome placeholder, matching the real nav's height so nothing jumps */}
      <div className="h-14 border-b border-glass-line bg-glass" />

      <div className="mx-auto max-w-[1100px] animate-pulse px-6 py-8">
        <div className="h-9 w-64 rounded-control bg-fill-strong" />
        <div className="mt-3 h-4 w-44 rounded bg-fill" />

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[76px] rounded-card border border-separator bg-card"
            />
          ))}
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[86px] rounded-card border border-separator bg-card"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
