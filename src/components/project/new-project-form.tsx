"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  X,
  Link2,
  Paperclip,
  CircleAlert,
  LoaderCircle,
  Check,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  createProject,
  attachBriefFiles,
  quickAddClient,
} from "@/app/d/[domain]/new/actions"
import { DOMAIN_LABELS, PRIORITY_LABELS } from "@/lib/constants"
import type { Domain, Priority } from "@/types/database"

type Client = { id: number; name: string | null }
type Assignee = { id: string; name: string; username: string }

const MAX_BYTES = 50 * 1024 * 1024

export function NewProjectForm({
  domain,
  clients: initialClients,
  assignees,
}: {
  domain: Domain
  clients: Client[]
  assignees: Assignee[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string>()

  const [clients, setClients] = useState(initialClients)
  const [clientId, setClientId] = useState<string>("")
  const [newClient, setNewClient] = useState("")
  const [addingClient, setAddingClient] = useState(false)

  const [priority, setPriority] = useState<Priority>("normal")
  const [selected, setSelected] = useState<string[]>([])
  const [links, setLinks] = useState<string[]>([])
  const [linkDraft, setLinkDraft] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const fileInput = useRef<HTMLInputElement>(null)

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  function addLink() {
    const l = linkDraft.trim()
    if (!/^https?:\/\/\S+$/i.test(l)) {
      setError("Links need to start with http:// or https://")
      return
    }
    setError(undefined)
    setLinks((ls) => [...ls, l])
    setLinkDraft("")
  }

  function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? [])
    e.target.value = ""
    const tooBig = chosen.find((f) => f.size > MAX_BYTES)
    if (tooBig) {
      setError(`"${tooBig.name}" is over the 50 MB limit.`)
      return
    }
    setError(undefined)
    setFiles((f) => [...f, ...chosen])
  }

  function submit(form: FormData) {
    setError(undefined)
    // Selections live in React state, so they go into the payload explicitly
    // rather than relying on hidden inputs staying in sync.
    form.set("domain", domain)
    form.set("priority", priority)
    form.set("client_id", clientId)
    for (const id of selected) form.append("member", id)
    for (const l of links) form.append("link", l)

    start(async () => {
      const res = await createProject(form)
      if (res.error || !res.projectId) {
        setError(res.error ?? "Couldn't create the project.")
        return
      }

      // Storage RLS keys on the project id in the path, so uploads can only
      // happen once the project exists.
      if (files.length > 0) {
        const supabase = createClient()
        const paths: string[] = []
        for (let i = 0; i < files.length; i++) {
          const f = files[i]
          const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60)
          const path = `${res.projectId}/brief_${i}_${safe}`
          const { error: upErr } = await supabase.storage
            .from("submissions")
            .upload(path, f, { upsert: false, contentType: f.type })
          if (!upErr) paths.push(path)
        }
        await attachBriefFiles(res.projectId, paths)
      }

      router.push(`/project/${res.projectId}`)
    })
  }

  return (
    <form action={submit} className="mt-6 flex flex-col gap-4">
      <Card>
        <Label htmlFor="title">Project title</Label>
        <input
          id="title"
          name="title"
          required
          autoFocus
          maxLength={200}
          placeholder="Q2 Brand Campaign"
          className={input}
        />
      </Card>

      <Card>
        <Label htmlFor="client">Client</Label>
        {addingClient ? (
          <div className="flex flex-wrap gap-2">
            <input
              value={newClient}
              autoFocus
              onChange={(e) => setNewClient(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  start(async () => {
                    const res = await quickAddClient(newClient)
                    if (res.error) setError(res.error)
                    else if (res.id) {
                      setClients((c) => [...c, { id: res.id!, name: res.name! }])
                      setClientId(String(res.id))
                      setAddingClient(false)
                      setNewClient("")
                    }
                  })
                }
              }}
              placeholder="New client name"
              className={`${input} min-w-0 flex-1`}
            />
            <button
              type="button"
              disabled={!newClient.trim() || pending}
              onClick={() =>
                start(async () => {
                  const res = await quickAddClient(newClient)
                  if (res.error) setError(res.error)
                  else if (res.id) {
                    setClients((c) => [...c, { id: res.id!, name: res.name! }])
                    setClientId(String(res.id))
                    setAddingClient(false)
                    setNewClient("")
                  }
                })
              }
              className="h-11 rounded-control bg-accent px-4 text-footnote font-bold text-on-accent disabled:opacity-40"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingClient(false)
                setNewClient("")
              }}
              aria-label="Cancel adding client"
              className="grid size-11 place-items-center rounded-control text-label-tertiary hover:bg-fill hover:text-label"
            >
              <X size={16} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <select
              id="client"
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={`${input} min-w-0 flex-1`}
            >
              <option value="">Choose a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setAddingClient(true)}
              className="inline-flex h-11 items-center gap-1.5 rounded-control border border-border-control px-4 text-footnote font-semibold text-label-secondary hover:bg-fill hover:text-label"
            >
              <Plus size={15} strokeWidth={2.4} aria-hidden="true" />
              New
            </button>
          </div>
        )}
        <Hint>Domain is fixed to {DOMAIN_LABELS[domain]}.</Hint>
      </Card>

      <Card>
        <Label htmlFor="brief">Brief</Label>
        <textarea
          id="brief"
          name="brief"
          rows={5}
          placeholder="Goals, deliverables, anything the team needs to know…"
          className={`${input} min-h-28 resize-y py-3`}
        />

        {(links.length > 0 || files.length > 0) && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {links.map((l, i) => (
              <Chip
                key={l}
                icon={<Link2 size={12} strokeWidth={2.2} aria-hidden="true" />}
                label={l}
                onRemove={() => setLinks((ls) => ls.filter((_, x) => x !== i))}
              />
            ))}
            {files.map((f, i) => (
              <Chip
                key={f.name + i}
                icon={<Paperclip size={12} strokeWidth={2.2} aria-hidden="true" />}
                label={f.name}
                onRemove={() => setFiles((fs) => fs.filter((_, x) => x !== i))}
              />
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="inline-flex h-9 items-center gap-1.5 rounded-control border border-border-control px-3.5 text-footnote font-semibold text-label-secondary hover:bg-fill hover:text-label"
          >
            <Paperclip size={14} strokeWidth={2.2} aria-hidden="true" />
            Attach files
          </button>
          <input
            ref={fileInput}
            type="file"
            multiple
            onChange={pickFiles}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <div className="flex min-w-0 flex-1 gap-2">
            <input
              value={linkDraft}
              onChange={(e) => setLinkDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addLink()
                }
              }}
              placeholder="https://… then Enter"
              className="h-9 min-w-0 flex-1 rounded-control border border-border-control bg-input px-3 text-footnote text-label outline-none placeholder:text-label-tertiary focus:border-accent"
            />
            {linkDraft && (
              <button
                type="button"
                onClick={addLink}
                className="h-9 rounded-control bg-accent px-3 text-footnote font-bold text-on-accent"
              >
                Add
              </button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <Label htmlFor="due">Due date</Label>
          <input
            id="due"
            name="due_date"
            type="date"
            className={input}
            style={{ colorScheme: "dark" }}
          />
        </Card>

        <Card>
          <Label>Priority</Label>
          <div className="flex gap-2" role="radiogroup" aria-label="Priority">
            {(["normal", "high", "urgent"] as Priority[]).map((p) => {
              const on = priority === p
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPriority(p)}
                  className={`h-10 flex-1 rounded-control border text-footnote font-bold transition-colors ${
                    on
                      ? p === "urgent"
                        ? "border-status-changes bg-status-changes-soft text-status-changes"
                        : p === "high"
                          ? "border-status-review bg-status-review-soft text-status-review"
                          : "border-accent bg-accent text-on-accent"
                      : "border-border-control text-label-secondary hover:bg-fill hover:text-label"
                  }`}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              )
            })}
          </div>
        </Card>
      </div>

      <Card>
        <Label>Assign to</Label>
        {assignees.length === 0 ? (
          <p className="text-footnote text-label-tertiary">
            Nobody active in this domain yet. Add people in Settings first.
          </p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-2">
              {assignees.map((a) => {
                const on = selected.includes(a.id)
                const isLead = selected[0] === a.id
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(a.id)}
                      className={`inline-flex items-center gap-1.5 rounded-pill border px-3.5 py-2 text-footnote font-semibold transition-colors ${
                        on
                          ? "border-accent bg-accent text-on-accent"
                          : "border-border-control text-label-secondary hover:bg-fill hover:text-label"
                      }`}
                    >
                      {on && <Check size={13} strokeWidth={2.8} aria-hidden="true" />}
                      {a.name}
                      {isLead && <span className="font-normal opacity-70">lead</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
            <Hint>
              The first person you pick is the lead; anyone after that is
              support.
            </Hint>
          </>
        )}
      </Card>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-control bg-status-changes-soft px-4 py-3 text-footnote text-status-changes"
        >
          <CircleAlert size={15} strokeWidth={2.2} aria-hidden="true" className="mt-px shrink-0" />
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => router.push(`/d/${domain}`)}
          className="h-11 flex-1 rounded-control border border-border-control text-footnote font-semibold text-label-secondary transition-colors hover:bg-fill hover:text-label"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 flex-[2] items-center justify-center gap-2 rounded-control bg-accent text-body font-bold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {pending && (
            <LoaderCircle size={16} strokeWidth={2.4} aria-hidden="true" className="animate-spin" />
          )}
          {pending ? "Creating…" : "Create project"}
        </button>
      </div>
    </form>
  )
}

const input =
  "h-11 w-full rounded-control border border-border-control bg-input px-3.5 text-body text-label outline-none placeholder:text-label-tertiary focus:border-accent focus:ring-[3px] focus:ring-accent-soft"

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-separator bg-card p-5 shadow-card">
      {children}
    </div>
  )
}

function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode
  htmlFor?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-caption font-bold uppercase tracking-wide text-label-tertiary"
    >
      {children}
    </label>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-caption text-label-tertiary">{children}</p>
}

function Chip({
  icon,
  label,
  onRemove,
}: {
  icon: React.ReactNode
  label: string
  onRemove: () => void
}) {
  return (
    <li className="inline-flex max-w-full items-center gap-1.5 rounded-pill border border-accent-line bg-accent-soft py-1 pl-2.5 pr-1.5 text-caption font-semibold text-accent">
      {icon}
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="grid size-5 shrink-0 place-items-center rounded-full hover:bg-accent/20"
      >
        <X size={11} strokeWidth={2.6} aria-hidden="true" />
      </button>
    </li>
  )
}
