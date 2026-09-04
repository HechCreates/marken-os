"use client"

import { useActionState, useId, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Eye, EyeOff, CircleAlert, LoaderCircle } from "lucide-react"
import { signIn, type LoginState } from "./actions"

// HIG Writing: "avoid blame, and be clear about what someone can do to fix it."
const ERRORS: Record<string, string> = {
  "no-profile":
    "This account has no profile yet. Ask an admin to set one up, then sign in again.",
  deactivated: "This account is deactivated. Contact an admin to reactivate it.",
}

export default function LoginForm() {
  const params = useSearchParams()
  const next = params.get("next") ?? ""
  const urlError = params.get("error")

  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    signIn,
    {}
  )
  const [reveal, setReveal] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const usernameId = useId()
  const passwordId = useId()
  const errorId = useId()

  const message = state.error ?? (urlError ? ERRORS[urlError] : undefined)
  // HIG Entering Data: enable submit only once the required data is there.
  const ready = username.trim().length > 0 && password.length > 0

  const field =
    "h-11 w-full rounded-control border border-border-control bg-input px-3.5 " +
    "text-body text-label transition-colors placeholder:text-label-tertiary " +
    "focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-soft " +
    "aria-[invalid=true]:border-danger"

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-[380px]">
        <header className="mb-7">
          <h1 className="text-title1 font-extrabold tracking-tight text-label">
            Marken<span className="text-accent">OS</span>
          </h1>
          <p className="mt-1.5 text-subhead text-label-secondary">
            Sign in to your workspace
          </p>
        </header>

        {/* An overlay-class surface, so it takes the glass treatment — HIG lists
            alerts and popovers under the Regular variant. */}
        <form
          action={formAction}
          noValidate
          className="relative overflow-hidden rounded-card border border-glass-line bg-glass p-6 shadow-raised"
          style={{
            backdropFilter: "blur(var(--glass-blur)) saturate(160%)",
            WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(160%)",
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ background: "var(--glass-sheen)" }}
          />
          <input type="hidden" name="next" value={next} />

          <div className="flex flex-col gap-4">
            <div>
              {/* A real label, not placeholder-only — it has to survive typing */}
              <label
                htmlFor={usernameId}
                className="mb-1.5 block text-footnote font-semibold text-label-secondary"
              >
                Username
              </label>
              <input
                id={usernameId}
                name="username"
                type="text"
                required
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
                placeholder="firstname.domain"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                aria-invalid={message ? true : undefined}
                aria-describedby={message ? errorId : undefined}
                className={field}
              />
            </div>

            <div>
              <label
                htmlFor={passwordId}
                className="mb-1.5 block text-footnote font-semibold text-label-secondary"
              >
                Password
              </label>
              <div className="relative">
                {/* Secure entry, never prepopulated — HIG Entering Data */}
                <input
                  id={passwordId}
                  name="password"
                  type={reveal ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={message ? true : undefined}
                  aria-describedby={message ? errorId : undefined}
                  className={`${field} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setReveal((r) => !r)}
                  className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-control text-label-tertiary transition-colors hover:text-label"
                  aria-label={reveal ? "Hide password" : "Show password"}
                  aria-pressed={reveal}
                >
                  {reveal ? (
                    <EyeOff size={17} strokeWidth={1.9} aria-hidden="true" />
                  ) : (
                    <Eye size={17} strokeWidth={1.9} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {message && (
            <p
              id={errorId}
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-control bg-status-changes-soft px-3.5 py-3 text-footnote text-status-changes"
            >
              {/* Icon as well as colour — never colour alone */}
              <CircleAlert
                size={15}
                strokeWidth={2.2}
                aria-hidden="true"
                className="mt-px shrink-0"
              />
              <span>{message}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={!ready || pending}
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-accent text-body font-bold text-on-accent transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {pending && (
              <LoaderCircle
                size={16}
                strokeWidth={2.4}
                aria-hidden="true"
                className="animate-spin"
              />
            )}
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-footnote text-label-tertiary">
          Forgotten your password? Ask a domain head or admin to reset it.
        </p>
      </div>
    </main>
  )
}
