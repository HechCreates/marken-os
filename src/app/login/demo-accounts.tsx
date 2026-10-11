"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Copy, KeyRound, Users, X } from "lucide-react"
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  DOMAIN_SHORT,
  ROLE_LABELS,
} from "@/lib/constants"

const GROUPS = [
  { role: "admin", heading: "Admin — every domain" },
  { role: "head", heading: "Domain heads — their own domain" },
  { role: "employee", heading: "Employees — work assigned to them" },
] as const

/**
 * The demo credentials, laid over the login card. Nothing here is a secret:
 * the accounts are seeded fakes and every row they can reach is decided by
 * RLS, which is the point the demo is making.
 */
export default function DemoAccounts() {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  // Dismissible the two ways a popover is expected to be — HIG Cognitive.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onDown)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onDown)
    }
  }, [open])

  // Without a password the list is of no use to anyone, so it stays away.
  if (!DEMO_PASSWORD) return null

  return (
    <div ref={wrap} className="relative mt-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mx-auto flex h-9 items-center gap-2 rounded-pill border border-glass-line bg-fill px-4 text-footnote font-semibold text-label-secondary transition-colors hover:bg-fill-strong hover:text-label"
      >
        <Users size={15} strokeWidth={2} aria-hidden="true" />
        Demo accounts
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Demo accounts"
          /* Opens upward, so it lies over the login card rather than pushing
             the page around. Surface, not glass: the card beneath it is
             already the functional layer, and glass on glass reads as mud. */
          className="absolute inset-x-0 bottom-full z-20 mb-3 overflow-hidden rounded-card border border-glass-line bg-surface shadow-raised"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ background: "var(--glass-sheen)" }}
          />

          <header className="flex items-start justify-between gap-3 px-4 pt-4">
            <div>
              <h2 className="text-footnote font-bold text-label">
                Try it as anyone
              </h2>
              <p className="mt-0.5 text-caption text-label-tertiary">
                Same data, three different applications.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-control text-label-tertiary transition-colors hover:bg-fill hover:text-label"
            >
              <X size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </header>

          {/* One password for all nine, so it leads rather than repeating. */}
          <div className="px-4 pt-3">
            <Row
              label="Password"
              value={DEMO_PASSWORD}
              hint="for every account"
              icon={<KeyRound size={14} strokeWidth={2} aria-hidden="true" />}
              accent
            />
          </div>

          <div className="max-h-[min(24rem,42vh)] overflow-y-auto px-4 pb-4 pt-3">
            {GROUPS.map(({ role, heading }) => (
              <section key={role} className="mt-3 first:mt-0">
                <h3 className="px-1 pb-1.5 text-caption font-semibold uppercase tracking-wide text-label-tertiary">
                  {heading}
                </h3>
                <ul className="flex flex-col gap-1">
                  {DEMO_ACCOUNTS.filter((a) => a.role === role).map((a) => (
                    <li key={a.username}>
                      <Row
                        label={a.username}
                        value={a.username}
                        hint={
                          a.domain
                            ? `${a.name} · ${DOMAIN_SHORT[a.domain]}`
                            : `${a.name} · ${ROLE_LABELS[a.role]}`
                        }
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * The async Clipboard API is the right one, but it is permission-gated and
 * some browsers deny it outright. Falling back to execCommand — deprecated,
 * universally implemented — is the difference between a Copy button that
 * works everywhere and one that silently does nothing.
 */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // fall through
  }
  const ta = document.createElement("textarea")
  ta.value = text
  ta.setAttribute("readonly", "")
  ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none"
  document.body.append(ta)
  ta.select()
  try {
    return document.execCommand("copy")
  } catch {
    return false
  } finally {
    ta.remove()
  }
}

/** A credential and the one thing you want to do with it. */
function Row({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string
  value: string
  hint: string
  icon?: React.ReactNode
  accent?: boolean
}) {
  const [state, setState] = useState<"idle" | "done" | "manual">("idle")
  const text = useRef<HTMLSpanElement>(null)

  async function run() {
    const ok = await writeClipboard(value)
    // Blocked clipboard: select the credential instead, so the row still
    // leaves the viewer one keystroke away rather than doing nothing at all.
    if (!ok && text.current) {
      const range = document.createRange()
      range.selectNodeContents(text.current)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
    setState(ok ? "done" : "manual")
    setTimeout(() => setState("idle"), ok ? 1400 : 3000)
  }

  const say = { idle: "Copy", done: "Copied", manual: "Press ⌘C" }[state]

  return (
    <button
      type="button"
      onClick={run}
      aria-label={`Copy ${label}`}
      className={`flex w-full items-center gap-3 rounded-control px-3 py-2 text-left transition-colors ${
        accent
          ? "border border-accent-line bg-accent-soft hover:bg-accent-soft"
          : "hover:bg-fill"
      }`}
    >
      {icon && <span className="shrink-0 text-accent">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span
          ref={text}
          className={`block select-text truncate text-footnote font-semibold ${
            accent ? "text-accent" : "text-label"
          }`}
        >
          {value}
        </span>
        <span className="block truncate text-caption text-label-tertiary">
          {hint}
        </span>
      </span>
      {/* Icon and word both change — never colour alone. */}
      <span
        aria-live="polite"
        className={`flex shrink-0 items-center gap-1.5 text-caption font-semibold ${
          state === "idle" ? "text-label-tertiary" : "text-accent"
        }`}
      >
        {state === "done" ? (
          <Check size={14} strokeWidth={2.4} aria-hidden="true" />
        ) : (
          <Copy size={14} strokeWidth={2} aria-hidden="true" />
        )}
        {say}
      </span>
    </button>
  )
}
