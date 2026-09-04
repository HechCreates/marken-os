// adminOverride.tsx
// Wires the entire admin dashboard to Supabase.
//
// ATTACH OVERRIDES AS FOLLOWS:
//
// NavUsername          → "Harsha Bhat" text layer inside "nav bar"
// WelcomeText          → "Welcome back, Hars" text layer
//
// StatActiveProjects   → "44" text inside "active projects" frame
// StatOverdue          → "44" text inside "overdue projects" frame
// StatPending          → "44" text inside "pending apporvals" frame
// StatClients          → "44" text inside "total clients" frame
//
// DomainCountMarketing → "44" text inside "marketing, sales active proj..." group
// DomainCountDesign    → "44" text inside "design, creatives active proj..." group
// DomainCountSocial    → "44" text inside "social media active projects" group
// DomainCountWebdev    → "44" text inside "website des and dev active j..." group
//
// ActivityLine1        → first activity text layer inside "recent activity"
// ActivityLine2        → second activity text layer inside "recent activity"
// ActivityLine3        → third activity text layer inside "recent activity"

import type { ComponentType } from "react"
import { useEffect, useState } from "react"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
    "https://kufsbpaleeawqmtlnnno.supabase.co",
    "sb_publishable_S3HP2seIYkKSuBoXrRyp3g_2_cWKoLd"
)

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type Stats = {
    active:    number
    overdue:   number
    pending:   number
    clients:   number
    marketing: number
    design:    number
    social:    number
    webdev:    number
}

// ─────────────────────────────────────────────
// SHARED CACHE
// All overrides on the page share one fetch.
// No duplicate Supabase calls when multiple
// overrides mount at the same time.
// ─────────────────────────────────────────────
let _stats:             Stats | null     = null
let _activity:          string[] | null  = null
let _statsListeners:    Array<(s: Stats)    => void> = []
let _activityListeners: Array<(a: string[]) => void> = []
let _statsFetching    = false
let _activityFetching = false

// ─────────────────────────────────────────────
// STATS FETCH
// ─────────────────────────────────────────────
async function loadStats() {
    if (_stats)      { _statsListeners.forEach(fn => fn(_stats!)); return }
    if (_statsFetching) return
    _statsFetching = true

    const today = new Date().toISOString().split("T")[0]

    const [
        activeRes, overdueRes, pendingRes, clientsRes,
        marketingRes, designRes, socialRes, webdevRes,
    ] = await Promise.all([
        supabase.from("projects").select("id", { count: "exact", head: true })
            .neq("status", "approved"),
        supabase.from("projects").select("id", { count: "exact", head: true })
            .lt("due_date", today).neq("status", "approved"),
        supabase.from("projects").select("id", { count: "exact", head: true })
            .eq("status", "in_review"),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("projects").select("id", { count: "exact", head: true })
            .eq("domain", "marketing").neq("status", "approved"),
        supabase.from("projects").select("id", { count: "exact", head: true })
            .eq("domain", "design").neq("status", "approved"),
        supabase.from("projects").select("id", { count: "exact", head: true })
            .eq("domain", "socialmedia").neq("status", "approved"),
        supabase.from("projects").select("id", { count: "exact", head: true })
            .eq("domain", "webdev").neq("status", "approved"),
    ])

    _stats = {
        active:    activeRes.count    ?? 0,
        overdue:   overdueRes.count   ?? 0,
        pending:   pendingRes.count   ?? 0,
        clients:   clientsRes.count   ?? 0,
        marketing: marketingRes.count ?? 0,
        design:    designRes.count    ?? 0,
        social:    socialRes.count    ?? 0,
        webdev:    webdevRes.count    ?? 0,
    }

    _statsFetching = false
    _statsListeners.forEach(fn => fn(_stats!))
    _statsListeners = []
}

function useStats(): Stats | null {
    const [stats, setStats] = useState<Stats | null>(_stats)
    useEffect(() => {
        if (_stats) { setStats(_stats); return }
        _statsListeners.push(setStats)
        loadStats()
    }, [])
    return stats
}

// ─────────────────────────────────────────────
// ACTIVITY FETCH
// Merges recent submissions + comments into
// a single human-readable activity feed
// ─────────────────────────────────────────────
const DOMAIN_LABELS: Record<string, string> = {
    marketing:   "Marketing",
    design:      "Design",
    socialmedia: "Social Media",
    webdev:      "Web Dev",
}

async function loadActivity() {
    // Always bust cache — never serve stale activity
    _activity = null
    if (_activityFetching) return
    _activityFetching = true

    // Split FK joins into separate queries to avoid RLS silent failures
    const [subRes, commentRes, approvedRes] = await Promise.all([
        supabase.from("submissions")
            .select("id, submitted_by, version, created_at, project_id")
            .order("created_at", { ascending: false })
            .limit(8),
        supabase.from("comments")
            .select("id, from_user, created_at, project_id")
            .not("from_user", "eq", "__system__")
            .order("created_at", { ascending: false })
            .limit(8),
        // Approvals = projects with status=approved, ordered by updated_at
        supabase.from("projects")
            .select("id, title, domain, updated_at, status")
            .eq("status", "approved")
            .order("updated_at", { ascending: false })
            .limit(6),
    ])

    // Collect all project IDs we need titles for
    const projIds = [
        ...new Set([
            ...(subRes.data ?? []).map((s: any) => s.project_id),
            ...(commentRes.data ?? []).map((c: any) => c.project_id),
        ].filter(Boolean))
    ]

    // Fetch project titles + domains in one query
    const projMap: Record<string, { title: string; domain: string }> = {}
    if (projIds.length > 0) {
        const { data: projData } = await supabase
            .from("projects")
            .select("id, title, domain")
            .in("id", projIds)
        projData?.forEach((p: any) => {
            projMap[p.id] = { title: p.title, domain: p.domain }
        })
    }

    const items: Array<{ text: string; time: string }> = []

    subRes.data?.forEach((s: any) => {
        const proj   = projMap[s.project_id]
        const title  = proj?.title ?? "a project"
        const domain = DOMAIN_LABELS[proj?.domain ?? ""] ?? ""
        const v      = s.version > 1 ? ` (v${s.version})` : ""
        items.push({
            text: `${s.submitted_by} submitted work on "${title}"${v} — ${domain}`,
            time: s.created_at,
        })
    })

    commentRes.data?.forEach((c: any) => {
        const proj   = projMap[c.project_id]
        const title  = proj?.title ?? "a project"
        const domain = DOMAIN_LABELS[proj?.domain ?? ""] ?? ""
        items.push({
            text: `${c.from_user} commented on "${title}" — ${domain}`,
            time: c.created_at,
        })
    })

    approvedRes.data?.forEach((p: any) => {
        const domain = DOMAIN_LABELS[p.domain] ?? ""
        items.push({
            text: `"${p.title}" was approved — ${domain}`,
            time: p.updated_at,
        })
    })

    // Sort newest first, take top 8
    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    _activity = items.slice(0, 8).map(i => i.text)

    if (_activity.length === 0) {
        _activity = ["No recent activity yet.", "", ""]
    }

    _activityFetching = false
    _activityListeners.forEach(fn => fn(_activity!))
    _activityListeners = []
}

function useActivity(): string[] {
    const [activity, setActivity] = useState<string[]>(_activity ?? [])
    useEffect(() => {
        if (_activity) { setActivity(_activity); return }
        _activityListeners.push(setActivity)
        loadActivity()
    }, [])
    return activity
}

// ─────────────────────────────────────────────
// SESSION HELPER
// ─────────────────────────────────────────────
function isEditor(): boolean {
    try {
        return window.location.href.includes("framer.com") ||
               window.location.href.includes("framerstatic.com")
    } catch { return true }
}

function getSessionUser() {
    try { return JSON.parse(sessionStorage.getItem("marken_user") ?? "{}") }
    catch { return {} }
}

// ─────────────────────────────────────────────
// OVERRIDE 1: NavUsername
// Attach to "Harsha Bhat" text layer in nav bar
// ─────────────────────────────────────────────
export function NavUsername(Component: ComponentType<any>): ComponentType<any> {
    return function WrappedNavUsername(props) {
        const user = getSessionUser()
        return <Component {...props} text={user.full_name ?? "—"} />
    }
}

// ─────────────────────────────────────────────
// OVERRIDE 2: WelcomeText
// Attach to "Welcome back, Hars" text layer
// ─────────────────────────────────────────────
export function WelcomeText(Component: ComponentType<any>): ComponentType<any> {
    return function WrappedWelcomeText(props) {
        const user = getSessionUser()
        const firstName = (user.full_name ?? "").split(" ")[0] || "there"
        return <Component {...props} text={`Welcome back, ${firstName}!`} />
    }
}

// ─────────────────────────────────────────────
// OVERRIDE 3: StatActiveProjects
// Attach to "44" text inside "active projects"
// ─────────────────────────────────────────────
export function StatActiveProjects(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const stats = useStats()
        return <Component {...props} text={stats ? String(stats.active) : "—"} />
    }
}

// ─────────────────────────────────────────────
// OVERRIDE 4: StatOverdue
// Attach to "44" text inside "overdue projects"
// ─────────────────────────────────────────────
export function StatOverdue(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const stats = useStats()
        return <Component {...props} text={stats ? String(stats.overdue) : "—"} />
    }
}

// ─────────────────────────────────────────────
// OVERRIDE 5: StatPending
// Attach to "44" text inside "pending apporvals"
// ─────────────────────────────────────────────
export function StatPending(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const stats = useStats()
        return <Component {...props} text={stats ? String(stats.pending) : "—"} />
    }
}

// ─────────────────────────────────────────────
// OVERRIDE 6: StatClients
// Attach to "44" text inside "total clients"
// ─────────────────────────────────────────────
export function StatClients(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const stats = useStats()
        return <Component {...props} text={stats ? String(stats.clients) : "—"} />
    }
}

// ─────────────────────────────────────────────
// OVERRIDE 7: DomainCountMarketing
// Attach to "44" text inside
// "marketing, sales active proj..." group
// ─────────────────────────────────────────────
export function DomainCountMarketing(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const stats = useStats()
        return <Component {...props} text={stats ? String(stats.marketing) : "—"} />
    }
}

// ─────────────────────────────────────────────
// OVERRIDE 8: DomainCountDesign
// Attach to "44" text inside
// "design, creatives active proj..." group
// ─────────────────────────────────────────────
export function DomainCountDesign(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const stats = useStats()
        return <Component {...props} text={stats ? String(stats.design) : "—"} />
    }
}

// ─────────────────────────────────────────────
// OVERRIDE 9: DomainCountSocial
// Attach to "44" text inside
// "social media active projects" group
// ─────────────────────────────────────────────
export function DomainCountSocial(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const stats = useStats()
        return <Component {...props} text={stats ? String(stats.social) : "—"} />
    }
}

// ─────────────────────────────────────────────
// OVERRIDE 10: DomainCountWebdev
// Attach to "44" text inside
// "website des and dev active j..." group
// ─────────────────────────────────────────────
export function DomainCountWebdev(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const stats = useStats()
        return <Component {...props} text={stats ? String(stats.webdev) : "—"} />
    }
}

// ─────────────────────────────────────────────
// OVERRIDE 11: ActivityLine1
// Attach to first activity text layer
// ─────────────────────────────────────────────
export function ActivityLine1(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const activity = useActivity()
        return <Component {...props} text={activity[0] ?? "—"} />
    }
}

// ─────────────────────────────────────────────
// OVERRIDE 12: ActivityLine2
// Attach to second activity text layer
// ─────────────────────────────────────────────
export function ActivityLine2(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const activity = useActivity()
        return <Component {...props} text={activity[1] ?? ""} />
    }
}

// ─────────────────────────────────────────────
// OVERRIDE 13: ActivityLine3
// Attach to third activity text layer
// ─────────────────────────────────────────────
export function ActivityLine3(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props) {
        if (isEditor()) return <Component {...props} />
        const activity = useActivity()
        return <Component {...props} text={activity[2] ?? ""} />
    }
}

// ══════════════════════════════════════════════════════════════
// ADMIN PANEL
// Full DOM-injected management panel — opens as overlay
// ATTACH: AdminPanel → any button/frame on the admin dashboard
// ══════════════════════════════════════════════════════════════

const MY = "#FBFF12"  // Marken Yellow
const MB = "#3C3D2A"  // Marken Black
const PB = "#1A1B12"  // Page BG
const CB = "#2E3021"  // Card BG
const IB = "#1E1F14"  // Input BG
const WH = "#FFFFFF"

const DOMAINS = ["marketing","design","socialmedia","webdev"]
const DOMAIN_DISPLAY: Record<string,string> = {
    marketing:"Marketing",design:"Design",
    socialmedia:"Social Media",webdev:"Web Dev"
}
const ROLES = ["employee","head","admin"]

function randPw(): string {
    const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$"
    return Array.from({length:12}, () => c[Math.floor(Math.random()*c.length)]).join("")
}

function apToast(msg: string, type: "ok"|"err") {
    document.getElementById("mk-ap-toast")?.remove()
    const el = document.createElement("div"); el.id = "mk-ap-toast"
    el.style.cssText = `position:fixed;bottom:28px;left:50%;transform:translateX(-50%);
        padding:11px 22px;border-radius:12px;font-family:Manrope,sans-serif;
        font-size:14px;font-weight:600;z-index:999999;white-space:nowrap;
        pointer-events:none;background:${type==="ok"?MY:"#EF4444"};
        color:${type==="ok"?MB:WH};animation:mkApFadeIn 0.2s ease;`
    el.textContent = msg; document.body.appendChild(el)
    setTimeout(() => el.remove(), 3200)
}

function confirm_(msg: string): Promise<boolean> {
    return new Promise(resolve => {
        const el = document.createElement("div"); el.id = "mk-ap-confirm"
        el.style.cssText = `position:fixed;inset:0;background:rgba(10,10,8,0.8);
            z-index:999998;display:flex;align-items:center;justify-content:center;`
        el.innerHTML = `
            <div style="background:#22231A;border-radius:20px;padding:28px 30px;
                width:min(400px,92vw);border:1px solid rgba(255,255,255,0.08);
                font-family:Manrope,sans-serif;">
                <p style="font-size:16px;font-weight:700;color:#fff;margin:0 0 8px;letter-spacing:-0.03em;">${msg}</p>
                <p style="font-size:13px;color:rgba(255,255,255,0.38);margin:0 0 22px;">This action cannot be undone.</p>
                <div style="display:flex;gap:10px;">
                    <button id="mk-ap-conf-no" style="flex:1;padding:12px;border-radius:12px;
                        border:1.5px solid rgba(255,255,255,0.15);background:transparent;
                        color:rgba(255,255,255,0.5);font-family:Manrope,sans-serif;
                        font-size:14px;font-weight:600;cursor:pointer;">Cancel</button>
                    <button id="mk-ap-conf-yes" style="flex:2;padding:12px;border-radius:12px;
                        border:none;background:#EF4444;color:#fff;font-family:Manrope,sans-serif;
                        font-size:14px;font-weight:700;cursor:pointer;letter-spacing:-0.02em;">Delete</button>
                </div>
            </div>`
        document.body.appendChild(el)
        document.getElementById("mk-ap-conf-yes")!.onclick = () => { el.remove(); resolve(true) }
        document.getElementById("mk-ap-conf-no")!.onclick  = () => { el.remove(); resolve(false) }
    })
}

function apInput(id: string, label: string, type="text", value="", placeholder="", readonly=false): string {
    return `<div style="margin-bottom:16px;">
        <label style="display:block;font-size:11px;font-weight:700;letter-spacing:0.06em;
            text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:8px;">${label}</label>
        <input id="${id}" type="${type}" value="${value}" placeholder="${placeholder}"
            ${readonly?"readonly":""}
            style="width:100%;background:${IB};border:1.5px solid rgba(251,255,18,0.18);
            border-radius:12px;padding:12px 16px;font-family:Manrope,sans-serif;
            font-size:15px;color:#fff;outline:none;box-sizing:border-box;
            ${readonly?"opacity:0.4;cursor:not-allowed;":""}" />
    </div>`
}

function apSelect(id: string, label: string, options: string[], labels: string[], selected=""): string {
    return `<div style="margin-bottom:16px;">
        <label style="display:block;font-size:11px;font-weight:700;letter-spacing:0.06em;
            text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:8px;">${label}</label>
        <select id="${id}" style="width:100%;background:${IB};border:1.5px solid rgba(251,255,18,0.18);
            border-radius:12px;padding:12px 16px;font-family:Manrope,sans-serif;
            font-size:15px;color:#fff;outline:none;box-sizing:border-box;appearance:none;">
            ${options.map((o,i)=>`<option value="${o}" ${o===selected?"selected":""}
                style="background:#22231A;">${labels[i]}</option>`).join("")}
        </select>
    </div>`
}

function v(id: string): string {
    return ((document.getElementById(id) as HTMLInputElement|HTMLSelectElement)?.value ?? "").trim()
}

// ── Styles ──
function injectApStyles() {
    if (document.getElementById("mk-ap-styles")) return
    const s = document.createElement("style"); s.id = "mk-ap-styles"
    s.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap');
        @keyframes mkApFadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mkApSlide  { from{opacity:0;transform:translateX(32px)} to{opacity:1;transform:translateX(0)} }
        #mk-admin-panel { position:fixed;inset:0;background:${PB};z-index:99000;
            display:flex;flex-direction:column;font-family:Manrope,sans-serif;color:#fff;overflow:hidden; }
        #mk-ap-nav { display:flex;align-items:center;justify-content:space-between;
            padding:0 28px;height:62px;border-bottom:1px solid rgba(255,255,255,0.06);
            background:${PB};flex-shrink:0; }
        .mk-ap-logo { font-size:21px;font-weight:800;letter-spacing:-0.05em;color:#fff; }
        .mk-ap-close { padding:8px 16px;border-radius:10px;border:1.5px solid rgba(255,255,255,0.14);
            background:transparent;color:rgba(255,255,255,0.5);font-family:Manrope,sans-serif;
            font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s; }
        .mk-ap-close:hover { border-color:rgba(255,255,255,0.32);color:#fff; }
        #mk-ap-tabs { display:flex;gap:4px;padding:16px 28px 0;flex-shrink:0;
            border-bottom:1px solid rgba(255,255,255,0.06); }
        .mk-ap-tab { padding:10px 20px;border-radius:10px 10px 0 0;font-size:14px;font-weight:700;
            cursor:pointer;border:none;background:transparent;color:rgba(255,255,255,0.35);
            font-family:Manrope,sans-serif;transition:all 0.15s;letter-spacing:-0.02em; }
        .mk-ap-tab.active { background:${CB};color:#fff;border:1px solid rgba(255,255,255,0.08);
            border-bottom:none; }
        .mk-ap-tab:hover:not(.active) { color:rgba(255,255,255,0.6); }
        #mk-ap-body { flex:1;overflow-y:auto;padding:24px 28px 60px; }
        #mk-ap-body::-webkit-scrollbar { width:6px; }
        #mk-ap-body::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08);border-radius:3px; }
        .mk-ap-section { animation:mkApSlide 0.2s ease; }
        .mk-ap-top-row { display:flex;justify-content:space-between;align-items:center;margin-bottom:20px; }
        .mk-ap-section-title { font-size:18px;font-weight:800;letter-spacing:-0.05em;color:#fff;margin:0; }
        .mk-ap-add-btn { padding:10px 20px;border-radius:10px;border:none;background:${MY};
            color:${MB};font-family:Manrope,sans-serif;font-size:13px;font-weight:700;
            cursor:pointer;transition:opacity 0.15s;letter-spacing:-0.02em; }
        .mk-ap-add-btn:hover { opacity:0.88; }
        .mk-ap-table { width:100%;border-collapse:collapse; }
        .mk-ap-table th { font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;
            color:rgba(255,255,255,0.28);padding:0 12px 10px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.06); }
        .mk-ap-table td { padding:14px 12px;border-bottom:1px solid rgba(255,255,255,0.04);
            font-size:14px;font-weight:500;color:rgba(255,255,255,0.75);vertical-align:middle; }
        .mk-ap-table tr:hover td { background:rgba(255,255,255,0.02); }
        .mk-ap-badge { display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;
            font-weight:700;background:rgba(251,255,18,0.1);border:1px solid rgba(251,255,18,0.2);color:${MY}; }
        .mk-ap-badge.role { background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.12);
            color:rgba(255,255,255,0.55); }
        .mk-ap-action-btn { padding:6px 14px;border-radius:8px;font-family:Manrope,sans-serif;
            font-size:12px;font-weight:700;cursor:pointer;border:none;transition:opacity 0.15s; }
        .mk-ap-edit-btn { background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.7); }
        .mk-ap-del-btn  { background:rgba(239,68,68,0.15);color:#EF4444;margin-left:6px; }
        .mk-ap-action-btn:hover { opacity:0.75; }
        .mk-ap-empty { text-align:center;padding:48px 20px;color:rgba(255,255,255,0.2);
            font-size:14px;font-weight:600; }

        /* ── Side drawer for forms ── */
        #mk-ap-drawer { position:fixed;top:0;right:0;bottom:0;width:min(440px,96vw);
            background:#22231A;border-left:1px solid rgba(255,255,255,0.08);
            z-index:99100;display:flex;flex-direction:column;
            animation:mkApSlide 0.25s cubic-bezier(0.34,1.1,0.64,1);box-shadow:-12px 0 40px rgba(0,0,0,0.4); }
        #mk-ap-drawer-backdrop { position:fixed;inset:0;z-index:99099;background:rgba(10,10,8,0.4); }
        #mk-ap-drawer-head { display:flex;align-items:center;justify-content:space-between;
            padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0; }
        #mk-ap-drawer-title { font-size:17px;font-weight:800;letter-spacing:-0.04em;color:#fff;margin:0; }
        #mk-ap-drawer-body { flex:1;overflow-y:auto;padding:24px; }
        #mk-ap-drawer-body::-webkit-scrollbar { width:4px; }
        #mk-ap-drawer-body::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08);border-radius:2px; }
        #mk-ap-drawer-footer { padding:16px 24px;border-top:1px solid rgba(255,255,255,0.06);
            display:flex;gap:10px;flex-shrink:0; }
        .mk-ap-drawer-save { flex:2;padding:13px;border-radius:12px;border:none;background:${MY};
            color:${MB};font-family:Manrope,sans-serif;font-size:14px;font-weight:700;
            cursor:pointer;transition:opacity 0.15s;letter-spacing:-0.02em; }
        .mk-ap-drawer-save:hover { opacity:0.88; }
        .mk-ap-drawer-save:disabled { opacity:0.35;cursor:not-allowed; }
        .mk-ap-drawer-cancel { flex:1;padding:13px;border-radius:12px;
            border:1.5px solid rgba(255,255,255,0.15);background:transparent;
            color:rgba(255,255,255,0.45);font-family:Manrope,sans-serif;
            font-size:14px;font-weight:600;cursor:pointer;transition:all 0.15s; }
        .mk-ap-drawer-cancel:hover { color:#fff;border-color:rgba(255,255,255,0.32); }
        .mk-ap-divider { height:1px;background:rgba(255,255,255,0.06);margin:18px 0; }
        .mk-ap-gen-pw { display:flex;gap:8px;align-items:center;margin-top:8px; }
        .mk-ap-gen-btn { padding:8px 14px;border-radius:8px;border:1.5px solid rgba(251,255,18,0.28);
            background:rgba(251,255,18,0.06);color:${MY};font-family:Manrope,sans-serif;
            font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap; }
        .mk-ap-gen-btn:hover { background:rgba(251,255,18,0.12); }
        .mk-ap-pw-reveal { font-size:13px;font-weight:700;color:${MY};
            background:rgba(251,255,18,0.08);border:1px solid rgba(251,255,18,0.2);
            border-radius:8px;padding:8px 14px;word-break:break-all;margin-top:8px;display:none; }
        .mk-ap-status-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:4px; }
        .mk-ap-status-opt { padding:8px;border-radius:10px;border:1.5px solid rgba(255,255,255,0.1);
            background:transparent;color:rgba(255,255,255,0.4);font-family:Manrope,sans-serif;
            font-size:12px;font-weight:700;cursor:pointer;transition:all 0.15s;text-align:center; }
        .mk-ap-status-opt.sel { border-color:${MY};background:rgba(251,255,18,0.1);color:${MY}; }

        @media (max-width:768px) {
            #mk-ap-nav { padding:0 16px !important; }
            #mk-ap-tabs { padding:12px 16px 0 !important;gap:2px; }
            .mk-ap-tab { padding:8px 12px !important;font-size:13px !important; }
            #mk-ap-body { padding:16px 16px 60px !important; }
            .mk-ap-table th, .mk-ap-table td { padding:10px 8px !important;font-size:13px !important; }
        }
    `
    document.head.appendChild(s)
}

// ── Drawer ──
function openDrawer(title: string, bodyHTML: string, onSave: () => Promise<void>) {
    document.getElementById("mk-ap-drawer")?.remove()
    document.getElementById("mk-ap-drawer-backdrop")?.remove()

    const bd = document.createElement("div"); bd.id = "mk-ap-drawer-backdrop"
    bd.onclick = closeDrawer; document.body.appendChild(bd)

    const dr = document.createElement("div"); dr.id = "mk-ap-drawer"
    dr.innerHTML = `
        <div id="mk-ap-drawer-head">
            <p id="mk-ap-drawer-title">${title}</p>
            <button class="mk-ap-close" onclick="window._mkAp.closeDrawer()">✕</button>
        </div>
        <div id="mk-ap-drawer-body">${bodyHTML}</div>
        <div id="mk-ap-drawer-footer">
            <button class="mk-ap-drawer-cancel" onclick="window._mkAp.closeDrawer()">Cancel</button>
            <button class="mk-ap-drawer-save" id="mk-ap-drawer-save-btn"
                onclick="window._mkAp.drawerSave()">Save</button>
        </div>`
    document.body.appendChild(dr)
    ;(window as any)._mkAp._drawerSaveFn = onSave
}

function closeDrawer() {
    document.getElementById("mk-ap-drawer")?.remove()
    document.getElementById("mk-ap-drawer-backdrop")?.remove()
}

// ── Tab renderer ──
let _apTab = "users"

async function renderTab(tab: string) {
    _apTab = tab
    // Update tab styles
    document.querySelectorAll(".mk-ap-tab").forEach(t => {
        t.classList.toggle("active", (t as HTMLElement).dataset.tab === tab)
    })
    const body = document.getElementById("mk-ap-body")
    if (!body) return
    body.innerHTML = `<div style="color:rgba(255,255,255,0.3);font-size:14px;padding:40px 0;text-align:center;">Loading…</div>`

    if (tab === "users")      await renderUsers(body)
    if (tab === "projects")   await renderProjects(body)
    if (tab === "clients")    await renderClients(body)
    if (tab === "attendance") await renderAttendance(body)
}

// ── USERS TAB ──
// ── Score calculator ──
function calcScore(completed: number, overdue: number, weeklyHours: number): {
    score: number, pts: { completion: number, overdue: number, hours: number }
} {
    const completionPts = Math.min(completed * 10, 40)
    const overduePts    = Math.max(0, 30 - overdue * 8) // -8 per overdue, floor 0 — but this gives 30 base max
    // Reframe: overdue penalty from 30pt base
    const overduePenalty = Math.min(overdue * 8, 30)
    const hoursPts       = Math.min((weeklyHours / 40) * 30, 30)
    const base           = 30
    const total          = Math.min(100, Math.max(0, base + completionPts - overduePenalty + hoursPts))
    const score          = Math.max(1, Math.min(10, Math.ceil(total / 10)))
    return { score, pts: { completion: completionPts, overdue: overduePenalty, hours: Math.round(hoursPts) } }
}

function scoreColor(s: number): string {
    if (s >= 8) return "#22C55E"
    if (s >= 6) return "#FBFF12"
    if (s >= 4) return "#F97316"
    return "#EF4444"
}

async function loadUserStats(username: string) {
    const now      = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const weekStart  = new Date(now.getTime() - now.getDay() * 86400000)
    weekStart.setHours(0,0,0,0)
    const today    = now.toISOString().split("T")[0]

    const [completedRes, overdueRes, attendRes] = await Promise.all([
        // Projects completed this month
        supabase.from("project_members")
            .select("project_id, projects!inner(status, updated_at)")
            .eq("username", username)
            .eq("projects.status", "approved")
            .gte("projects.updated_at", monthStart),
        // Overdue projects (past due_date, not approved)
        supabase.from("project_members")
            .select("project_id, projects!inner(status, due_date)")
            .eq("username", username)
            .neq("projects.status", "approved")
            .lt("projects.due_date", today),
        // This week's attendance
        supabase.from("attendance")
            .select("clock_in, clock_out, date")
            .eq("username", username)
            .gte("date", weekStart.toISOString().split("T")[0])
            .order("date", { ascending: true }),
    ])

    const completed    = completedRes.data?.length ?? 0
    const overdue      = overdueRes.data?.length ?? 0

    // Calculate weekly hours
    let weeklyMinutes  = 0
    const dailyLogs: Array<{ date: string, clockIn: string, clockOut: string, hours: string }> = []

    attendRes.data?.forEach((r: any) => {
        if (r.clock_in && r.clock_out) {
            const mins = Math.round((new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime()) / 60000)
            weeklyMinutes += mins
            const h = Math.floor(mins/60); const m = mins % 60
            dailyLogs.push({
                date:     new Date(r.date).toLocaleDateString("default",{weekday:"short",day:"numeric",month:"short"}),
                clockIn:  new Date(r.clock_in).toLocaleTimeString("default",{hour:"2-digit",minute:"2-digit"}),
                clockOut: r.clock_out ? new Date(r.clock_out).toLocaleTimeString("default",{hour:"2-digit",minute:"2-digit"}) : "Active",
                hours:    r.clock_out ? `${h}h ${m}m` : "—",
            })
        } else if (r.clock_in) {
            dailyLogs.push({
                date:     new Date(r.date).toLocaleDateString("default",{weekday:"short",day:"numeric",month:"short"}),
                clockIn:  new Date(r.clock_in).toLocaleTimeString("default",{hour:"2-digit",minute:"2-digit"}),
                clockOut: "Active",
                hours:    "—",
            })
        }
    })

    const weeklyHours = weeklyMinutes / 60
    const wh = Math.floor(weeklyHours); const wm = Math.round((weeklyHours - wh) * 60)
    const { score, pts } = calcScore(completed, overdue, weeklyHours)

    return { completed, overdue, weeklyHours, weeklyStr: `${wh}h ${wm}m`, dailyLogs, score, pts }
}

async function renderUsers(body: HTMLElement) {
    const { data: users, error } = await supabase
        .from("users").select("username,full_name,domain,role").order("full_name")
    if (error) { body.innerHTML = `<p style="color:#EF4444;font-family:Manrope,sans-serif;">Error: ${error.message}</p>`; return }

    body.innerHTML = `
        <div class="mk-ap-section">
            <div class="mk-ap-top-row">
                <h2 class="mk-ap-section-title">Users (${users?.length ?? 0})</h2>
                <button class="mk-ap-add-btn" onclick="window._mkAp.addUser()">+ New User</button>
            </div>
            <table class="mk-ap-table" id="mk-ap-users-table">
                <thead><tr>
                    <th>Name</th><th>Username</th><th>Domain</th><th>Role</th><th>Score</th><th></th>
                </tr></thead>
                <tbody>
                    ${!users?.length
                        ? `<tr><td colspan="6"><div class="mk-ap-empty">No users yet.</div></td></tr>`
                        : users.map(u => `
                        <tr id="mk-ap-user-row-${u.username}">
                            <td style="font-weight:600;color:#fff;">${u.full_name ?? "—"}</td>
                            <td style="color:rgba(255,255,255,0.45);">@${u.username}</td>
                            <td><span class="mk-ap-badge">${DOMAIN_DISPLAY[u.domain] ?? u.domain ?? "—"}</span></td>
                            <td><span class="mk-ap-badge role">${u.role ?? "—"}</span></td>
                            <td id="mk-ap-score-${u.username}">
                                <span style="color:rgba(255,255,255,0.2);font-size:12px;">—</span>
                            </td>
                            <td style="white-space:nowrap;">
                                <button class="mk-ap-action-btn" style="background:rgba(251,255,18,0.08);color:#FBFF12;"
                                    id="mk-ap-expand-btn-${u.username}"
                                    onclick="window._mkAp.toggleStats('${u.username}')">▶ Stats</button>
                                <button class="mk-ap-action-btn mk-ap-edit-btn" style="margin-left:6px;"
                                    onclick="window._mkAp.editUser('${u.username}','${(u.full_name??"").replace(/'/g,"\'")}','${u.domain ?? ""}','${u.role ?? ""}')">Edit</button>
                                <button class="mk-ap-action-btn mk-ap-del-btn"
                                    onclick="window._mkAp.deleteUser('${u.username}')">Delete</button>
                            </td>
                        </tr>
                        <tr id="mk-ap-stats-row-${u.username}" style="display:none;">
                            <td colspan="6" style="padding:0;">
                                <div id="mk-ap-stats-content-${u.username}"
                                    style="background:rgba(251,255,18,0.03);border-top:1px solid rgba(251,255,18,0.1);
                                    border-bottom:1px solid rgba(255,255,255,0.04);padding:20px 24px;">
                                    <span style="color:rgba(255,255,255,0.3);font-size:13px;font-family:Manrope,sans-serif;">Loading stats…</span>
                                </div>
                            </td>
                        </tr>`).join("")}
                </tbody>
            </table>
        </div>`

    // Load scores for all employees in background
    users?.filter(u => u.role === "employee" || u.role === "head").forEach(async u => {
        const stats = await loadUserStats(u.username)
        const scoreEl = document.getElementById(`mk-ap-score-${u.username}`)
        if (scoreEl) {
            scoreEl.innerHTML = `<span style="font-size:15px;font-weight:800;color:${scoreColor(stats.score)};
                letter-spacing:-0.03em;">${stats.score}<span style="font-size:10px;color:rgba(255,255,255,0.3);font-weight:600;">/10</span></span>`
        }
        // Cache stats for when row is expanded
        ;(window as any)[`_mkUserStats_${u.username}`] = stats
    })
}

// ── PROJECTS TAB ──
async function renderProjects(body: HTMLElement) {
    const { data: projects, error } = await supabase
        .from("projects").select("id,title,status,priority,due_date,domain").order("created_at", { ascending: false })
    if (error) { body.innerHTML = `<p style="color:#EF4444;font-family:Manrope,sans-serif;">Error: ${error.message}</p>`; return }

    const STATUS_OPTS = ["assigned","in_progress","in_review","approved","changes_requested"]
    const STATUS_LBL: Record<string,string> = { assigned:"Assigned",in_progress:"In Progress",
        in_review:"In Review",approved:"Approved",changes_requested:"Changes Requested" }
    const STATUS_COL: Record<string,string> = { assigned:"#FBFF12",in_progress:"#3B82F6",
        in_review:"#F97316",approved:"#22C55E",changes_requested:"#EF4444" }

    body.innerHTML = `
        <div class="mk-ap-section">
            <div class="mk-ap-top-row">
                <h2 class="mk-ap-section-title">Projects (${projects?.length ?? 0})</h2>
            </div>
            <table class="mk-ap-table">
                <thead><tr>
                    <th>Title</th><th>Domain</th><th>Status</th><th>Due</th><th></th>
                </tr></thead>
                <tbody>
                    ${!projects?.length ? `<tr><td colspan="5"><div class="mk-ap-empty">No projects yet.</div></td></tr>` :
                    projects.map(p => `
                        <tr>
                            <td style="font-weight:600;color:#fff;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.title}</td>
                            <td><span class="mk-ap-badge">${DOMAIN_DISPLAY[p.domain] ?? p.domain ?? "—"}</span></td>
                            <td><span style="padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;
                                background:${STATUS_COL[p.status] ?? "#FBFF12"}22;
                                color:${STATUS_COL[p.status] ?? "#FBFF12"};border:1px solid ${STATUS_COL[p.status] ?? "#FBFF12"}44;">
                                ${STATUS_LBL[p.status] ?? p.status}</span></td>
                            <td style="color:rgba(255,255,255,0.45);font-size:13px;">${p.due_date ? new Date(p.due_date).toLocaleDateString("default",{day:"numeric",month:"short"}) : "—"}</td>
                            <td style="white-space:nowrap;">
                                <button class="mk-ap-action-btn mk-ap-edit-btn"
                                    onclick="window._mkAp.editProject('${p.id}','${p.title.replace(/'/g,"\\'")}','${p.due_date ?? ""}','${p.priority ?? "normal"}','${p.status}')">Edit</button>
                                <button class="mk-ap-action-btn mk-ap-del-btn"
                                    onclick="window._mkAp.deleteProject('${p.id}','${p.title.replace(/'/g,"\\'")}')">Delete</button>
                            </td>
                        </tr>`).join("")}
                </tbody>
            </table>
        </div>`
}

// ── CLIENTS TAB ──
async function renderClients(body: HTMLElement) {
    const { data: clients, error } = await supabase
        .from("clients").select("id,name,created_by").order("name")
    if (error) { body.innerHTML = `<p style="color:#EF4444;font-family:Manrope,sans-serif;">Error: ${error.message}</p>`; return }

    body.innerHTML = `
        <div class="mk-ap-section">
            <div class="mk-ap-top-row">
                <h2 class="mk-ap-section-title">Clients (${clients?.length ?? 0})</h2>
                <button class="mk-ap-add-btn" onclick="window._mkAp.addClient()">+ New Client</button>
            </div>
            <table class="mk-ap-table">
                <thead><tr><th>Client Name</th><th>Created By</th><th></th></tr></thead>
                <tbody>
                    ${!clients?.length ? `<tr><td colspan="3"><div class="mk-ap-empty">No clients yet.</div></td></tr>` :
                    clients.map(c => `
                        <tr>
                            <td style="font-weight:600;color:#fff;">${c.name}</td>
                            <td style="color:rgba(255,255,255,0.45);">@${c.created_by ?? "—"}</td>
                            <td style="white-space:nowrap;">
                                <button class="mk-ap-action-btn mk-ap-edit-btn"
                                    onclick="window._mkAp.editClient(${c.id},'${c.name.replace(/'/g,"\\'")}')">Edit</button>
                                <button class="mk-ap-action-btn mk-ap-del-btn"
                                    onclick="window._mkAp.deleteClient(${c.id},'${c.name.replace(/'/g,"\\'")}')">Delete</button>
                            </td>
                        </tr>`).join("")}
                </tbody>
            </table>
        </div>`
}

// ── ATTENDANCE TAB ──
async function renderAttendance(body: HTMLElement) {
    // Get all users
    const { data: users } = await supabase
        .from("users").select("username,full_name,domain,role")
        .in("role",["employee","head"]).order("full_name")

    // Get this week's attendance for all users
    const now = new Date()
    const weekStart = new Date(now.getTime() - now.getDay() * 86400000)
    weekStart.setHours(0,0,0,0)
    const weekStartStr = weekStart.toISOString().split("T")[0]

    const { data: allAttend } = await supabase
        .from("attendance")
        .select("username,clock_in,clock_out,date")
        .gte("date", weekStartStr)
        .order("clock_in", { ascending: false })

    // Group by username
    const byUser: Record<string, any[]> = {}
    allAttend?.forEach((r: any) => {
        if (!byUser[r.username]) byUser[r.username] = []
        byUser[r.username].push(r)
    })

    // Calculate weekly totals
    function weekTotal(records: any[]): string {
        let mins = 0
        records?.forEach(r => {
            if (r.clock_in && r.clock_out) {
                mins += Math.round((new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime()) / 60000)
            }
        })
        const h = Math.floor(mins/60); const m = mins % 60
        return mins > 0 ? `${h}h ${m}m` : "—"
    }

    const weekDays: string[] = []
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart.getTime() + i * 86400000)
        if (d <= now) weekDays.push(d.toISOString().split("T")[0])
    }

    body.innerHTML = `
        <div class="mk-ap-section">
            <div class="mk-ap-top-row">
                <h2 class="mk-ap-section-title">Attendance — Week of ${weekStart.toLocaleDateString("default",{day:"numeric",month:"short"})}</h2>
            </div>
            ${!users?.length ? `<div class="mk-ap-empty">No employees found.</div>` : `
            <table class="mk-ap-table">
                <thead><tr>
                    <th>Employee</th><th>Domain</th>
                    ${weekDays.map(d => `<th>${new Date(d).toLocaleDateString("default",{weekday:"short",day:"numeric"})}</th>`).join("")}
                    <th>Total</th>
                </tr></thead>
                <tbody>
                    ${users.map(u => {
                        const recs = byUser[u.username] ?? []
                        const byDate: Record<string, any> = {}
                        recs.forEach((r: any) => { byDate[r.date] = r })
                        return `<tr>
                            <td style="font-weight:600;color:#fff;">${u.full_name ?? u.username}</td>
                            <td><span class="mk-ap-badge">${DOMAIN_DISPLAY[u.domain] ?? u.domain ?? "—"}</span></td>
                            ${weekDays.map(d => {
                                const r = byDate[d]
                                if (!r) return `<td style="color:rgba(255,255,255,0.15);font-size:12px;">—</td>`
                                if (r.clock_in && r.clock_out) {
                                    const mins = Math.round((new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime()) / 60000)
                                    const h = Math.floor(mins/60); const m = mins%60
                                    return `<td style="color:#22C55E;font-size:12px;font-weight:600;">${h}h${m>0?` ${m}m`:""}</td>`
                                }
                                if (r.clock_in) return `<td style="color:#F97316;font-size:12px;font-weight:600;">Active</td>`
                                return `<td style="color:rgba(255,255,255,0.15);font-size:12px;">—</td>`
                            }).join("")}
                            <td style="font-weight:700;color:#FBFF12;">${weekTotal(recs)}</td>
                        </tr>`
                    }).join("")}
                </tbody>
            </table>`}
        </div>`
}

// ── Open panel ──
function openAdminPanel() {
    if (document.getElementById("mk-admin-panel")) return
    injectApStyles()

    const panel = document.createElement("div"); panel.id = "mk-admin-panel"
    panel.innerHTML = `
        <nav id="mk-ap-nav">
            <span class="mk-ap-logo">Marken OS — Admin Panel</span>
            <button class="mk-ap-close" onclick="window._mkAp.close()">← Back to Dashboard</button>
        </nav>
        <div id="mk-ap-tabs">
            <button class="mk-ap-tab active" data-tab="users"      onclick="window._mkAp.tab('users')">👥 Users</button>
            <button class="mk-ap-tab"        data-tab="projects"   onclick="window._mkAp.tab('projects')">📋 Projects</button>
            <button class="mk-ap-tab"        data-tab="clients"    onclick="window._mkAp.tab('clients')">🏢 Clients</button>
            <button class="mk-ap-tab"        data-tab="attendance" onclick="window._mkAp.tab('attendance')">🕐 Attendance</button>
        </div>
        <div id="mk-ap-body"></div>`
    document.body.appendChild(panel)

    ;(window as any)._mkAp = {
        close()  { document.getElementById("mk-admin-panel")?.remove(); closeDrawer() },
        tab(t: string) { renderTab(t) },
        closeDrawer,

        async drawerSave() {
            const btn = document.getElementById("mk-ap-drawer-save-btn") as HTMLButtonElement
            if (btn) { btn.disabled = true; btn.textContent = "Saving…" }
            try { await (window as any)._mkAp._drawerSaveFn() }
            finally { if (btn) { btn.disabled = false; btn.textContent = "Save" } }
        },

        // ── USER STATS EXPANSION ──
        async toggleStats(username: string) {
            const row = document.getElementById(`mk-ap-stats-row-${username}`)
            const btn = document.getElementById(`mk-ap-expand-btn-${username}`)
            const content = document.getElementById(`mk-ap-stats-content-${username}`)
            if (!row || !content) return

            const isOpen = row.style.display !== "none"
            if (isOpen) {
                row.style.display = "none"
                if (btn) btn.textContent = "▶ Stats"
                return
            }

            row.style.display = "table-row"
            if (btn) btn.textContent = "▼ Stats"

            // Use cached stats or load fresh
            let stats = (window as any)[`_mkUserStats_${username}`]
            if (!stats) {
                content.innerHTML = `<span style="color:rgba(255,255,255,0.3);font-size:13px;font-family:Manrope,sans-serif;">Loading…</span>`
                stats = await loadUserStats(username)
                ;(window as any)[`_mkUserStats_${username}`] = stats
            }

            const { completed, overdue, weeklyStr, dailyLogs, score, pts } = stats
            const sc = scoreColor(score)

            content.innerHTML = `
                <!-- Score + breakdown -->
                <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:20px;align-items:flex-start;">
                    <!-- Score card -->
                    <div style="background:${sc}14;border:1.5px solid ${sc}44;border-radius:16px;
                        padding:18px 24px;text-align:center;min-width:100px;flex-shrink:0;">
                        <div style="font-size:42px;font-weight:800;letter-spacing:-0.05em;color:${sc};line-height:1;">
                            ${score}</div>
                        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.35);
                            text-transform:uppercase;letter-spacing:0.07em;margin-top:4px;">Score</div>
                    </div>
                    <!-- Breakdown cards -->
                    <div style="display:flex;flex-wrap:wrap;gap:10px;flex:1;">
                        <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);
                            border-radius:12px;padding:14px 16px;min-width:120px;">
                            <div style="font-size:24px;font-weight:800;color:#22C55E;letter-spacing:-0.04em;">${completed}</div>
                            <div style="font-size:11px;color:rgba(255,255,255,0.35);font-weight:600;
                                text-transform:uppercase;letter-spacing:0.06em;margin-top:3px;">Completed this month</div>
                            <div style="font-size:11px;color:rgba(255,255,255,0.2);margin-top:4px;">+${pts.completion}pts</div>
                        </div>
                        <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);
                            border-radius:12px;padding:14px 16px;min-width:120px;">
                            <div style="font-size:24px;font-weight:800;color:#EF4444;letter-spacing:-0.04em;">${overdue}</div>
                            <div style="font-size:11px;color:rgba(255,255,255,0.35);font-weight:600;
                                text-transform:uppercase;letter-spacing:0.06em;margin-top:3px;">Overdue projects</div>
                            <div style="font-size:11px;color:rgba(255,255,255,0.2);margin-top:4px;">-${pts.overdue}pts</div>
                        </div>
                        <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);
                            border-radius:12px;padding:14px 16px;min-width:120px;">
                            <div style="font-size:24px;font-weight:800;color:#3B82F6;letter-spacing:-0.04em;">${weeklyStr}</div>
                            <div style="font-size:11px;color:rgba(255,255,255,0.35);font-weight:600;
                                text-transform:uppercase;letter-spacing:0.06em;margin-top:3px;">This week</div>
                            <div style="font-size:11px;color:rgba(255,255,255,0.2);margin-top:4px;">+${pts.hours}pts</div>
                        </div>
                    </div>
                </div>

                <!-- Daily log -->
                <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;
                    color:rgba(255,255,255,0.25);margin-bottom:10px;">This Week's Log</div>
                ${dailyLogs.length === 0
                    ? `<p style="color:rgba(255,255,255,0.2);font-size:13px;font-family:Manrope,sans-serif;margin:0;">No attendance logged this week.</p>`
                    : `<table style="width:100%;border-collapse:collapse;font-family:Manrope,sans-serif;">
                        <thead><tr>
                            <th style="font-size:10px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;
                                color:rgba(255,255,255,0.25);padding:0 10px 8px;text-align:left;">Date</th>
                            <th style="font-size:10px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;
                                color:rgba(255,255,255,0.25);padding:0 10px 8px;text-align:left;">Clock In</th>
                            <th style="font-size:10px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;
                                color:rgba(255,255,255,0.25);padding:0 10px 8px;text-align:left;">Clock Out</th>
                            <th style="font-size:10px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;
                                color:rgba(255,255,255,0.25);padding:0 10px 8px;text-align:left;">Hours</th>
                        </tr></thead>
                        <tbody>
                            ${dailyLogs.map(l => `
                                <tr>
                                    <td style="padding:8px 10px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.7);
                                        border-top:1px solid rgba(255,255,255,0.04);">${l.date}</td>
                                    <td style="padding:8px 10px;font-size:13px;color:rgba(255,255,255,0.5);
                                        border-top:1px solid rgba(255,255,255,0.04);">${l.clockIn}</td>
                                    <td style="padding:8px 10px;font-size:13px;border-top:1px solid rgba(255,255,255,0.04);
                                        color:${l.clockOut==="Active"?"#22C55E":"rgba(255,255,255,0.5)"};">${l.clockOut}</td>
                                    <td style="padding:8px 10px;font-size:13px;font-weight:600;
                                        color:rgba(255,255,255,0.7);border-top:1px solid rgba(255,255,255,0.04);">${l.hours}</td>
                                </tr>`).join("")}
                        </tbody>
                    </table>`}
            `
        },

        // ── USER ACTIONS ──
        addUser() {
            const genId = "mk-ap-pw-gen-out"
            openDrawer("New User", `
                ${apInput("ap-un","Username","text","","e.g. john_doe")}
                ${apInput("ap-fn","Full Name","text","","e.g. John Doe")}
                ${apSelect("ap-role","Role",ROLES,["Employee","Domain Head","Admin"],"employee")}
                ${apSelect("ap-domain","Domain",DOMAINS,["Marketing","Design","Social Media","Web Dev"],"marketing")}
                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:11px;font-weight:700;letter-spacing:0.06em;
                        text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:8px;">Password</label>
                    <input id="ap-pw" type="text" placeholder="Set a password"
                        style="width:100%;background:${IB};border:1.5px solid rgba(251,255,18,0.18);
                        border-radius:12px;padding:12px 16px;font-family:Manrope,sans-serif;
                        font-size:15px;color:#fff;outline:none;box-sizing:border-box;" />
                    <div class="mk-ap-gen-pw">
                        <button class="mk-ap-gen-btn" onclick="window._mkAp.genPw()">⚡ Auto-generate</button>
                        <span id="${genId}" class="mk-ap-pw-reveal"></span>
                    </div>
                </div>`, async () => {
                    const un = v("ap-un"); const fn = v("ap-fn")
                    const pw = v("ap-pw"); const role = v("ap-role"); const domain = v("ap-domain")
                    if (!un || !fn || !pw) { apToast("Fill in all fields","err"); return }
                    const { error } = await supabase.from("users")
                        .insert({ username:un, full_name:fn, password:pw, role, domain })
                    if (error) { apToast(`Failed: ${error.message}`,"err"); return }
                    closeDrawer(); apToast(`User @${un} created!`,"ok")
                    renderTab("users")
                })
        },

        genPw() {
            const pw = randPw()
            const inp = document.getElementById("ap-pw") as HTMLInputElement
            const out = document.getElementById("mk-ap-pw-gen-out") as HTMLElement
            if (inp) inp.value = pw
            if (out) { out.textContent = `Generated: ${pw}`; out.style.display = "block" }
        },

        editUser(username: string, full_name: string, domain: string, role: string) {
            openDrawer(`Edit @${username}`, `
                ${apInput("ap-fn","Full Name","text",full_name)}
                ${apSelect("ap-role","Role",ROLES,["Employee","Domain Head","Admin"],role)}
                ${apSelect("ap-domain","Domain",DOMAINS,["Marketing","Design","Social Media","Web Dev"],domain)}
                <div class="mk-ap-divider"></div>
                <label style="display:block;font-size:11px;font-weight:700;letter-spacing:0.06em;
                    text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:8px;">
                    Reset Password (leave blank to keep current)</label>
                <input id="ap-pw-reset" type="text" placeholder="New password (optional)"
                    style="width:100%;background:${IB};border:1.5px solid rgba(251,255,18,0.18);
                    border-radius:12px;padding:12px 16px;font-family:Manrope,sans-serif;
                    font-size:15px;color:#fff;outline:none;box-sizing:border-box;" />`, async () => {
                    const updates: any = { full_name: v("ap-fn"), role: v("ap-role"), domain: v("ap-domain") }
                    const newPw = v("ap-pw-reset")
                    if (newPw) updates.password = newPw
                    const { error } = await supabase.from("users").update(updates).eq("username", username)
                    if (error) { apToast(`Failed: ${error.message}`,"err"); return }
                    closeDrawer(); apToast(`@${username} updated!`,"ok"); renderTab("users")
                })
        },

        async deleteUser(username: string) {
            const ok = await confirm_(`Delete user @${username}?`)
            if (!ok) return
            const { error } = await supabase.from("users").delete().eq("username", username)
            if (error) { apToast(`Failed: ${error.message}`,"err"); return }
            apToast(`@${username} deleted`,"ok"); renderTab("users")
        },

        // ── PROJECT ACTIONS ──
        editProject(id: string, title: string, due: string, priority: string, status: string) {
            const STATUSES = ["assigned","in_progress","in_review","approved","changes_requested"]
            const SLBLS    = ["Assigned","In Progress","In Review","Approved","Changes Requested"]
            openDrawer(`Edit Project`, `
                ${apInput("ap-title","Title","text",title)}
                ${apInput("ap-due","Due Date","date","",due)}
                ${apSelect("ap-priority","Priority",["normal","high","urgent"],["Normal","High","Urgent"],priority)}
                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:11px;font-weight:700;letter-spacing:0.06em;
                        text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:8px;">Status</label>
                    <div class="mk-ap-status-grid">
                        ${STATUSES.map((s,i) => `
                            <button class="mk-ap-status-opt${s===status?" sel":""}"
                                data-status="${s}"
                                onclick="document.querySelectorAll('.mk-ap-status-opt').forEach(b=>b.classList.remove('sel'));this.classList.add('sel')">
                                ${SLBLS[i]}</button>`).join("")}
                    </div>
                </div>`, async () => {
                    const newTitle    = v("ap-title")
                    const newDue      = v("ap-due")
                    const newPriority = v("ap-priority")
                    const newStatus   = (document.querySelector(".mk-ap-status-opt.sel") as HTMLElement)?.dataset.status ?? status
                    if (!newTitle) { apToast("Title cannot be empty","err"); return }
                    const { error } = await supabase.from("projects").update({
                        title: newTitle, due_date: newDue || null,
                        priority: newPriority, status: newStatus,
                    }).eq("id", id)
                    if (error) { apToast(`Failed: ${error.message}`,"err"); return }
                    closeDrawer(); apToast("Project updated!","ok"); renderTab("projects")
                })
            // Pre-fill date input after render
            setTimeout(() => {
                const d = document.getElementById("ap-due") as HTMLInputElement
                if (d && due) d.value = due
            }, 50)
        },

        async deleteProject(id: string, title: string) {
            const ok = await confirm_(`Delete project "${title}"?`)
            if (!ok) return
            // Delete related records first
            await Promise.all([
                supabase.from("project_members").delete().eq("project_id", id),
                supabase.from("submissions").delete().eq("project_id", id),
                supabase.from("comments").delete().eq("project_id", id),
                supabase.from("notifications").delete().eq("project_id", id),
            ])
            const { error } = await supabase.from("projects").delete().eq("id", id)
            if (error) { apToast(`Failed: ${error.message}`,"err"); return }
            apToast(`"${title}" deleted`,"ok"); renderTab("projects")
        },

        // ── CLIENT ACTIONS ──
        addClient() {
            openDrawer("New Client", `
                ${apInput("ap-client-name","Client Name","text","","e.g. Acme Corp")}`, async () => {
                    const name = v("ap-client-name")
                    if (!name) { apToast("Enter a client name","err"); return }
                    const user = getSessionUser()
                    const { error } = await supabase.from("clients")
                        .insert({ name, created_by: user.username })
                    if (error) { apToast(`Failed: ${error.message}`,"err"); return }
                    closeDrawer(); apToast(`"${name}" added!`,"ok"); renderTab("clients")
                })
        },

        editClient(id: number, name: string) {
            openDrawer("Edit Client", `
                ${apInput("ap-client-name","Client Name","text",name)}`, async () => {
                    const newName = v("ap-client-name")
                    if (!newName) { apToast("Name cannot be empty","err"); return }
                    const { error } = await supabase.from("clients").update({ name: newName }).eq("id", id)
                    if (error) { apToast(`Failed: ${error.message}`,"err"); return }
                    closeDrawer(); apToast(`Client updated!`,"ok"); renderTab("clients")
                })
        },

        async deleteClient(id: number, name: string) {
            const ok = await confirm_(`Delete client "${name}"?`)
            if (!ok) return
            const { error } = await supabase.from("clients").delete().eq("id", id)
            if (error) { apToast(`Failed: ${error.message}`,"err"); return }
            apToast(`"${name}" deleted`,"ok"); renderTab("clients")
        },
    }

    renderTab("users")
}

// ── Override ──
export function AdminPanel(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props: any) {
        if (isEditor()) return <Component {...props} />
        return (
            <Component {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => {
                    if ((window as any)._mkApGuard) return
                    ;(window as any)._mkApGuard = true
                    setTimeout(() => delete (window as any)._mkApGuard, 800)
                    openAdminPanel()
                }}
            />
        )
    }
}
