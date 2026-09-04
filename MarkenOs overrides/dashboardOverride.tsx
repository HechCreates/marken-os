// dashboardOverride.tsx
// Powers all four domain dashboards + New Project modal
//
// ATTACH OVERRIDES:
// NavUsername      → "userName" text layer
// DomainTitle      → "domainTitle" text layer
// BackButton       → "backButton" frame
// NewProjectBtn    → "newProjectBtn" frame
// StatsStrip       → "statsStrip" frame
// StatActive       → "statActive" text
// StatInReview     → "statInReview" text
// StatOverdue      → "statOverdue" text
// StatDueSoon      → "statsClients" text
// FilterAll        → "filterAll" component
// FilterAssigned   → "filterAssigned" component
// FilterInProgress → "filterinProgress" component
// FilterInReview   → "filterInReview" component
// FilterApproved   → "filterApproved" component
// ProjectGrid      → "projectGrid" frame

import type { ComponentType } from "react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
    "https://kufsbpaleeawqmtlnnno.supabase.co",
    "sb_publishable_S3HP2seIYkKSuBoXrRyp3g_2_cWKoLd"
)

const MARKEN_BLACK  = "#3C3D2A"
const MARKEN_YELLOW = "#FBFF12"
const CARD_BG       = "#4A4B38"
const WHITE         = "#FFFFFF"
const INPUT_BG      = "#3C3D2A"
const INPUT_BORDER  = "rgba(251,255,18,0.2)"

function getDomain(): string {
    const path = window.location.pathname.toLowerCase()
    if (path.includes("marketing"))  return "marketing"
    if (path.includes("design"))     return "design"
    if (path.includes("social"))     return "socialmedia"
    if (path.includes("webdev"))     return "webdev"
    return "marketing"
}

const DOMAIN_LABELS: Record<string, string> = {
    marketing:   "Marketing and Sales",
    design:      "Design and Creatives",
    socialmedia: "Social Media Management",
    webdev:      "Website Design and Development",
}

const STATUS_COLOR: Record<string, string> = {
    assigned:          MARKEN_YELLOW,
    in_progress:       "#3B82F6",
    in_review:         "#F97316",
    approved:          "#22C55E",
    changes_requested: "#EF4444",
}
const STATUS_TEXT_COLOR: Record<string, string> = {
    assigned:          MARKEN_BLACK,
    in_progress:       WHITE,
    in_review:         WHITE,
    approved:          WHITE,
    changes_requested: WHITE,
}
const STATUS_LABELS: Record<string, string> = {
    assigned:          "Assigned",
    in_progress:       "In Progress",
    in_review:         "In Review",
    approved:          "Approved",
    changes_requested: "Changes Requested",
}
const PRIORITY_BG: Record<string, string> = {
    normal: "rgba(255,255,255,0.15)",
    high:   "#F97316",
    urgent: "#EF4444",
}

// ── Framer editor guard ──
// Returns true when running inside Framer's editor/preview sandbox.
// In that environment sessionStorage is unreliable and Supabase calls
// will fail — so every override bails out and just renders the component
// as-is, keeping the editor stable.
function isEditor(): boolean {
    try {
        return window.location.href.includes("framer.com") ||
               window.location.href.includes("framerstatic.com")
    } catch { return true }
}

function getUser() {
    try { return JSON.parse(sessionStorage.getItem("marken_user") ?? "{}") }
    catch { return {} }
}
function formatDate(dateStr: string): string {
    if (!dateStr) return "No due date"
    const d = new Date(dateStr)
    return `Due ${d.getDate()} ${d.toLocaleString("default", { month: "short" })}`
}
function getAssignees(members: any[]): string {
    if (!members || members.length === 0) return "Unassigned"
    return members.map((m: any) => m.username).join(", ")
}

// ── Filter event ──
const FILTER_EVENT = "marken-filter-change"
function fireFilter(filter: string) {
    window.dispatchEvent(new CustomEvent(FILTER_EVENT, { detail: { filter } }))
}
function useFilter(myFilter: string) {
    const [active, setActive] = useState(myFilter === "all")
    useEffect(() => {
        const h = (e: any) => setActive(e.detail.filter === myFilter)
        window.addEventListener(FILTER_EVENT, h)
        return () => window.removeEventListener(FILTER_EVENT, h)
    }, [])
    return active
}

// ── Projects — simple direct fetch, no cache ──
// Split into separate queries to avoid FK join issues in Supabase.

async function fetchProjects(domain: string): Promise<any[]> {
    const user = getUser()


    // Query 1: projects base data
    const { data: projData, error: projError } = await supabase
        .from("projects")
        .select("id,title,status,priority,due_date,brief,client_id,created_at,domain")
        .eq("domain", domain)
        .order("created_at", { ascending: false })


    if (projError) {
        console.error("[MarkenOS] projects query failed:", projError)
        return []
    }
    const projects = projData ?? []
    if (projects.length === 0) {
        return []
    }

    const ids = projects.map((p: any) => p.id)

    // Query 2: clients
    const clientIds = [...new Set(projects.map((p: any) => p.client_id).filter(Boolean))]
    const { data: clientData } = clientIds.length > 0
        ? await supabase.from("clients").select("id,name").in("id", clientIds)
        : { data: [] }
    const clientMap: Record<number, string> = {}
    for (const c of (clientData ?? [])) clientMap[c.id] = c.name

    // Query 3: project_members
    const { data: memberData, error: memberError } = await supabase
        .from("project_members")
        .select("project_id,username,role_in_project")
        .in("project_id", ids)
    if (memberError) console.error("[MarkenOS] project_members query failed:", memberError)
    const membersByProject: Record<string, any[]> = {}
    for (const m of (memberData ?? [])) {
        if (!membersByProject[m.project_id]) membersByProject[m.project_id] = []
        membersByProject[m.project_id].push(m)
    }

    // Assemble
    let assembled = projects.map((p: any) => ({
        ...p,
        clients: clientMap[p.client_id] ? { name: clientMap[p.client_id] } : null,
        project_members: membersByProject[p.id] ?? [],
    }))

    // Employee filter
    if (user.role === "employee") {
        assembled = assembled.filter((p: any) =>
            p.project_members.some((m: any) => m.username === user.username)
        )
    }

    return assembled
}

function useProjects(domain: string): { projects: any[], loading: boolean } {
    const [projects, setProjects] = useState<any[]>([])
    const [loading, setLoading]   = useState(true)

    async function refresh() {
        setLoading(true)
        const data = await fetchProjects(domain)
        setProjects(data)
        setLoading(false)
    }

    useEffect(() => {
        refresh()
        const ch = supabase.channel(`proj-${domain}`)
            .on("postgres_changes", {
                event: "*", schema: "public", table: "projects",
                filter: `domain=eq.${domain}`,
            }, () => refresh())
            .subscribe()
        const onUpdate = () => refresh()
        window.addEventListener("marken-projects-updated", onUpdate)
        return () => {
            supabase.removeChannel(ch)
            window.removeEventListener("marken-projects-updated", onUpdate)
        }
    }, [])

    return { projects, loading }
}

// ── Stats cache ──
const _sc: Record<string, any> = {}
const _sl: Record<string, Array<(s: any) => void>> = {}
const _sg: Record<string, boolean> = {}

async function loadStats(domain: string) {
    if (_sc[domain]) { _sl[domain]?.forEach(fn => fn(_sc[domain])); return }
    if (_sg[domain]) return; _sg[domain] = true
    const today   = new Date().toISOString().split("T")[0]
    const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0]
    const [a, b, c, d] = await Promise.all([
        supabase.from("projects").select("id", { count: "exact", head: true }).eq("domain", domain).neq("status", "approved"),
        supabase.from("projects").select("id", { count: "exact", head: true }).eq("domain", domain).eq("status", "in_review"),
        supabase.from("projects").select("id", { count: "exact", head: true }).eq("domain", domain).lt("due_date", today).neq("status", "approved"),
        supabase.from("projects").select("id", { count: "exact", head: true }).eq("domain", domain).gte("due_date", today).lte("due_date", lastDay).neq("status", "approved"),
    ])
    _sc[domain] = { active: a.count ?? 0, inReview: b.count ?? 0, overdue: c.count ?? 0, dueSoon: d.count ?? 0 }
    _sg[domain] = false; _sl[domain]?.forEach(fn => fn(_sc[domain])); _sl[domain] = []
}

function useStats(domain: string): any {
    const [stats, setStats] = useState<any>(_sc[domain] ?? null)
    useEffect(() => {
        if (_sc[domain]) { setStats(_sc[domain]); return }
        if (!_sl[domain]) _sl[domain] = []
        _sl[domain].push(setStats); loadStats(domain)
    }, [])
    // Bust stats cache when projects change
    useEffect(() => {
        const h = () => {
            _sc[domain] = null; _sg[domain] = false
            if (!_sl[domain]) _sl[domain] = []
            _sl[domain].push(setStats); loadStats(domain)
        }
        window.addEventListener("marken-projects-updated", h)
        return () => window.removeEventListener("marken-projects-updated", h)
    }, [])
    return stats
}

// ── Styles ──
function injectStyles() {
    if (document.getElementById("mk-styles")) return
    const s = document.createElement("style"); s.id = "mk-styles"
    s.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&display=swap');
        @keyframes mkFadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mkSlideUp { from{opacity:0;transform:translateX(-50%) translateY(32px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes mkOverlay { from{opacity:0} to{opacity:1} }
        .mk-card { animation:mkFadeIn 0.25s ease forwards; transition:transform 0.15s ease,box-shadow 0.15s ease; }
        .mk-card:hover { transform:translateY(-2px); box-shadow:0 8px 32px rgba(0,0,0,0.35) !important; }

        /* ── Overlay ── */
        #mk-overlay {
            position: fixed;
            inset: 0;
            background: rgba(10,10,8,0.75);
            z-index: 99990;
            animation: mkOverlay 0.2s ease;
        }
        /* ── Modal panel ── */
        #mk-modal {
            position: fixed;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: min(680px, 96vw);
            max-height: 88vh;
            overflow-y: auto;
            background: #22231A;
            border-radius: 24px 24px 0 0;
            padding: 32px 36px 52px;
            z-index: 99995;
            animation: mkSlideUp 0.32s cubic-bezier(0.34,1.2,0.64,1);
            box-shadow: 0 -12px 60px rgba(0,0,0,0.6);
            box-sizing: border-box;
        }
        #mk-modal::-webkit-scrollbar{width:5px}
        #mk-modal::-webkit-scrollbar-thumb{background:rgba(251,255,18,0.2);border-radius:3px}


        /* ── Form elements ── */
        .mk-title{font-family:Manrope,sans-serif;font-weight:700;font-size:22px;letter-spacing:-0.05em;color:#fff;margin:0}
        .mk-label{font-family:Manrope,sans-serif;font-weight:600;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:7px;display:block}
        .mk-field{margin-bottom:18px}
        .mk-input,.mk-textarea,.mk-select{width:100%;background:${INPUT_BG};border:1.5px solid ${INPUT_BORDER};border-radius:12px;padding:12px 16px;font-family:Manrope,sans-serif;font-size:15px;color:#fff;outline:none;box-sizing:border-box;transition:border-color 0.15s;-webkit-appearance:none;appearance:none}
        .mk-input:focus,.mk-textarea:focus,.mk-select:focus{border-color:${MARKEN_YELLOW}}
        .mk-input::placeholder,.mk-textarea::placeholder{color:rgba(255,255,255,0.22)}
        .mk-textarea{resize:vertical;min-height:90px}
        .mk-select option{background:#22231A;color:#fff}
        .mk-priority-row{display:flex;gap:10px}
        .mk-pri{flex:1;padding:10px 0;border-radius:10px;border:1.5px solid rgba(255,255,255,0.13);background:transparent;font-family:Manrope,sans-serif;font-size:14px;font-weight:600;color:rgba(255,255,255,0.4);cursor:pointer !important;transition:all 0.15s ease}
        .mk-pri.sel-normal{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.35);color:#fff}
        .mk-pri.sel-high{background:#F97316;border-color:#F97316;color:#fff}
        .mk-pri.sel-urgent{background:#EF4444;border-color:#EF4444;color:#fff}
        .mk-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
        .mk-chip{padding:6px 14px;border-radius:999px;background:rgba(251,255,18,0.08);border:1.5px solid rgba(251,255,18,0.22);color:${MARKEN_YELLOW};font-family:Manrope,sans-serif;font-size:13px;font-weight:600;cursor:pointer !important;transition:all 0.15s;user-select:none;display:inline-block}
        .mk-chip.on{background:${MARKEN_YELLOW};border-color:${MARKEN_YELLOW};color:${MARKEN_BLACK}}
        .mk-divider{height:1px;background:rgba(255,255,255,0.06);margin:22px 0}
        .mk-btn-row{display:flex;gap:12px}
        .mk-cancel{flex:1;padding:14px 0;border-radius:12px;border:1.5px solid rgba(255,255,255,0.18);background:transparent;color:rgba(255,255,255,0.55);font-family:Manrope,sans-serif;font-size:15px;font-weight:600;cursor:pointer !important;transition:all 0.15s}
        .mk-cancel:hover{border-color:rgba(255,255,255,0.38);color:#fff}
        .mk-create{flex:2;padding:14px 0;border-radius:12px;border:none;background:${MARKEN_YELLOW};color:${MARKEN_BLACK};font-family:Manrope,sans-serif;font-size:15px;font-weight:700;cursor:pointer !important;letter-spacing:-0.02em;transition:opacity 0.15s}
        .mk-create:hover{opacity:0.88} .mk-create:disabled{opacity:0.35;cursor:not-allowed !important}
        .mk-xbtn{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.08);border:none;color:rgba(255,255,255,0.6);font-size:16px;cursor:pointer !important;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background 0.15s;line-height:1;font-family:Manrope,sans-serif}
        .mk-xbtn:hover{background:rgba(255,255,255,0.18);color:#fff}
        #mk-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);padding:11px 22px;border-radius:12px;font-family:Manrope,sans-serif;font-size:14px;font-weight:600;z-index: 99999;white-space:nowrap;pointer-events:none;animation:mkFadeIn 0.2s ease}
        #mk-toast.ok{background:${MARKEN_YELLOW};color:${MARKEN_BLACK}} #mk-toast.err{background:#EF4444;color:#fff}
        .mk-new-client-box{margin-top:10px;padding:14px;background:rgba(255,255,255,0.03);border-radius:12px;border:1.5px dashed rgba(251,255,18,0.18)}
        .mk-attach-row{display:flex;gap:10px;margin-top:10px;flex-wrap:wrap}
        .mk-attach-btn{display:flex;align-items:center;gap:7px;padding:9px 16px;border-radius:10px;border:1.5px solid rgba(255,255,255,0.13);background:transparent;color:rgba(255,255,255,0.5);font-family:Manrope,sans-serif;font-size:13px;font-weight:600;cursor:pointer !important;transition:all 0.15s}
        .mk-attach-btn:hover{border-color:rgba(251,255,18,0.35);color:${MARKEN_YELLOW}}
        .mk-pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
        .mk-pill{display:flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;background:rgba(251,255,18,0.1);border:1.5px solid rgba(251,255,18,0.22);color:${MARKEN_YELLOW};font-family:Manrope,sans-serif;font-size:12px;font-weight:600;max-width:260px}
        .mk-pill span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mk-pill-x{background:none;border:none;color:rgba(251,255,18,0.6);cursor:pointer !important;font-size:14px;padding:0;line-height:1;flex-shrink:0}
        .mk-pill-x:hover{color:${MARKEN_YELLOW}}
        .mk-link-row{margin-top:10px;display:flex;gap:8px}
        .mk-link-row .mk-input{flex:1}
        .mk-link-add{padding:0 18px;border-radius:10px;border:none;background:${MARKEN_YELLOW};color:${MARKEN_BLACK};font-family:Manrope,sans-serif;font-size:13px;font-weight:700;cursor:pointer !important;white-space:nowrap;transition:opacity 0.15s}
        .mk-link-add:hover{opacity:0.85}
    `
    document.head.appendChild(s)
}

function toast(msg: string, type: "ok" | "err") {
    document.getElementById("mk-toast")?.remove()
    const el = document.createElement("div")
    el.id = "mk-toast"; el.className = type; el.innerText = msg
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 3200)
}

function closeModal() {
    document.getElementById("mk-overlay")?.remove()
    document.getElementById("mk-modal")?.remove()
    delete (window as any)._mk
}

// ─────────────────────────────────────────────────────────────
// NEW PROJECT MODAL
//
// KEY ARCHITECTURE DECISION:
// All button interactions use inline onclick="window._mk.xxx()"
// This fires at AT_TARGET phase, BEFORE any parent capture
// listeners. Framer's event capture system cannot block it.
// This is the only reliable approach in Framer's published env.
// ─────────────────────────────────────────────────────────────
async function openNewProjectModal() {
    injectStyles()
    // Close any existing modal first
    closeModal()
    // Small delay ensures previous dialog is fully removed before creating new one
    await new Promise(r => setTimeout(r, 30))

    const domain = getDomain()
    const user   = getUser()

    const [clientsRes, employeesRes] = await Promise.all([
        supabase.from("clients").select("id, name").order("name"),
        supabase.from("users").select("username, full_name").eq("domain", domain).eq("role", "employee"),
    ])

    const clients:   any[] = clientsRes.data   ?? []
    const employees: any[] = employeesRes.data ?? []

    // ── Modal state ──
    let clientId: number | null = null
    let assignees: string[]     = []
    let priority                = "normal"
    let newClientMode           = false
    let attachedFiles: File[] = []
    let attachedLinks: string[]   = []
    let showLinkInput             = false
    let isCreating                = false

    // ── Helper: snapshot text field values before re-render ──
    function getVal(id: string): string {
        return (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement)?.value ?? ""
    }

    // ── Render function ──
    function render() {
        const modal = document.getElementById("mk-modal")
        if (!modal) return

        const titleVal     = getVal("mk-title")
        const briefVal     = getVal("mk-brief")
        const dueVal       = getVal("mk-due")
        const newClientVal = getVal("mk-new-client-name")
        const linkVal      = getVal("mk-link-val")

        modal.innerHTML = `
            <!-- Header -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:26px;">
                <h2 class="mk-title">New Project</h2>
                <button class="mk-xbtn" onclick="window._mk.close()">✕</button>
            </div>

            <!-- Title -->
            <div class="mk-field">
                <label class="mk-label">Project Title *</label>
                <input id="mk-title" class="mk-input" placeholder="e.g. Q2 Brand Campaign" value="${titleVal}" />
            </div>

            <!-- Client -->
            <div class="mk-field">
                <label class="mk-label">Client *</label>
                <select id="mk-client" class="mk-select" onchange="window._mk.setClient(this.value)">
                    <option value="">Select a client...</option>
                    ${clients.map((c: any) =>
                        `<option value="${c.id}" ${clientId === c.id ? "selected" : ""}>${c.name}</option>`
                    ).join("")}
                    <option value="new">+ Add New Client</option>
                </select>
                ${newClientMode ? `
                    <div class="mk-new-client-box">
                        <label class="mk-label" style="margin-bottom:8px;">New Client Name *</label>
                        <input id="mk-new-client-name" class="mk-input" placeholder="Client name" value="${newClientVal}" />
                    </div>` : ""}
            </div>

            <!-- Domain (read-only) -->
            <div class="mk-field">
                <label class="mk-label">Domain</label>
                <input class="mk-input" value="${DOMAIN_LABELS[domain]}" readonly style="opacity:0.45;cursor:not-allowed;" />
            </div>

            <!-- Brief + attachments -->
            <div class="mk-field">
                <label class="mk-label">Project Brief &amp; Attachments</label>
                <textarea id="mk-brief" class="mk-textarea"
                    placeholder="Describe the project goals, deliverables, and any context...">${briefVal}</textarea>
                ${(attachedFiles.length > 0 || attachedLinks.length > 0) ? `
                    <div class="mk-pills">
                        ${attachedFiles.map((f, i) => `
                            <div class="mk-pill">
                                <span>📄 ${f.name}</span>
                                <button class="mk-pill-x" onclick="window._mk.removeFile(${i})">✕</button>
                            </div>`).join("")}
                        ${attachedLinks.map((l, i) => `
                            <div class="mk-pill">
                                <span>🔗 ${l}</span>
                                <button class="mk-pill-x" onclick="window._mk.removeLink(${i})">✕</button>
                            </div>`).join("")}
                    </div>` : ""}
                <div class="mk-attach-row">
                    <label for="mk-file-input" class="mk-attach-btn" style="cursor:pointer !important;">📎 Attach Files</label>
                    <button class="mk-attach-btn" onclick="window._mk.showLink()">🔗 Add Link</button>
                </div>
                <input id="mk-file-input" type="file" multiple
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip,.fig,.ai,.psd,.mp4,.mov,.gif,.xlsx,.pptx"
                    style="display:none;" onchange="window._mk.fileChosen(this)" />
                ${showLinkInput ? `
                    <div class="mk-link-row">
                        <input id="mk-link-val" class="mk-input" placeholder="https://..." value="${linkVal}" />
                        <button class="mk-link-add" onclick="window._mk.addLink()">Add</button>
                    </div>` : ""}
            </div>

            <!-- Due date -->
            <div class="mk-field">
                <label class="mk-label">Due Date</label>
                <input id="mk-due" class="mk-input" type="date" value="${dueVal}" style="color-scheme:dark;" />
            </div>

            <!-- Priority -->
            <div class="mk-field">
                <label class="mk-label">Priority</label>
                <div class="mk-priority-row">
                    <button class="mk-pri ${priority === "normal" ? "sel-normal" : ""}" onclick="window._mk.setPri('normal')">Normal</button>
                    <button class="mk-pri ${priority === "high"   ? "sel-high"   : ""}" onclick="window._mk.setPri('high')">High</button>
                    <button class="mk-pri ${priority === "urgent" ? "sel-urgent" : ""}" onclick="window._mk.setPri('urgent')">Urgent</button>
                </div>
            </div>

            <!-- Assignees -->
            <div class="mk-field">
                <label class="mk-label">Assign To</label>
                ${employees.length === 0
                    ? `<p style="color:rgba(255,255,255,0.3);font-family:Manrope,sans-serif;font-size:13px;margin:4px 0 0;">No employees in this domain yet.</p>`
                    : `<div class="mk-chips">
                        ${employees.map((e: any) => `
                            <div class="mk-chip ${assignees.includes(e.username) ? "on" : ""}"
                                onclick="window._mk.toggleAssignee('${e.username}')">
                                ${e.full_name}
                            </div>`).join("")}
                       </div>`
                }
            </div>

            <div class="mk-divider"></div>

            <!-- Action buttons -->
            <div class="mk-btn-row">
                <button class="mk-cancel" onclick="window._mk.close()">Cancel</button>
                <button class="mk-create" id="mk-create-btn" onclick="window._mk.create()"
                    ${isCreating ? "disabled" : ""}>
                    ${isCreating ? "Creating..." : "Create Project"}
                </button>
            </div>
        `

        // Focus link input if just shown
        if (showLinkInput && !linkVal) {
            setTimeout(() => document.getElementById("mk-link-val")?.focus(), 30)
        }
    }

    // ── Expose all handlers to window._mk ──
    // This is the core architectural decision — inline onclick handlers
    // reference window._mk.xxx() which cannot be blocked by any
    // parent event capture layer in Framer's published environment.
    ;(window as any)._mk = {

        close() {
            closeModal()
        },

        setClient(val: string) {
            if (val === "new") { newClientMode = true; clientId = null }
            else { newClientMode = false; clientId = val ? parseInt(val) : null }
            render()
        },

        setPri(p: string) {
            priority = p; render()
        },

        toggleAssignee(username: string) {
            assignees = assignees.includes(username)
                ? assignees.filter(u => u !== username)
                : [...assignees, username]
            render()
        },

        fileChosen(input: HTMLInputElement) {
            const files = Array.from(input.files ?? [])
            if (files.length) {
                attachedFiles = [...attachedFiles, ...files]
                render()
            }
            // Reset input so same file can be re-selected
            input.value = ""
        },

        removeFile(index: number) {
            attachedFiles = attachedFiles.filter((_, i) => i !== index)
            render()
        },

        showLink() {
            showLinkInput = true; render()
        },

        addLink() {
            const val = (document.getElementById("mk-link-val") as HTMLInputElement)?.value.trim()
            if (val) {
                attachedLinks = [...attachedLinks, val]
                showLinkInput = false
                render()
            }
        },

        removeLink(i: number) {
            attachedLinks = attachedLinks.filter((_, idx) => idx !== i)
            render()
        },

        async create() {
            if (isCreating) return

            const title    = (document.getElementById("mk-title")           as HTMLInputElement)?.value.trim()
            const brief    = (document.getElementById("mk-brief")           as HTMLTextAreaElement)?.value.trim()
            const due      = (document.getElementById("mk-due")             as HTMLInputElement)?.value || null
            const newCName = (document.getElementById("mk-new-client-name") as HTMLInputElement)?.value.trim()

            if (!title) { toast("Please enter a project title", "err"); return }

            let finalClientId = clientId

            if (newClientMode) {
                if (!newCName) { toast("Please enter a client name", "err"); return }
                const { data: nc, error: ce } = await supabase
                    .from("clients").insert({ name: newCName, created_by: user.username })
                    .select().single()
                if (ce || !nc) { toast("Failed to create client", "err"); return }
                finalClientId = nc.id; clients.push(nc)
            }

            if (!finalClientId) { toast("Please select or create a client", "err"); return }

            isCreating = true; render()

            let fullBrief = brief || ""
            if (attachedLinks.length > 0)
                fullBrief += (fullBrief ? "\n\nLinks:\n" : "Links:\n") + attachedLinks.join("\n")

            const { data: proj, error: pe } = await supabase
                .from("projects")
                .insert({
                    title, client_id: finalClientId, domain,
                    brief: fullBrief || null, due_date: due, priority,
                    status: "assigned", created_by: user.username,
                    is_pair_project: assignees.length > 1,
                })
                .select().single()

            if (pe || !proj) {
                toast("Failed to create project — check console", "err")
                console.error("Project insert error:", pe)
                isCreating = false; render(); return
            }

            // Upload brief files — multiple allowed, paths stored as JSON array
            if (attachedFiles.length > 0) {
                const uploadedPaths: string[] = []
                for (let fi = 0; fi < attachedFiles.length; fi++) {
                    const f   = attachedFiles[fi]
                    const ext = f.name.split(".").pop() ?? "file"
                    const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 40)
                    const path = `${proj.id}/brief_${fi}_${safeName}`
                    const { error: upErr } = await supabase.storage
                        .from("submissions").upload(path, f, { upsert: true, contentType: f.type })
                    if (upErr) {
                        toast(`File "${f.name}" failed: ${upErr.message}`, "err")
                    } else {
                        uploadedPaths.push(path)
                    }
                }
                if (uploadedPaths.length > 0) {
                    await supabase.from("projects")
                        .update({ brief_file: JSON.stringify(uploadedPaths) })
                        .eq("id", proj.id)
                }
            }

            // Add members + notifications
            if (assignees.length > 0) {
                await supabase.from("project_members").insert(
                    assignees.map((u, i) => ({
                        project_id: proj.id, username: u,
                        role_in_project: i === 0 ? "lead" : "support",
                        assigned_by: user.username,
                    }))
                )
                await supabase.from("notifications").insert(
                    assignees.map(u => ({
                        for_user: u, type: "project_assigned",
                        message: `You've been assigned to "${title}"`,
                        project_id: proj.id, is_read: false,
                    }))
                )
            }

            closeModal()
            toast(`"${title}" created!`, "ok")
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent("marken-projects-updated"))
            }, 300)
        },
    }

    // ── Create overlay + modal, append to document.body ──
    const overlay = document.createElement("div")
    overlay.id = "mk-overlay"
    overlay.setAttribute("onclick", "window._mk.close()")
    document.body.appendChild(overlay)

    const modal = document.createElement("div")
    modal.id = "mk-modal"
    modal.addEventListener("click", (e) => e.stopPropagation())
    document.body.appendChild(modal)

    render()
}

// ══════════════════════════════════════════════
// FRAMER OVERRIDES
// ══════════════════════════════════════════════

export function NavUsername(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const user = getUser()
        const first = (user.full_name ?? "").split(" ")[0] || "there"
        return <Component {...props} text={`Welcome back, ${first}`} />
    }
}

export function DomainTitle(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        return <Component {...props} text={DOMAIN_LABELS[getDomain()] ?? "Dashboard"} />
    }
}

export function BackButton(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const user = getUser()
        const visible = user.role === "admin"
        const ref = useRef<HTMLDivElement>(null)
        // Set display:contents on wrapper via JS (never as React prop — crashes editor)
        // Set opacity/pointer-events with !important on child so Framer can't override
        useLayoutEffect(() => {
            const wrap = ref.current
            if (!wrap) return
            wrap.style.setProperty("display", visible ? "contents" : "none", "important")
            const el = wrap.firstElementChild as HTMLElement | null
            if (!el) return
            el.style.setProperty("display",        visible ? "flex"  : "none", "important")
            el.style.setProperty("pointer-events", visible ? "auto"  : "none", "important")
        })
        return (
            <div ref={ref}>
                <Component {...props}
                    onClick={() => { window.location.href = "/admin-dashboard" }}
                />
            </div>
        )
    }
}

export function NewProjectBtn(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const user = getUser()
        const visible = user.role === "admin" || user.role === "head"
        const ref = useRef<HTMLDivElement>(null)
        useLayoutEffect(() => {
            const wrap = ref.current
            if (!wrap) return
            wrap.style.setProperty("display", visible ? "contents" : "none", "important")
            const el = wrap.firstElementChild as HTMLElement | null
            if (!el) return
            el.style.setProperty("display",        visible ? "flex"  : "none", "important")
            el.style.setProperty("pointer-events", visible ? "auto"  : "none", "important")
            el.style.setProperty("cursor",         "pointer",                  "important")
        })
        return (
            <div ref={ref}>
                <Component {...props}
                    onClick={() => {
                        if ((window as any)._mkOpening) return
                        ;(window as any)._mkOpening = true
                        setTimeout(() => { delete (window as any)._mkOpening }, 800)
                        openNewProjectModal()
                    }}
                />
            </div>
        )
    }
}

export function StatsStrip(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const user = getUser()
        const visible = user.role === "admin" || user.role === "head"
        const ref = useRef<HTMLDivElement>(null)
        useLayoutEffect(() => {
            const wrap = ref.current
            if (!wrap) return
            wrap.style.setProperty("display", visible ? "contents" : "none", "important")
            const el = wrap.firstElementChild as HTMLElement | null
            if (!el) return
            el.style.setProperty("display",        visible ? "flex"  : "none", "important")
            el.style.setProperty("pointer-events", visible ? "auto"  : "none", "important")
        })
        return (
            <div ref={ref}>
                <Component {...props} />
            </div>
        )
    }
}

export function StatActive(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const s = useStats(getDomain())
        return <Component {...props} text={s ? String(s.active) : "—"} />
    }
}

export function StatInReview(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const s = useStats(getDomain())
        return <Component {...props} text={s ? String(s.inReview) : "—"} />
    }
}

export function StatOverdue(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const s = useStats(getDomain())
        return <Component {...props} text={s ? String(s.overdue) : "—"} />
    }
}

export function StatDueSoon(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const s = useStats(getDomain())
        return <Component {...props} text={s ? String(s.dueSoon) : "—"} />
    }
}

export function FilterAll(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const active = useFilter("all")
        return <Component {...props} variant={active ? "active" : "inactive"}
            onClick={() => fireFilter("all")}
            style={{ ...props.style, cursor: "pointer" }} />
    }
}

export function FilterAssigned(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const active = useFilter("assigned")
        return <Component {...props} variant={active ? "active" : "inactive"}
            onClick={() => fireFilter("assigned")}
            style={{ ...props.style, cursor: "pointer" }} />
    }
}

export function FilterInProgress(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const active = useFilter("in_progress")
        return <Component {...props} variant={active ? "active" : "inactive"}
            onClick={() => fireFilter("in_progress")}
            style={{ ...props.style, cursor: "pointer" }} />
    }
}

export function FilterInReview(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const active = useFilter("in_review")
        return <Component {...props} variant={active ? "active" : "inactive"}
            onClick={() => fireFilter("in_review")}
            style={{ ...props.style, cursor: "pointer" }} />
    }
}

export function FilterApproved(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const active = useFilter("approved")
        return <Component {...props} variant={active ? "active" : "inactive"}
            onClick={() => fireFilter("approved")}
            style={{ ...props.style, cursor: "pointer" }} />
    }
}

export function ProjectGrid(Component: ComponentType<any>): ComponentType<any> {
    return function WrappedGrid(props) {
        const domain = getDomain()
        const { projects, loading } = useProjects(domain)
        const [filter, setFilter] = useState("all")

        useEffect(() => { injectStyles() }, [])

        useEffect(() => {
            const h = (e: any) => setFilter(e.detail.filter)
            window.addEventListener(FILTER_EVENT, h)
            return () => window.removeEventListener(FILTER_EVENT, h)
        }, [])

        const filtered = filter === "all"
            ? projects
            : projects.filter((p: any) => p.status === filter)

        return (
            <div style={{
                width: "100%",
                height: "100%",
                minHeight: "200px",
                background: "transparent",
                backgroundColor: "transparent",
                display: "flex", flexDirection: "column" as const,
                gap: "16px", padding: "8px 0", boxSizing: "border-box" as const,
            }}>
                {loading ? (
                    [1, 2].map(i => (
                        <div key={i} style={{ background: CARD_BG, borderRadius: "16px", height: "160px", opacity: 0.4, width: "100%" }} />
                    ))
                ) : filtered.length === 0 ? (
                    <div style={{
                        background: CARD_BG, borderRadius: "16px", padding: "48px 24px",
                        textAlign: "center" as const, color: "rgba(255,255,255,0.35)",
                        fontFamily: "Manrope, sans-serif", fontSize: "15px", fontWeight: "600",
                        letterSpacing: "-0.02em", width: "100%", boxSizing: "border-box" as const,
                    }}>
                        No Projects to show!
                    </div>
                ) : (
                    filtered.map((project: any) => {
                        const status   = project.status   ?? "assigned"
                        const priority = project.priority ?? "normal"
                        const client   = project.clients?.name ?? "Unknown Client"
                        const assignee = getAssignees(project.project_members ?? [])
                        return (
                            <div key={project.id} className="mk-card"
                                onClick={() => { window.location.href = `/project?id=${project.id}` }}
                                style={{
                                    background: CARD_BG, borderRadius: "16px", padding: "20px",
                                    cursor: "pointer", position: "relative" as const, overflow: "hidden",
                                    boxShadow: "0 4px 16px rgba(0,0,0,0.2)", width: "100%", boxSizing: "border-box" as const,
                                }}
                            >
                                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "5px", background: STATUS_COLOR[status] ?? MARKEN_YELLOW, borderRadius: "16px 16px 0 0" }} />
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", marginBottom: "14px" }}>
                                    <div style={{ background: STATUS_COLOR[status] ?? MARKEN_YELLOW, color: STATUS_TEXT_COLOR[status] ?? MARKEN_BLACK, padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: "700", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.02em" }}>
                                        {STATUS_LABELS[status] ?? status}
                                    </div>
                                    <div style={{ background: PRIORITY_BG[priority] ?? PRIORITY_BG.normal, color: WHITE, padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: "600", fontFamily: "Manrope, sans-serif" }}>
                                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                    </div>
                                </div>
                                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", fontFamily: "Manrope, sans-serif", marginBottom: "4px" }}>{client}</div>
                                <div style={{ color: WHITE, fontSize: "18px", fontWeight: "700", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.05em", marginBottom: "8px", lineHeight: "1.3" }}>{project.title}</div>
                                <div style={{ color: "rgba(255,255,255,0.38)", fontSize: "13px", fontFamily: "Manrope, sans-serif", marginBottom: "16px", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {project.brief ?? "No brief added yet."}
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <div style={{ color: "rgba(255,255,255,0.38)", fontSize: "12px", fontFamily: "Manrope, sans-serif" }}>{formatDate(project.due_date)}</div>
                                    <div style={{ color: "rgba(255,255,255,0.38)", fontSize: "12px", fontFamily: "Manrope, sans-serif" }}>→ {assignee}</div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        )
    }
}

// ══════════════════════════════════════════════
// NOTIFICATION BELL
// Attach: NotificationBell → "notification" layer
// ══════════════════════════════════════════════

function injectBellStyles() {
    if (document.getElementById("mk-bell-styles")) return
    const s = document.createElement("style")
    s.id = "mk-bell-styles"
    s.innerHTML = `
        /* ── Bell wrapper ── */
        #mk-bell-wrap {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            overflow: visible !important;
            padding: 6px !important;
        }
        /* ── Unread badge ── */
        #mk-bell-badge {
            min-width: 18px; height: 18px;
            padding: 0 5px;
            border-radius: 999px;
            background: #EF4444;
            color: #fff;
            font-family: Manrope, sans-serif;
            font-size: 10px; font-weight: 800;
            display: flex; align-items: center; justify-content: center;
            line-height: 1;
            box-shadow: 0 0 0 2px #1a1b12;
        }
        /* ── Dropdown panel ── */
        #mk-bell-dropdown {
            position: fixed;
            top: 66px; right: 20px;
            width: min(360px, calc(100vw - 24px));
            max-height: 480px;
            background: #22231A;
            border: 1px solid rgba(255,255,255,0.09);
            border-radius: 18px;
            box-shadow: 0 16px 48px rgba(0,0,0,0.55);
            z-index: 99980;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            animation: mkBellDrop 0.22s cubic-bezier(0.34,1.2,0.64,1);
            font-family: Manrope, sans-serif;
        }
        @keyframes mkBellDrop {
            from { opacity: 0; transform: translateY(-10px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }
        #mk-bell-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 16px 18px 12px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            flex-shrink: 0;
        }
        #mk-bell-header span {
            font-size: 14px; font-weight: 800;
            letter-spacing: -0.04em; color: #fff;
        }
        #mk-bell-mark-all {
            font-size: 11px; font-weight: 700;
            color: rgba(251,255,18,0.7);
            background: none; border: none;
            cursor: pointer; padding: 4px 8px;
            border-radius: 6px; transition: background 0.15s;
            font-family: Manrope, sans-serif;
        }
        #mk-bell-mark-all:hover { background: rgba(251,255,18,0.08); color: #FBFF12; }
        #mk-bell-list {
            overflow-y: auto;
            flex: 1;
        }
        #mk-bell-list::-webkit-scrollbar { width: 4px; }
        #mk-bell-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .mk-notif-item {
            display: flex; align-items: flex-start; gap: 12px;
            padding: 14px 18px;
            border-bottom: 1px solid rgba(255,255,255,0.04);
            cursor: pointer;
            transition: background 0.12s;
        }
        .mk-notif-item:hover { background: rgba(255,255,255,0.04); }
        .mk-notif-item.unread { background: rgba(251,255,18,0.04); }
        .mk-notif-item.unread:hover { background: rgba(251,255,18,0.08); }
        .mk-notif-icon {
            width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
            font-size: 15px;
        }
        .mk-notif-icon.assigned   { background: rgba(251,255,18,0.12); }
        .mk-notif-icon.approved   { background: rgba(34,197,94,0.12);  }
        .mk-notif-icon.changes    { background: rgba(239,68,68,0.12);  }
        .mk-notif-body { flex: 1; min-width: 0; }
        .mk-notif-msg {
            font-size: 13px; font-weight: 600;
            color: rgba(255,255,255,0.8);
            line-height: 1.45;
            margin: 0 0 4px;
        }
        .mk-notif-item.unread .mk-notif-msg { color: #fff; }
        .mk-notif-time {
            font-size: 11px; color: rgba(255,255,255,0.28);
        }
        .mk-notif-dot {
            width: 7px; height: 7px; border-radius: 50%;
            background: #FBFF12; flex-shrink: 0; margin-top: 5px;
        }
        .mk-notif-empty {
            padding: 40px 20px;
            text-align: center;
            font-size: 13px; font-weight: 600;
            color: rgba(255,255,255,0.2);
        }
        /* ── Click-outside backdrop ── */
        #mk-bell-backdrop {
            position: fixed; inset: 0;
            z-index: 99979;
        }
    `
    document.head.appendChild(s)
}

function notifIcon(type: string): string {
    if (type === "project_assigned")  return "📋"
    if (type === "project_approved")  return "✅"
    if (type === "changes_requested") return "↩"
    return "🔔"
}
function notifIconClass(type: string): string {
    if (type === "project_assigned")  return "assigned"
    if (type === "project_approved")  return "approved"
    if (type === "changes_requested") return "changes"
    return "assigned"
}
function notifTimeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1)  return "just now"
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
}

export function NotificationBell(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props: any) {
        if (isEditor()) return <Component {...props} />
        const [notifs, setNotifs]       = useState<any[]>([])
        const [open, setOpen]           = useState(false)
        const [loading, setLoading]     = useState(true)
        // Store username in state so we can retry if sessionStorage isn't ready yet
        const [username, setUsername]   = useState<string>("")
        const ref = useRef<HTMLDivElement>(null)
        const channelRef = useRef<any>(null)

        const unread = notifs.filter(n => !n.is_read).length

        // ── Load notifications for a given username ──
        async function load(uname: string) {
            if (!uname) return
            const { data, error } = await supabase
                .from("notifications")
                .select("id,type,message,project_id,is_read,created_at")
                .eq("for_user", uname)
                .order("created_at", { ascending: false })
                .limit(40)
            if (error) console.error("[MarkenOS] notifications load error:", error)
            setNotifs(data ?? [])
            setLoading(false)
        }

        // ── Subscribe realtime for a given username ──
        function subscribe(uname: string) {
            if (!uname) return
            if (channelRef.current) supabase.removeChannel(channelRef.current)
            channelRef.current = supabase.channel(`notifs-${uname}-${Date.now()}`)
                .on("postgres_changes", {
                    event: "INSERT", schema: "public", table: "notifications",
                    filter: `for_user=eq.${uname}`,
                }, payload => {
                    setNotifs(prev => [payload.new as any, ...prev])
                })
                .subscribe()
        }

        // ── Mark one as read ──
        async function markOne(id: number) {
            setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
            await supabase.from("notifications").update({ is_read: true }).eq("id", id)
        }

        // ── Mark all as read ──
        async function markAll() {
            setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
            await supabase.from("notifications")
                .update({ is_read: true })
                .eq("for_user", username)
                .eq("is_read", false)
        }

        // ── Toggle dropdown ──
        function toggle() {
            if ((window as any)._mkBellGuard) return
            ;(window as any)._mkBellGuard = true
            setTimeout(() => delete (window as any)._mkBellGuard, 400)
            setOpen(o => !o)
        }

        useEffect(() => {
            injectBellStyles()

            // Retry getting username — sessionStorage may not be ready
            // on the very first render after a login redirect
            function init() {
                const u = getUser()
                if (u.username) {
                    setUsername(u.username)
                    load(u.username)
                    subscribe(u.username)
                } else {
                    // Not ready yet — retry in 300ms
                    setTimeout(init, 300)
                }
            }
            init()

            return () => {
                if (channelRef.current) supabase.removeChannel(channelRef.current)
            }
        }, [])

        // Force cursor:pointer on the wrap element itself via DOM mutation
        useLayoutEffect(() => {
            if (!ref.current) return
            ref.current.style.setProperty("cursor", "pointer", "important")
            ref.current.style.setProperty("overflow", "visible", "important")
        })

        function renderDropdown() {
            return (
                <>
                    {/* Click-outside backdrop */}
                    <div id="mk-bell-backdrop" onClick={() => setOpen(false)} />

                    {/* Dropdown */}
                    <div id="mk-bell-dropdown">
                        <div id="mk-bell-header">
                            <span>Notifications {unread > 0 ? `(${unread})` : ""}</span>
                            <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                                {unread > 0 && (
                                    <button id="mk-bell-mark-all" onClick={(e) => { e.stopPropagation(); markAll() }}>
                                        Mark all read
                                    </button>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setOpen(false) }}
                                    style={{
                                        width:"28px",height:"28px",borderRadius:"50%",
                                        background:"rgba(255,255,255,0.08)",border:"none",
                                        color:"rgba(255,255,255,0.55)",fontSize:"14px",
                                        cursor:"pointer",display:"flex",alignItems:"center",
                                        justifyContent:"center",flexShrink:0,transition:"background 0.15s",
                                        fontFamily:"Manrope,sans-serif",lineHeight:"1",
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background="rgba(255,255,255,0.16)")}
                                    onMouseLeave={e => (e.currentTarget.style.background="rgba(255,255,255,0.08)")}
                                >✕</button>
                            </div>
                        </div>
                        <div id="mk-bell-list">
                            {loading ? (
                                <div className="mk-notif-empty">Loading…</div>
                            ) : notifs.length === 0 ? (
                                <div className="mk-notif-empty">You're all caught up 🎉</div>
                            ) : (
                                notifs.map(n => (
                                    <div
                                        key={n.id}
                                        className={`mk-notif-item${n.is_read ? "" : " unread"}`}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            markOne(n.id)
                                            if (n.project_id) {
                                                window.location.href = `/project?id=${n.project_id}`
                                            }
                                        }}
                                    >
                                        <div className={`mk-notif-icon ${notifIconClass(n.type)}`}>
                                            {notifIcon(n.type)}
                                        </div>
                                        <div className="mk-notif-body">
                                            <p className="mk-notif-msg">{n.message}</p>
                                            <span className="mk-notif-time">{notifTimeAgo(n.created_at)}</span>
                                        </div>
                                        {!n.is_read && <div className="mk-notif-dot" />}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )
        }

        // Badge: injected directly into document.body as a raw DOM node.
        // This is the ONLY reliable way to escape overflow:hidden on Framer
        // parent frames, while keeping a single React root (no Fragment).
        useLayoutEffect(() => {
            let badge = document.getElementById("mk-bell-badge-fixed") as HTMLElement | null
            if (unread === 0) {
                badge?.remove()
                return
            }
            if (!ref.current) return
            const r = ref.current.getBoundingClientRect()
            if (!badge) {
                badge = document.createElement("div")
                badge.id = "mk-bell-badge-fixed"
                badge.style.cssText = `
                    position: fixed;
                    min-width: 18px; height: 18px;
                    padding: 0 5px;
                    border-radius: 999px;
                    background: #EF4444;
                    color: #fff;
                    font-family: Manrope, sans-serif;
                    font-size: 10px; font-weight: 800;
                    display: flex; align-items: center; justify-content: center;
                    line-height: 1;
                    pointer-events: none;
                    z-index: 99999;
                    box-shadow: 0 0 0 2px #1a1b12;
                `
                document.body.appendChild(badge)
            }
            badge.style.top  = `${r.top + 2}px`
            badge.style.right = `${window.innerWidth - r.right + 2}px`
            badge.textContent = unread > 99 ? "99+" : String(unread)
        })

        // Clean up badge DOM node on unmount
        useEffect(() => {
            return () => { document.getElementById("mk-bell-badge-fixed")?.remove() }
        }, [])

        // Single root — no Fragment. Framer requires a single root element.
        return (
            <div ref={ref} id="mk-bell-wrap" onClick={toggle}>
                <Component {...props} />
                {open && renderDropdown()}
            </div>
        )
    }
}

// ══════════════════════════════════════════════
// ACCOUNT ICON
// Attach: AccountIcon → whatever layer/icon you
// place next to the bell in the nav bar
// Navigates to /account on click
// ══════════════════════════════════════════════

export function AccountIcon(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props: any) {
        if (isEditor()) return <Component {...props} />
        return (
            <Component {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => { window.location.href = "/account" }}
            />
        )
    }
}

// ══════════════════════════════════════════════
// LOGOUT BUTTON
// Attach: LogoutBtn → any logout button/icon in nav
// Writes clock_out, clears session, redirects to login
// ══════════════════════════════════════════════

export function LogoutBtn(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props: any) {
        if (isEditor()) return <Component {...props} />

        async function handleLogout() {
            if ((window as any)._mkLogoutGuard) return
            ;(window as any)._mkLogoutGuard = true

            const user = getUser()
            // ── Clock out ──
            if (user.username) {
                try {
                    const today = new Date().toISOString().split("T")[0]
                    // Find open clock-in record for today
                    const { data: rec } = await supabase
                        .from("attendance")
                        .select("id")
                        .eq("username", user.username)
                        .eq("date", today)
                        .is("clock_out", null)
                        .limit(1)
                    if (rec && rec.length > 0) {
                        await supabase.from("attendance")
                            .update({ clock_out: new Date().toISOString() })
                            .eq("id", rec[0].id)
                    }
                } catch (e) { console.warn("[MarkenOS] clock-out failed:", e) }
            }

            sessionStorage.removeItem("marken_user")
            window.location.href = "/"
        }

        return (
            <Component {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={handleLogout}
            />
        )
    }
}
