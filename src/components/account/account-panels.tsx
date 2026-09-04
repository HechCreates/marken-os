"use client"

import { useRef, useState, useTransition } from "react"
import Image from "next/image"
import {
  Camera,
  Eye,
  EyeOff,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  updateName,
  updatePassword,
  setAvatar,
  type AccountResult,
} from "@/app/account/actions"
import type { Profile } from "@/types/database"

const MAX_AVATAR = 5 * 1024 * 1024 // matches the bucket's file_size_limit

export function ProfilePanel({
  profile,
  avatarUrl,
}: {
  profile: Profile
  avatarUrl: string | null
}) {
  const [name, setName] = useState(profile.full_name ?? "")
  const [preview, setPreview] = useState(avatarUrl)
  const [result, setResult] = useState<AccountResult>({})
  const [pending, start] = useTransition()
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const initials = (profile.full_name ?? profile.username).slice(0, 2)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setResult({ error: "Pick an image file." })
      return
    }
    if (file.size > MAX_AVATAR) {
      setResult({ error: "Images need to be under 5 MB." })
      return
    }

    setResult({})
    setUploading(true)
    try {
      // Path must start with your own id — avatars_write in migration 0006
      // checks exactly that, so you can't write into anyone else's folder.
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
      const path = `${profile.id}/avatar.${ext}`

      const supabase = createClient()
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type })

      if (error) {
        setResult({ error: "Upload failed. Try again." })
        return
      }

      const res = await setAvatar(path)
      setResult(res)
      if (!res.error) {
        const { data } = await supabase.storage
          .from("avatars")
          .createSignedUrl(path, 3600)
        if (data?.signedUrl) setPreview(data.signedUrl)
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card title="Profile">
      <div className="flex flex-wrap items-center gap-5">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          aria-label="Change your photo"
          className="group relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-accent-line bg-accent-soft text-title3 font-extrabold uppercase text-accent transition-colors hover:border-accent"
        >
          {preview ? (
            <Image
              src={preview}
              alt=""
              width={80}
              height={80}
              unoptimized
              className="size-full object-cover"
            />
          ) : (
            initials
          )}
          <span className="absolute inset-0 grid place-items-center bg-page/70 opacity-0 transition-opacity group-hover:opacity-100">
            {uploading ? (
              <LoaderCircle size={18} strokeWidth={2.4} aria-hidden="true" className="animate-spin text-label" />
            ) : (
              <Camera size={18} strokeWidth={2.2} aria-hidden="true" className="text-label" />
            )}
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          onChange={onPick}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />

        <div className="min-w-0">
          <p className="text-title3 font-extrabold text-label">
            {profile.full_name ?? profile.username}
          </p>
          <p className="mt-0.5 font-mono text-footnote text-label-secondary">
            @{profile.username}
          </p>
          <p className="mt-1 text-caption text-label-tertiary">
            Click your photo to change it · under 5 MB
          </p>
        </div>
      </div>

      <div className="mt-6">
        <label
          htmlFor="acct-name"
          className="mb-2 block text-caption font-bold uppercase tracking-wide text-label-tertiary"
        >
          Display name
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="acct-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="h-11 min-w-0 flex-1 rounded-control border border-border-control bg-input px-3.5 text-body text-label outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
          />
          <button
            type="button"
            disabled={pending || name.trim() === (profile.full_name ?? "")}
            onClick={() =>
              start(async () => setResult(await updateName(name)))
            }
            className="h-11 rounded-control bg-accent px-5 text-footnote font-bold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-35"
          >
            Save
          </button>
        </div>
        {/* Username, role and domain are shown but not editable — only an
            admin can change those, in Settings. */}
        <p className="mt-2 text-caption text-label-tertiary">
          Your username, role and domain are set by an admin.
        </p>
      </div>

      <Banner result={result} />
    </Card>
  )
}

export function PasswordPanel() {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [reveal, setReveal] = useState(false)
  const [result, setResult] = useState<AccountResult>({})
  const [pending, start] = useTransition()

  const strength = score(next)

  return (
    <Card title="Password">
      <div className="flex flex-col gap-4">
        <Field
          id="pw-current"
          label="Current password"
          value={current}
          onChange={setCurrent}
          reveal={reveal}
          autoComplete="current-password"
        />
        <div>
          <Field
            id="pw-new"
            label="New password"
            value={next}
            onChange={setNext}
            reveal={reveal}
            autoComplete="new-password"
          />
          {next && (
            <div className="mt-2">
              <div
                className="h-1 overflow-hidden rounded-pill bg-fill-strong"
                role="presentation"
              >
                <div
                  className="h-full rounded-pill transition-all"
                  style={{ width: `${strength.pct}%`, background: strength.color }}
                />
              </div>
              <p className="mt-1 text-caption" style={{ color: strength.color }}>
                {strength.label}
              </p>
            </div>
          )}
        </div>
        <Field
          id="pw-confirm"
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
          reveal={reveal}
          autoComplete="new-password"
        />

        <label className="inline-flex w-fit items-center gap-2 text-footnote text-label-secondary">
          <input
            type="checkbox"
            checked={reveal}
            onChange={(e) => setReveal(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          {reveal ? (
            <EyeOff size={14} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Eye size={14} strokeWidth={2} aria-hidden="true" />
          )}
          Show passwords
        </label>

        <button
          type="button"
          disabled={pending || !current || !next || !confirm}
          onClick={() =>
            start(async () => {
              const res = await updatePassword(current, next, confirm)
              setResult(res)
              if (!res.error) {
                setCurrent("")
                setNext("")
                setConfirm("")
              }
            })
          }
          className="inline-flex h-11 w-fit items-center gap-2 rounded-control bg-accent px-5 text-footnote font-bold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-35"
        >
          {pending && (
            <LoaderCircle size={15} strokeWidth={2.4} aria-hidden="true" className="animate-spin" />
          )}
          Update password
        </button>
      </div>

      <Banner result={result} />
      <p className="mt-3 text-caption text-label-tertiary">
        Locked out? An admin can reset it from Settings — accounts here use
        internal usernames, so there&rsquo;s no reset email.
      </p>
    </Card>
  )
}

/* ── shared ─────────────────────────────────────────────── */

function Field({
  id,
  label,
  value,
  onChange,
  reveal,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  reveal: boolean
  autoComplete: string
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-caption font-bold uppercase tracking-wide text-label-tertiary"
      >
        {label}
      </label>
      <input
        id={id}
        type={reveal ? "text" : "password"}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-control border border-border-control bg-input px-3.5 text-body text-label outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
      />
    </div>
  )
}

function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-card border border-separator bg-card p-5 shadow-card">
      <h2 className="mb-4 text-caption font-bold uppercase tracking-wide text-label-tertiary">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Banner({ result }: { result: AccountResult }) {
  if (!result.error && !result.ok) return null
  return (
    <p
      role="status"
      className={`mt-4 flex items-start gap-2 rounded-control px-3.5 py-2.5 text-footnote ${
        result.error
          ? "bg-status-changes-soft text-status-changes"
          : "bg-status-approved-soft text-status-approved"
      }`}
    >
      {result.error ? (
        <CircleAlert size={15} strokeWidth={2.2} aria-hidden="true" className="mt-px shrink-0" />
      ) : (
        <CircleCheck size={15} strokeWidth={2.2} aria-hidden="true" className="mt-px shrink-0" />
      )}
      {result.error ?? result.ok}
    </p>
  )
}

/** Rough guidance, not a gate — the server enforces the 8-character minimum. */
function score(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++

  if (s <= 1) return { pct: 20, label: "Weak", color: "var(--status-changes)" }
  if (s <= 2) return { pct: 45, label: "Fair", color: "var(--status-review)" }
  if (s <= 3) return { pct: 65, label: "Good", color: "var(--status-review)" }
  if (s <= 4) return { pct: 85, label: "Strong", color: "var(--status-approved)" }
  return { pct: 100, label: "Very strong", color: "var(--status-approved)" }
}
