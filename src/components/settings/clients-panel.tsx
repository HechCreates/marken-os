"use client"

import { useRef, useState, useTransition } from "react"
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
} from "lucide-react"
import {
  createClientRecord,
  updateClientRecord,
  deleteClientRecord,
  type Result,
} from "@/app/settings/actions"

export type ClientRow = {
  id: number
  name: string | null
  projectCount: number
}

export function ClientsPanel({ clients }: { clients: ClientRow[] }) {
  const [pending, start] = useTransition()
  const [result, setResult] = useState<Result>({})
  const [editing, setEditing] = useState<ClientRow | null>(null)
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
          {clients.length} {clients.length === 1 ? "client" : "clients"}
        </p>
        <button
          type="button"
          onClick={() => {
            setResult({})
            addDialog.current?.showModal()
          }}
          className="inline-flex h-9 items-center gap-2 rounded-control bg-accent px-4 text-footnote font-bold text-on-accent transition-opacity hover:opacity-90"
        >
          <Plus size={15} strokeWidth={2.6} aria-hidden="true" />
          Add client
        </button>
      </div>

      {(result.error || result.ok) && (
        <p
          role="status"
          className={`mt-4 flex items-start gap-2 rounded-control px-4 py-3 text-footnote ${
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
          <span className="flex-1">{result.error ?? result.ok}</span>
          <button
            type="button"
            onClick={() => setResult({})}
            className="shrink-0 text-caption font-bold underline underline-offset-2 opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </p>
      )}

      {clients.length === 0 ? (
        <div className="mt-4 rounded-card border border-separator bg-card px-6 py-14 text-center shadow-card">
          <Building2
            size={22}
            strokeWidth={1.8}
            aria-hidden="true"
            className="mx-auto mb-3 text-label-tertiary"
          />
          <p className="text-body font-semibold text-label">No clients yet</p>
          <p className="mt-1 text-footnote text-label-secondary">
            Add one before creating projects for them.
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-separator overflow-hidden rounded-card border border-separator bg-card shadow-card">
          {clients.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
            >
              <div className="min-w-0">
                <p className="truncate text-body font-semibold text-label">
                  {c.name}
                </p>
                <p className="mt-0.5 text-caption text-label-secondary">
                  {c.projectCount === 0
                    ? "No projects"
                    : `${c.projectCount} ${c.projectCount === 1 ? "project" : "projects"}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label={`Rename ${c.name}`}
                  title={`Rename ${c.name}`}
                  onClick={() => {
                    setResult({})
                    setEditing(c)
                    editDialog.current?.showModal()
                  }}
                  className="grid size-8 place-items-center rounded-control text-label-tertiary transition-colors hover:bg-fill hover:text-label"
                >
                  <Pencil size={15} strokeWidth={2} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${c.name}`}
                  title={
                    c.projectCount > 0
                      ? "Clients with projects can't be deleted"
                      : `Delete ${c.name}`
                  }
                  disabled={pending || c.projectCount > 0}
                  onClick={() => {
                    if (confirm(`Delete ${c.name}?`)) run(() => deleteClientRecord(c.id))
                  }}
                  className="grid size-8 place-items-center rounded-control text-label-tertiary transition-colors hover:bg-status-changes-soft hover:text-status-changes disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-label-tertiary"
                >
                  <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={addDialog}
        className="w-[min(420px,92vw)] rounded-card border border-glass-line bg-surface p-0 text-label shadow-raised backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <form
          action={(fd) => run(() => createClientRecord(fd), addDialog.current)}
          className="p-6"
        >
          <h3 className="mb-5 text-title3 font-bold">Add a client</h3>
          <label className="flex flex-col gap-1.5">
            <span className="text-footnote font-semibold text-label-secondary">
              Client name
            </span>
            <input
              name="name"
              required
              autoFocus
              placeholder="Northwind Coffee"
              className="h-11 rounded-control border border-border-control bg-input px-3.5 text-body text-label outline-none placeholder:text-label-tertiary focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
            />
          </label>
          <Buttons pending={pending} confirm="Add client" />
        </form>
      </dialog>

      <dialog
        ref={editDialog}
        className="w-[min(420px,92vw)] rounded-card border border-glass-line bg-surface p-0 text-label shadow-raised backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        {editing && (
          <form
            action={(fd) => run(() => updateClientRecord(fd), editDialog.current)}
            className="p-6"
          >
            <h3 className="mb-5 text-title3 font-bold">Rename client</h3>
            <input type="hidden" name="id" value={editing.id} />
            <label className="flex flex-col gap-1.5">
              <span className="text-footnote font-semibold text-label-secondary">
                Client name
              </span>
              <input
                name="name"
                required
                defaultValue={editing.name ?? ""}
                className="h-11 rounded-control border border-border-control bg-input px-3.5 text-body text-label outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
              />
            </label>
            <Buttons pending={pending} confirm="Save" />
          </form>
        )}
      </dialog>
    </div>
  )
}

function Buttons({ pending, confirm }: { pending: boolean; confirm: string }) {
  return (
    <div className="mt-5 flex gap-2">
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
