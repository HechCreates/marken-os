"use client"

import { useRef, useState, useTransition } from "react"
import {
  UserPlus,
  KeyRound,
  Pencil,
  Trash2,
  CircleAlert,
  CircleCheck,
  Copy,
  UserX,
  UserCheck,
  LoaderCircle,
} from "lucide-react"
import {
  createUser,
  updateUser,
  deleteUser,
  setActive,
  resetPassword,
  type Result,
} from "@/app/settings/actions"
import { DOMAINS, DOMAIN_SHORT, ROLE_LABELS } from "@/lib/constants"
import type { Domain, Profile, Role } from "@/types/database"

export function PeoplePanel({
  people,
  meId,
}: {
  people: Profile[]
  meId: string
}) {
  const [pending, start] = useTransition()
  const [result, setResult] = useState<Result>({})
  const [editing, setEditing] = useState<Profile | null>(null)
  const addDialog = useRef<HTMLDialogElement>(null)
  const editDialog = useRef<HTMLDialogElement>(null)

  const run = (fn: () => Promise<Result>, close?: HTMLDialogElement | null) =>
    start(async () => {
      const res = await fn()
      setResult(res)
      if (!res.error) close?.close()
    })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-footnote text-label-secondary">
          {people.length} {people.length === 1 ? "person" : "people"}
        </p>
        <button
          type="button"
          onClick={() => {
            setResult({})
            addDialog.current?.showModal()
          }}
          className="inline-flex h-9 items-center gap-2 rounded-control bg-accent px-4 text-footnote font-bold text-on-accent transition-opacity hover:opacity-90"
        >
          <UserPlus size={15} strokeWidth={2.4} aria-hidden="true" />
          Add person
        </button>
      </div>

      <Banner result={result} onDismiss={() => setResult({})} />

      <div className="mt-4 overflow-x-auto rounded-card border border-separator bg-card shadow-card">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-separator">
              <Th>Name</Th>
              <Th>Username</Th>
              <Th>Role</Th>
              <Th>Domain</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr
                key={p.id}
                className={`border-b border-separator last:border-0 ${
                  p.is_active ? "" : "opacity-55"
                }`}
              >
                {/* flex-wrap rather than inline text, so the badge moves to its
                    own line as a unit instead of breaking the name across two */}
                <Td>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="whitespace-nowrap font-semibold text-label">
                      {p.full_name}
                    </span>
                    {p.id === meId && (
                      <span className="text-caption text-label-tertiary">you</span>
                    )}
                    {!p.is_active && (
                      <span className="whitespace-nowrap rounded-pill bg-fill-strong px-2 py-0.5 text-caption font-semibold text-label-tertiary">
                        Deactivated
                      </span>
                    )}
                  </span>
                </Td>
                <Td>
                  <span className="font-mono text-caption text-label-secondary">
                    @{p.username}
                  </span>
                </Td>
                <Td>
                  {/* nowrap: "Domain Head" is two words, and a wrapped pill
                      splits its own background across both lines. */}
                  <span
                    className={`inline-block whitespace-nowrap rounded-pill px-2.5 py-1 text-caption font-bold ${
                      p.role === "admin"
                        ? "bg-accent-soft text-accent"
                        : "bg-fill-strong text-label-secondary"
                    }`}
                  >
                    {ROLE_LABELS[p.role]}
                  </span>
                </Td>
                <Td>
                  <span className="text-footnote text-label-secondary">
                    {p.domain ? DOMAIN_SHORT[p.domain] : "—"}
                  </span>
                </Td>
                <Td align="right">
                  <div className="flex justify-end gap-1">
                    <IconBtn
                      label={`Reset password for ${p.username}`}
                      onClick={() => run(() => resetPassword(p.id))}
                      disabled={pending}
                    >
                      <KeyRound size={15} strokeWidth={2} aria-hidden="true" />
                    </IconBtn>
                    <IconBtn
                      label={`Edit ${p.username}`}
                      onClick={() => {
                        setResult({})
                        setEditing(p)
                        editDialog.current?.showModal()
                      }}
                      disabled={pending}
                    >
                      <Pencil size={15} strokeWidth={2} aria-hidden="true" />
                    </IconBtn>
                    <IconBtn
                      label={
                        p.is_active
                          ? `Deactivate ${p.username}`
                          : `Reactivate ${p.username}`
                      }
                      onClick={() => run(() => setActive(p.id, !p.is_active))}
                      disabled={pending || p.id === meId}
                    >
                      {p.is_active ? (
                        <UserX size={15} strokeWidth={2} aria-hidden="true" />
                      ) : (
                        <UserCheck size={15} strokeWidth={2} aria-hidden="true" />
                      )}
                    </IconBtn>
                    <IconBtn
                      label={`Delete ${p.username}`}
                      tone="danger"
                      disabled={pending || p.id === meId}
                      onClick={() => {
                        if (
                          confirm(
                            `Permanently delete @${p.username}?\n\nThis also deletes everything they uploaded. Deactivating keeps their history and stops them signing in — that is usually what you want.`
                          )
                        )
                          run(() => deleteUser(p.id))
                      }}
                    >
                      <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
                    </IconBtn>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Add ── */}
      <Dialog ref={addDialog} title="Add a person">
        <form
          action={(fd) => run(() => createUser(fd), addDialog.current)}
          className="flex flex-col gap-4"
        >
          <Field label="Full name" name="full_name" placeholder="Nina Rao" required />
          <Field
            label="Username"
            name="username"
            placeholder="nina.design"
            hint="They sign in with this. It can't be changed later."
            required
          />
          <RoleDomain />
          <p className="text-caption text-label-tertiary">
            A password is generated and shown once after you save — there's no
            email to send it to.
          </p>
          <DialogButtons pending={pending} confirm="Create account" />
        </form>
      </Dialog>

      {/* ── Edit ── */}
      <Dialog ref={editDialog} title={editing ? `Edit @${editing.username}` : "Edit"}>
        {editing && (
          <form
            action={(fd) => run(() => updateUser(fd), editDialog.current)}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="id" value={editing.id} />
            <Field
              label="Full name"
              name="full_name"
              defaultValue={editing.full_name ?? ""}
              required
            />
            <RoleDomain role={editing.role} domain={editing.domain} />
            <DialogButtons pending={pending} confirm="Save changes" />
          </form>
        )}
      </Dialog>
    </div>
  )
}

/* ── Shared bits ─────────────────────────────────────────── */

function Banner({
  result,
  onDismiss,
}: {
  result: Result
  onDismiss: () => void
}) {
  const [copied, setCopied] = useState(false)
  if (!result.error && !result.ok) return null

  return (
    <div
      role="status"
      className={`mt-4 rounded-control px-4 py-3 text-footnote ${
        result.error
          ? "bg-status-changes-soft text-status-changes"
          : "bg-status-approved-soft text-status-approved"
      }`}
    >
      <p className="flex items-start gap-2">
        {result.error ? (
          <CircleAlert size={15} strokeWidth={2.2} aria-hidden="true" className="mt-px shrink-0" />
        ) : (
          <CircleCheck size={15} strokeWidth={2.2} aria-hidden="true" className="mt-px shrink-0" />
        )}
        <span className="flex-1">{result.error ?? result.ok}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-caption font-bold underline underline-offset-2 opacity-70 hover:opacity-100"
        >
          Dismiss
        </button>
      </p>

      {/* Shown once and never retrievable — say so, and make it easy to take. */}
      {result.password && (
        <div className="mt-3 rounded-control bg-page/60 p-3">
          <p className="text-caption font-bold uppercase tracking-wide text-label-tertiary">
            Password — copy it now, it won't be shown again
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 select-all break-all font-mono text-body font-bold text-label">
              {result.password}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(result.password!)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control border border-border-control px-3 text-caption font-semibold text-label-secondary hover:bg-fill hover:text-label"
            >
              <Copy size={13} strokeWidth={2.2} aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RoleDomain({
  role = "employee",
  domain = null,
}: {
  role?: Role
  domain?: Domain | null
}) {
  const [current, setCurrent] = useState<Role>(role)
  return (
    <>
      <label className="flex flex-col gap-1.5">
        <span className="text-footnote font-semibold text-label-secondary">Role</span>
        <select
          name="role"
          defaultValue={role}
          onChange={(e) => setCurrent(e.target.value as Role)}
          className="h-11 rounded-control border border-border-control bg-input px-3 text-body text-label outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
        >
          <option value="employee">Employee</option>
          <option value="head">Domain head</option>
          <option value="admin">Admin</option>
        </select>
      </label>

      {/* Admins oversee everything, so a domain would be meaningless — the
          profiles_domain_required_for_staff constraint enforces the same rule. */}
      {current !== "admin" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-footnote font-semibold text-label-secondary">Domain</span>
          <select
            name="domain"
            defaultValue={domain ?? "marketing"}
            className="h-11 rounded-control border border-border-control bg-input px-3 text-body text-label outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
          >
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {DOMAIN_SHORT[d]}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  )
}

function Field({
  label,
  name,
  hint,
  ...rest
}: {
  label: string
  name: string
  hint?: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-footnote font-semibold text-label-secondary">{label}</span>
      <input
        name={name}
        {...rest}
        className="h-11 rounded-control border border-border-control bg-input px-3.5 text-body text-label outline-none placeholder:text-label-tertiary focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
      />
      {hint && <span className="text-caption text-label-tertiary">{hint}</span>}
    </label>
  )
}

const Dialog = function Dialog({
  ref,
  title,
  children,
}: {
  ref: React.RefObject<HTMLDialogElement | null>
  title: string
  children: React.ReactNode
}) {
  return (
    <dialog
      ref={ref}
      className="w-[min(440px,92vw)] rounded-card border border-glass-line bg-surface p-0 text-label shadow-raised backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <h3 className="mb-5 text-title3 font-bold">{title}</h3>
        {children}
      </div>
    </dialog>
  )
}

function DialogButtons({
  pending,
  confirm,
}: {
  pending: boolean
  confirm: string
}) {
  return (
    <div className="mt-2 flex gap-2">
      <button
        type="button"
        onClick={(e) => e.currentTarget.closest("dialog")?.close()}
        className="h-10 flex-1 rounded-control border border-border-control text-footnote font-semibold text-label-secondary transition-colors hover:bg-fill hover:text-label"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 flex-[2] items-center justify-center gap-2 rounded-control bg-accent text-footnote font-bold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending && (
          <LoaderCircle size={15} strokeWidth={2.4} aria-hidden="true" className="animate-spin" />
        )}
        {confirm}
      </button>
    </div>
  )
}

function IconBtn({
  label,
  onClick,
  disabled,
  tone,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  tone?: "danger"
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid size-8 place-items-center rounded-control transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        tone === "danger"
          ? "text-label-tertiary hover:bg-status-changes-soft hover:text-status-changes"
          : "text-label-tertiary hover:bg-fill hover:text-label"
      }`}
    >
      {children}
    </button>
  )
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode
  align?: "right"
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-caption font-bold uppercase tracking-wide text-label-tertiary ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  align,
}: {
  children: React.ReactNode
  align?: "right"
}) {
  return (
    <td className={`px-4 py-3 ${align === "right" ? "text-right" : ""}`}>
      {children}
    </td>
  )
}
