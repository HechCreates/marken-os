// projectOverride.tsx
// Powers the project detail page (fully injected — no Framer layers needed)
//
// ATTACH: ProjectPage → any frame on the blank project page
// The Framer frame is hidden; everything is injected into document.body
//
// REALTIME ZONES (independent re-renders):
//   #mk-proj-header    → project UPDATE (status, priority changes)
//   #mk-proj-actions   → project UPDATE (role-gated action buttons)
//   #mk-proj-submissions → submissions INSERT (new upload by any member)
//   #mk-comments-feed  → comments INSERT (append-only, preserves input focus)
//
// STATUS FLOW:
//   assigned/in_progress → [employee] Submit for Review → in_review
//   in_review → [head/admin] Approve → approved
//   in_review → [head/admin] Request Changes (+ note) → changes_requested
//   changes_requested → [employee] Mark as In Progress → in_progress

import type { ComponentType } from "react"
import { useEffect } from "react"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
    "https://kufsbpaleeawqmtlnnno.supabase.co",
    "sb_publishable_S3HP2seIYkKSuBoXrRyp3g_2_cWKoLd"
)

// ─── Constants ───────────────────────────────────────────────

const MARKEN_BLACK  = "#3C3D2A"
const MARKEN_YELLOW = "#FBFF12"
const WHITE         = "#FFFFFF"
const PAGE_BG       = "#242516"
const CARD_BG       = "#2E3021"
const INPUT_BG      = "#1E1F14"
const INPUT_BORDER  = "rgba(251,255,18,0.18)"

const STATUS_COLOR: Record<string, string> = {
    assigned:          MARKEN_YELLOW,
    in_progress:       "#3B82F6",
    in_review:         "#F97316",
    approved:          "#22C55E",
    changes_requested: "#EF4444",
}
const STATUS_TEXT: Record<string, string> = {
    assigned:          MARKEN_BLACK,
    in_progress:       WHITE,
    in_review:         WHITE,
    approved:          WHITE,
    changes_requested: WHITE,
}
const STATUS_LABEL: Record<string, string> = {
    assigned:          "Assigned",
    in_progress:       "In Progress",
    in_review:         "In Review",
    approved:          "Approved",
    changes_requested: "Changes Requested",
}
const PRIORITY_BG: Record<string, string> = {
    normal: "rgba(255,255,255,0.1)",
    high:   "#F97316",
    urgent: "#EF4444",
}

// ─── Utilities ───────────────────────────────────────────────

function getUser(): any {
    try { return JSON.parse(sessionStorage.getItem("marken_user") ?? "{}") }
    catch { return {} }
}
function getProjectId(): string | null {
    return new URLSearchParams(window.location.search).get("id")
}
function formatDate(s: string): string {
    if (!s) return "No due date"
    const d = new Date(s)
    return `Due ${d.getDate()} ${d.toLocaleString("default", { month: "short", year: "numeric" })}`
}
function formatTime(s: string): string {
    const d = new Date(s)
    return d.toLocaleDateString("default", { day: "numeric", month: "short" }) +
           " · " + d.toLocaleTimeString("default", { hour: "2-digit", minute: "2-digit" })
}
function esc(s: string): string {
    return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
function toast(msg: string, type: "ok" | "err") {
    document.getElementById("mk-toast")?.remove()
    const el = document.createElement("div")
    el.id = "mk-toast"; el.className = type; el.innerText = msg
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 3200)
}

// ─── Cleanup ─────────────────────────────────────────────────

let _channels: any[] = []
function cleanup() {
    _channels.forEach(ch => supabase.removeChannel(ch))
    _channels = []
    _avatarMap = {}
    _subLinkVisible = {}
    document.getElementById("mk-project-page")?.remove()
    document.getElementById("mk-proj-styles")?.remove()
    delete (window as any)._mk
}

// ─── Styles ──────────────────────────────────────────────────

function injectStyles() {
    if (document.getElementById("mk-proj-styles")) return
    // Always enforce correct viewport meta — Framer may have set a different
    // value (e.g. a fixed width) which prevents mobile media queries from firing
    const existingVp = document.querySelector("meta[name=viewport]") as HTMLMetaElement | null
    if (existingVp) {
        existingVp.content = "width=device-width, initial-scale=1"
    } else {
        const vp = document.createElement("meta")
        vp.name = "viewport"
        vp.content = "width=device-width, initial-scale=1"
        document.head.appendChild(vp)
    }
    const s = document.createElement("style")
    s.id = "mk-proj-styles"
    s.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes mkFadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mkSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mkShimmer {
            0%{background-position:200% 0} 100%{background-position:-200% 0}
        }

        /* ── Page shell ── */
        #mk-project-page {
            position: fixed; inset: 0;
            background: ${PAGE_BG};
            z-index: 9000;
            overflow-y: auto;
            font-family: Manrope, sans-serif;
            color: #fff;
        }
        #mk-project-page::-webkit-scrollbar { width: 6px; }
        #mk-project-page::-webkit-scrollbar-thumb { background: rgba(251,255,18,0.12); border-radius: 3px; }

        /* ── Nav ── */
        #mk-proj-nav {
            position: sticky; top: 0;
            background: ${PAGE_BG};
            border-bottom: 1px solid rgba(255,255,255,0.06);
            z-index: 100;
            padding: 0 28px;
            display: flex; align-items: center; justify-content: space-between;
            height: 62px; flex-shrink: 0;
        }
        .mk-nav-logo {
            font-size: 21px; font-weight: 800;
            letter-spacing: -0.05em; color: ${WHITE};
        }
        .mk-nav-right { display: flex; align-items: center; gap: 14px; }
        .mk-nav-name { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.45); }
        .mk-back-btn {
            display: flex; align-items: center; gap: 6px;
            padding: 8px 16px; border-radius: 10px;
            border: 1.5px solid rgba(255,255,255,0.14); background: transparent;
            color: rgba(255,255,255,0.5);
            font-family: Manrope, sans-serif; font-size: 13px; font-weight: 600;
            cursor: pointer; transition: all 0.15s;
        }
        .mk-back-btn:hover { border-color: rgba(255,255,255,0.32); color: #fff; }

        /* ── Content layout ── */
        #mk-proj-content {
            max-width: 880px; margin: 0 auto;
            padding: 32px 24px 80px;
            display: flex; flex-direction: column; gap: 16px;
        }

        /* ── Section cards ── */
        .mk-section {
            background: ${CARD_BG};
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 20px;
            padding: 24px 26px;
        }
        .mk-section-label {
            font-size: 10px; font-weight: 700; letter-spacing: 0.09em;
            text-transform: uppercase; color: rgba(255,255,255,0.28);
            margin: 0 0 16px;
        }

        /* ── Header section ── */
        .mk-proj-client { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.38); margin: 0 0 8px; }
        .mk-proj-title  { font-size: 28px; font-weight: 800; letter-spacing: -0.05em; color: #fff; margin: 0 0 18px; line-height: 1.2; }
        .mk-meta-row    { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .mk-pill-status {
            padding: 5px 14px; border-radius: 999px;
            font-size: 12px; font-weight: 700; letter-spacing: -0.01em;
        }
        .mk-pill-priority {
            padding: 5px 14px; border-radius: 999px;
            font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.65);
        }
        .mk-pill-due {
            padding: 5px 14px; border-radius: 999px;
            font-size: 12px; font-weight: 600;
            background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.4);
        }
        .mk-assignee-row { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 16px; }
        .mk-assignee-chip {
            padding: 5px 13px; border-radius: 999px;
            background: rgba(251,255,18,0.08); border: 1.5px solid rgba(251,255,18,0.18);
            color: ${MARKEN_YELLOW}; font-size: 12px; font-weight: 600;
        }
        .mk-assignee-chip.lead { background: rgba(251,255,18,0.15); border-color: rgba(251,255,18,0.35); }
        .mk-lead-tag { font-weight: 400; opacity: 0.5; margin-left: 3px; }

        /* ── Brief section ── */
        .mk-brief-text {
            font-size: 15px; line-height: 1.75; color: rgba(255,255,255,0.72);
            white-space: pre-wrap; margin: 0;
        }
        .mk-brief-links { margin-top: 14px; display: flex; flex-direction: column; gap: 7px; }
        .mk-brief-link {
            display: inline-flex; align-items: center; gap: 7px;
            color: ${MARKEN_YELLOW}; font-size: 13px; font-weight: 600;
            text-decoration: none; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .mk-brief-link:hover { text-decoration: underline; }
        .mk-dl-btn {
            margin-top: 16px; display: inline-flex; align-items: center; gap: 8px;
            padding: 10px 18px; border-radius: 10px;
            border: 1.5px solid rgba(251,255,18,0.22); background: rgba(251,255,18,0.05);
            color: ${MARKEN_YELLOW}; font-family: Manrope, sans-serif;
            font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s;
        }
        .mk-dl-btn:hover { background: rgba(251,255,18,0.11); }

        /* ── Actions section ── */
        .mk-action-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .mk-action-btn {
            padding: 12px 24px; border-radius: 12px; border: none;
            font-family: Manrope, sans-serif; font-size: 14px; font-weight: 700;
            cursor: pointer; transition: all 0.15s; letter-spacing: -0.02em;
        }
        .mk-action-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .mk-btn-yellow  { background: ${MARKEN_YELLOW}; color: ${MARKEN_BLACK}; }
        .mk-btn-yellow:hover:not(:disabled) { opacity: 0.88; }
        .mk-btn-green   { background: #22C55E; color: #fff; }
        .mk-btn-green:hover:not(:disabled)  { opacity: 0.88; }
        .mk-btn-red     { background: #EF4444; color: #fff; }
        .mk-btn-red:hover:not(:disabled)    { opacity: 0.88; }
        .mk-action-note { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.32); }
        .mk-approved-msg { display: flex; align-items: center; gap: 9px; font-size: 15px; font-weight: 700; color: #22C55E; }

        /* ── Submissions ── */
        .mk-sub-grid { display: flex; flex-direction: column; gap: 12px; }
        .mk-sub-card {
            border-radius: 14px; padding: 18px;
            background: rgba(255,255,255,0.03);
            border: 1.5px solid rgba(255,255,255,0.07);
        }
        .mk-sub-card.is-me { border-color: rgba(251,255,18,0.18); background: rgba(251,255,18,0.03); }
        .mk-sub-head {
            display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;
        }
        .mk-sub-who { font-size: 14px; font-weight: 700; color: #fff; }
        .mk-sub-role { font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.35); margin-left: 6px; }
        .mk-upload-btn {
            display: flex; align-items: center; gap: 6px;
            padding: 7px 14px; border-radius: 9px;
            border: 1.5px solid rgba(251,255,18,0.28); background: rgba(251,255,18,0.06);
            color: ${MARKEN_YELLOW}; font-family: Manrope, sans-serif;
            font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s;
        }
        .mk-upload-btn:hover { background: rgba(251,255,18,0.13); }
        .mk-versions { display: flex; flex-direction: column; gap: 8px; }
        .mk-version {
            display: flex; align-items: center; justify-content: space-between;
            padding: 9px 12px; border-radius: 9px;
            background: rgba(255,255,255,0.04); gap: 8px;
        }
        .mk-version.latest {
            background: rgba(251,255,18,0.07);
            border: 1px solid rgba(251,255,18,0.14);
        }
        .mk-ver-left  { display: flex; align-items: center; gap: 8px; overflow: hidden; }
        .mk-ver-num {
            font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 5px;
            background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.4); flex-shrink: 0;
        }
        .mk-version.latest .mk-ver-num { background: ${MARKEN_YELLOW}; color: ${MARKEN_BLACK}; }
        .mk-ver-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.75); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mk-ver-latest-tag { font-size: 10px; font-weight: 700; color: ${MARKEN_YELLOW}; opacity: 0.6; flex-shrink: 0; }
        .mk-ver-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .mk-ver-date  { font-size: 11px; color: rgba(255,255,255,0.28); }
        .mk-ver-dl {
            color: ${MARKEN_YELLOW}; font-size: 12px; font-weight: 700;
            text-decoration: none; padding: 4px 10px; border-radius: 7px;
            background: rgba(251,255,18,0.08); transition: background 0.15s; white-space: nowrap;
        }
        .mk-ver-dl:hover { background: rgba(251,255,18,0.18); }
        .mk-sub-empty {
            text-align: center; padding: 20px 0;
            font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.2);
        }

        /* ── Comments ── */
        #mk-comments-feed {
            display: flex; flex-direction: column; gap: 14px;
            margin-bottom: 20px; max-height: 440px;
            overflow-y: auto; padding-right: 4px;
        }
        #mk-comments-feed::-webkit-scrollbar { width: 4px; }
        #mk-comments-feed::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .mk-comment { display: flex; gap: 11px; animation: mkFadeIn 0.2s ease; }
        .mk-comment-av {
            width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
            background: rgba(251,255,18,0.12); border: 1.5px solid rgba(251,255,18,0.22);
            display: flex; align-items: center; justify-content: center;
            font-size: 12px; font-weight: 800; color: ${MARKEN_YELLOW}; text-transform: uppercase;
        }
        .mk-comment-body { flex: 1; }
        .mk-comment-meta { display: flex; align-items: baseline; gap: 8px; margin-bottom: 5px; }
        .mk-comment-author { font-size: 13px; font-weight: 700; color: #fff; }
        .mk-comment-time   { font-size: 11px; color: rgba(255,255,255,0.28); }
        .mk-comment-text {
            font-size: 14px; line-height: 1.65; color: rgba(255,255,255,0.72);
            background: rgba(255,255,255,0.04); padding: 10px 14px;
            border-radius: 0 12px 12px 12px; white-space: pre-wrap;
        }
        .mk-comment-text.system {
            background: rgba(251,255,18,0.05);
            border: 1px solid rgba(251,255,18,0.1);
            color: rgba(255,255,255,0.45); font-style: italic; font-size: 13px;
        }
        .mk-no-comments {
            text-align: center; padding: 28px 0;
            font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.18);
        }
        .mk-comment-input-row { display: flex; gap: 10px; align-items: flex-end; }
        #mk-comment-input {
            flex: 1; background: ${INPUT_BG};
            border: 1.5px solid ${INPUT_BORDER};
            border-radius: 12px; padding: 12px 16px;
            font-family: Manrope, sans-serif; font-size: 14px; color: #fff;
            outline: none; resize: none; min-height: 46px; max-height: 120px;
            transition: border-color 0.15s; line-height: 1.5;
        }
        #mk-comment-input:focus { border-color: ${MARKEN_YELLOW}; }
        #mk-comment-input::placeholder { color: rgba(255,255,255,0.2); }
        .mk-send-btn {
            padding: 12px 22px; border-radius: 12px; border: none;
            background: ${MARKEN_YELLOW}; color: ${MARKEN_BLACK};
            font-family: Manrope, sans-serif; font-size: 14px; font-weight: 700;
            cursor: pointer; transition: opacity 0.15s; white-space: nowrap; letter-spacing: -0.02em;
        }
        .mk-send-btn:hover { opacity: 0.88; }
        .mk-send-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        /* ── Request changes modal ── */
        #mk-changes-modal {
            position: fixed; inset: 0;
            background: rgba(10,10,8,0.78);
            z-index: 99990;
            display: flex; align-items: center; justify-content: center;
        }
        .mk-changes-box {
            background: #22231A; border-radius: 20px;
            padding: 28px 30px; width: min(460px, 92vw);
            animation: mkSlideUp 0.25s ease;
            border: 1px solid rgba(255,255,255,0.08);
        }
        .mk-changes-title { font-size: 18px; font-weight: 800; letter-spacing: -0.05em; color: #fff; margin: 0 0 6px; }
        .mk-changes-sub   { font-size: 13px; color: rgba(255,255,255,0.38); margin: 0 0 18px; }
        .mk-changes-ta {
            width: 100%; background: ${INPUT_BG};
            border: 1.5px solid ${INPUT_BORDER};
            border-radius: 12px; padding: 12px 16px;
            font-family: Manrope, sans-serif; font-size: 14px; color: #fff;
            outline: none; resize: vertical; min-height: 80px;
            transition: border-color 0.15s;
        }
        .mk-changes-ta:focus { border-color: ${MARKEN_YELLOW}; }
        .mk-changes-ta::placeholder { color: rgba(255,255,255,0.2); }
        .mk-changes-btns { display: flex; gap: 10px; margin-top: 16px; }
        .mk-changes-cancel {
            flex: 1; padding: 12px; border-radius: 12px;
            border: 1.5px solid rgba(255,255,255,0.15); background: transparent;
            color: rgba(255,255,255,0.45); font-family: Manrope, sans-serif;
            font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s;
        }
        .mk-changes-cancel:hover { color: #fff; border-color: rgba(255,255,255,0.32); }
        .mk-changes-confirm {
            flex: 2; padding: 12px; border-radius: 12px; border: none;
            background: #EF4444; color: #fff;
            font-family: Manrope, sans-serif; font-size: 14px; font-weight: 700;
            cursor: pointer; transition: opacity 0.15s; letter-spacing: -0.02em;
        }
        .mk-changes-confirm:hover { opacity: 0.88; }


        /* ── Mobile responsive ── */
        /* Using !important because Framer injects its own CSS that can win
           the specificity war against our injected stylesheet */
        @media (max-width: 768px) {
            #mk-proj-nav {
                padding: 0 16px !important;
                height: 54px !important;
            }
            .mk-nav-logo { font-size: 17px !important; }
            .mk-nav-name { display: none !important; }
            .mk-back-btn { padding: 7px 12px !important; font-size: 12px !important; }

            #mk-proj-content {
                padding: 16px 12px 80px !important;
                gap: 12px !important;
            }
            .mk-section {
                padding: 18px 16px !important;
                border-radius: 16px !important;
            }

            .mk-proj-title { font-size: 20px !important; }
            .mk-meta-row { gap: 6px !important; flex-wrap: wrap !important; }
            .mk-pill-status, .mk-pill-priority, .mk-pill-due {
                font-size: 11px !important; padding: 4px 10px !important;
            }
            .mk-assignee-row { gap: 6px !important; margin-top: 12px !important; }
            .mk-assignee-chip { font-size: 11px !important; padding: 4px 10px !important; }

            .mk-action-row {
                flex-direction: column !important;
                align-items: stretch !important;
                gap: 10px !important;
            }
            .mk-action-btn {
                width: 100% !important;
                text-align: center !important;
                padding: 13px 16px !important;
            }
            .mk-approved-msg { font-size: 13px !important; }
            .mk-action-note { font-size: 12px !important; }

            .mk-sub-card { padding: 14px 12px !important; }
            .mk-sub-head {
                flex-wrap: wrap !important;
                gap: 10px !important;
                margin-bottom: 10px !important;
            }
            .mk-sub-who  { font-size: 13px !important; }
            .mk-version  { padding: 8px 10px !important; }
            .mk-ver-left { min-width: 0 !important; flex: 1 !important; }
            .mk-ver-name { font-size: 12px !important; }
            .mk-ver-date { display: none !important; }
            .mk-ver-dl   { padding: 4px 8px !important; font-size: 11px !important; }

            #mk-comments-feed {
                max-height: 320px !important;
            }
            .mk-comment-text { font-size: 13px !important; padding: 9px 12px !important; }
            .mk-comment-input-row {
                flex-direction: column !important;
                gap: 8px !important;
                align-items: stretch !important;
            }
            #mk-comment-input {
                width: 100% !important;
                min-height: 50px !important;
            }
            .mk-send-btn {
                width: 100% !important;
                padding: 12px !important;
                border-radius: 10px !important;
            }

            #mk-changes-modal > div {
                position: fixed !important;
                bottom: 0 !important; left: 0 !important; right: 0 !important;
                width: 100% !important;
                border-radius: 20px 20px 0 0 !important;
                padding: 24px 20px 40px !important;
            }
            .mk-changes-btns { flex-direction: column !important; }

            #mk-toast {
                width: 90vw !important;
                white-space: normal !important;
                text-align: center !important;
            }
        }
        /* ── Toast ── */
        #mk-toast {
            position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
            padding: 11px 22px; border-radius: 12px;
            font-family: Manrope, sans-serif; font-size: 14px; font-weight: 600;
            z-index: 99999; white-space: nowrap; pointer-events: none;
            animation: mkFadeIn 0.2s ease;
        }
        #mk-toast.ok  { background: ${MARKEN_YELLOW}; color: ${MARKEN_BLACK}; }
        #mk-toast.err { background: #EF4444; color: #fff; }

        /* ── Skeleton ── */
        .mk-skel {
            background: linear-gradient(90deg,
                rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.05) 75%);
            background-size: 400% 100%;
            animation: mkShimmer 1.8s ease infinite;
            border-radius: 8px;
        }
    `
    document.head.appendChild(s)
}

// ─── HTML builders ───────────────────────────────────────────

// avatarMap: username → publicUrl (populated after load)
let _avatarMap: Record<string, string> = {}

// Track which user submission cards have the link input visible
let _subLinkVisible: Record<string, boolean> = {}

function commentHTML(c: any): string {
    const isSystem = c.from_user === "__system__"
    const initials = isSystem ? "⚙" : (c.from_user ?? "?").substring(0, 2).toUpperCase()
    const avStyle  = isSystem
        ? `background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.1);color:rgba(255,255,255,0.3);`
        : ``
    const avatarUrl = !isSystem ? _avatarMap[c.from_user] : null
    const avInner   = avatarUrl
        ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
        : initials
    return `
        <div class="mk-comment" id="mk-cmt-${c.id}">
            <div class="mk-comment-av" style="${avStyle}">${avInner}</div>
            <div class="mk-comment-body">
                <div class="mk-comment-meta">
                    <span class="mk-comment-author">${esc(c.from_user === "__system__" ? "System" : c.from_user)}</span>
                    <span class="mk-comment-time">${formatTime(c.created_at)}</span>
                </div>
                <div class="mk-comment-text${isSystem ? " system" : ""}">${esc(c.message ?? "")}</div>
            </div>
        </div>`
}

// ─── Section renderers ───────────────────────────────────────

function renderHeader(project: any, members: any[]) {
    const el = document.getElementById("mk-proj-header")
    if (!el) return
    const status   = project.status ?? "assigned"
    const priority = project.priority ?? "normal"
    el.innerHTML = `
        <p class="mk-proj-client">${esc(project.clients?.name ?? "Unknown Client")}</p>
        <h1 class="mk-proj-title">${esc(project.title)}</h1>
        <div class="mk-meta-row">
            <span class="mk-pill-status"
                style="background:${STATUS_COLOR[status] ?? MARKEN_YELLOW};color:${STATUS_TEXT[status] ?? MARKEN_BLACK}">
                ${STATUS_LABEL[status] ?? status}
            </span>
            <span class="mk-pill-priority" style="background:${PRIORITY_BG[priority] ?? PRIORITY_BG.normal}">
                ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
            </span>
            <span class="mk-pill-due">${formatDate(project.due_date)}</span>
        </div>
        <div class="mk-assignee-row">
            ${members.map(m => `
                <span class="mk-assignee-chip${m.role_in_project === "lead" ? " lead" : ""}">
                    ${esc(m.full_name ?? m.username)}
                    ${m.role_in_project === "lead" ? `<span class="mk-lead-tag">Lead</span>` : ""}
                </span>
            `).join("")}
        </div>`
}

function renderBrief(project: any) {
    const el = document.getElementById("mk-proj-brief")
    if (!el) return
    let briefText = project.brief ?? ""
    let links: string[] = []
    const marker = "\n\nLinks:\n"
    const idx = briefText.indexOf(marker)
    if (idx !== -1) {
        links = briefText.substring(idx + marker.length).split("\n").filter(Boolean)
        briefText = briefText.substring(0, idx)
    }
    el.innerHTML = `
        <p class="mk-section-label">Project Brief</p>
        ${briefText
            ? `<p class="mk-brief-text">${esc(briefText)}</p>`
            : `<p style="color:rgba(255,255,255,0.2);font-size:14px;margin:0;font-weight:600;">No brief written yet.</p>`}
        ${links.length > 0 ? `
            <div class="mk-brief-links">
                ${links.map(l => `<a class="mk-brief-link" href="${l}" target="_blank">🔗 ${esc(l)}</a>`).join("")}
            </div>` : ""}
        ${project.brief_file ? (() => {
            let paths: string[] = []
            try { paths = JSON.parse(project.brief_file) } catch { paths = [project.brief_file] }
            return paths.map((p, i) => {
                const fname = p.split("/").pop() ?? `Brief File ${i+1}`
                return `<button class="mk-dl-btn" onclick="window._mk.downloadBrief(${i})"
                    style="margin-right:8px;margin-top:10px;">
                    📄 ${esc(fname)}
                </button>`
            }).join("")
        })() : ""}`
}

function renderActions(project: any, user: any, lastChangesNote?: string) {
    const el = document.getElementById("mk-proj-actions")
    if (!el) return
    const status     = project.status
    const isEmployee = user.role === "employee"
    const isManager  = user.role === "head" || user.role === "admin"

    // Changes note box — shown when there's feedback from a previous review
    const changesBox = lastChangesNote
        ? `<div style="margin-top:14px;padding:14px 16px;border-radius:12px;
            background:rgba(239,68,68,0.07);border:1.5px solid rgba(239,68,68,0.2);
            font-family:Manrope,sans-serif;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.75);">
            <span style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;
                color:#EF4444;display:block;margin-bottom:6px;">↩ Changes Requested</span>
            ${esc(lastChangesNote)}
          </div>`
        : ""

    let rows = ""

    if (status === "approved") {
        rows = `<div class="mk-approved-msg">✅ This project has been approved</div>`

    } else if (isEmployee) {
        if (status === "assigned") {
            // First time employee opens project — let them start it
            rows = `<button class="mk-action-btn mk-btn-yellow"
                onclick="window._mk.markInProgress()">▶ Start Project</button>
                <span class="mk-action-note">Mark as in progress to begin working.</span>`

        } else if (status === "in_progress") {
            // Working — show changes note if this is a return from review
            rows = `<button class="mk-action-btn mk-btn-yellow"
                onclick="window._mk.submitForReview()">📤 Submit for Review</button>
                ${changesBox}`

        } else if (status === "in_review") {
            rows = `<span class="mk-action-note">⏳ Submitted for review. Waiting for approval.</span>`

        } else if (status === "changes_requested") {
            // Legacy fallback — new flow auto-transitions, but handle old records
            rows = `<button class="mk-action-btn mk-btn-yellow"
                onclick="window._mk.markInProgress()">🔄 Mark as In Progress</button>
                ${changesBox || `<span class="mk-action-note">Review comments below for feedback.</span>`}`
        }

    } else if (isManager) {
        if (status === "in_review") {
            rows = `
                <button class="mk-action-btn mk-btn-green"
                    onclick="window._mk.approveProject()">✓ Approve Project</button>
                <button class="mk-action-btn mk-btn-red"
                    onclick="window._mk.openChangesModal()">↩ Request Changes</button>`
        } else if (status === "assigned") {
            rows = `<span class="mk-action-note">Waiting for team to start the project.</span>`
        } else if (status === "in_progress") {
            rows = `<span class="mk-action-note">Team is working on this project.</span>`
        }
    }

    el.innerHTML = `
        <p class="mk-section-label">Actions</p>
        <div class="mk-action-row">${rows}</div>`
}

function renderSubmissions(members: any[], submissions: any[], user: any) {
    const el = document.getElementById("mk-proj-submissions")
    if (!el) return

    // Group + sort by version
    const byUser: Record<string, any[]> = {}
    for (const s of submissions) {
        if (!byUser[s.submitted_by]) byUser[s.submitted_by] = []
        byUser[s.submitted_by].push(s)
    }
    for (const u of Object.keys(byUser)) {
        byUser[u].sort((a, b) => (a.version ?? 0) - (b.version ?? 0))
    }

    el.innerHTML = `
        <p class="mk-section-label">Submissions</p>
        <div class="mk-sub-grid">
            ${members.map(m => {
                const isMe      = m.username === user.username
                const versions  = byUser[m.username] ?? []
                const hasAny    = versions.length > 0
                const showLink  = _subLinkVisible[m.username] ?? false
                const nextVer   = versions.length + 1
                return `
                    <div class="mk-sub-card${isMe ? " is-me" : ""}">
                        <div class="mk-sub-head">
                            <div>
                                <span class="mk-sub-who">${esc(m.full_name ?? m.username)}</span>
                                <span class="mk-sub-role">${m.role_in_project === "lead" ? "Lead" : "Support"}</span>
                            </div>
                            ${isMe ? `
                                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                    <label for="mk-file-${m.username}" class="mk-upload-btn"
                                        style="cursor:pointer !important;">
                                        ↑ ${hasAny ? "New Version" : "Upload File"}
                                    </label>
                                    <button class="mk-upload-btn" style="background:rgba(251,255,18,0.03);"
                                        onclick="window._mk.toggleSubLink('${m.username}')">
                                        🔗 Link
                                    </button>
                                </div>
                                <input id="mk-file-${m.username}" type="file" multiple style="display:none;"
                                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip,.fig,.ai,.psd,.mp4,.mov,.gif,.xlsx,.pptx"
                                    onchange="window._mk.fileChosen('${m.username}', this)" />
                            ` : ""}
                        </div>
                        ${isMe && showLink ? `
                            <div style="display:flex;gap:8px;margin-bottom:12px;">
                                <input id="mk-sub-link-${m.username}"
                                    style="flex:1;background:#1E1F14;border:1.5px solid rgba(251,255,18,0.18);
                                    border-radius:10px;padding:10px 14px;font-family:Manrope,sans-serif;
                                    font-size:14px;color:#fff;outline:none;"
                                    placeholder="https://..." type="url" />
                                <button onclick="window._mk.submitLink('${m.username}')"
                                    style="padding:0 16px;border-radius:10px;border:none;
                                    background:#FBFF12;color:#3C3D2A;font-family:Manrope,sans-serif;
                                    font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;">
                                    Submit
                                </button>
                                <button onclick="window._mk.toggleSubLink('${m.username}')"
                                    style="padding:0 12px;border-radius:10px;
                                    border:1.5px solid rgba(255,255,255,0.12);background:transparent;
                                    color:rgba(255,255,255,0.4);font-family:Manrope,sans-serif;
                                    font-size:13px;cursor:pointer;">✕</button>
                            </div>` : ""}
                        ${!hasAny
                            ? `<div class="mk-sub-empty">No submission yet</div>`
                            : `<div class="mk-versions">
                                ${versions.map((v, i) => {
                                    const isLatest  = i === versions.length - 1
                                    const isLink    = v.file_url?.startsWith("http") && !v.file_url?.includes("supabase")
                                    const icon      = isLink ? "🔗" : "📄"
                                    return `
                                        <div class="mk-version${isLatest ? " latest" : ""}">
                                            <div class="mk-ver-left">
                                                <span class="mk-ver-num">v${v.version ?? i + 1}</span>
                                                <span class="mk-ver-name">${icon} ${esc(v.file_name ?? "File")}</span>
                                                ${isLatest ? `<span class="mk-ver-latest-tag">Latest</span>` : ""}
                                            </div>
                                            <div class="mk-ver-right">
                                                <span class="mk-ver-date">${formatTime(v.created_at)}</span>
                                                <a class="mk-ver-dl" href="${v.file_url}" target="_blank">↗</a>
                                            </div>
                                        </div>`
                                }).join("")}
                               </div>`
                        }
                    </div>`
            }).join("")}
        </div>`
}

function renderCommentsSection(comments: any[]) {
    const feed = document.getElementById("mk-comments-feed")
    if (!feed) return
    if (comments.length === 0) {
        feed.innerHTML = `<div class="mk-no-comments">No comments yet. Be the first!</div>`
    } else {
        feed.innerHTML = comments.map(commentHTML).join("")
        feed.scrollTop = feed.scrollHeight
    }
}

function appendComment(c: any) {
    const feed = document.getElementById("mk-comments-feed")
    if (!feed) return
    if (document.getElementById(`mk-cmt-${c.id}`)) return   // already rendered
    feed.querySelector(".mk-no-comments")?.remove()
    feed.insertAdjacentHTML("beforeend", commentHTML(c))
    feed.scrollTop = feed.scrollHeight
}

// ─── Main init ───────────────────────────────────────────────

async function initProjectPage() {
    const projectId = getProjectId()
    if (!projectId) { return }

    injectStyles()
    const user = getUser()

    // ── Inject skeleton page ──
    const page = document.createElement("div")
    page.id = "mk-project-page"
    page.innerHTML = `
        <nav id="mk-proj-nav">
            <span class="mk-nav-logo">Marken OS</span>
            <div class="mk-nav-right">
                <span class="mk-nav-name">${esc(user.full_name ?? user.username ?? "")}</span>
                <button class="mk-back-btn" onclick="window._mk.back()">← Back</button>
            </div>
        </nav>
        <div id="mk-proj-content">
            <!-- Header -->
            <div class="mk-section">
                <div id="mk-proj-header">
                    <div class="mk-skel" style="height:12px;width:80px;margin-bottom:10px;"></div>
                    <div class="mk-skel" style="height:28px;width:55%;margin-bottom:18px;"></div>
                    <div style="display:flex;gap:8px;">
                        <div class="mk-skel" style="height:26px;width:100px;border-radius:999px;"></div>
                        <div class="mk-skel" style="height:26px;width:100px;border-radius:999px;"></div>
                        <div class="mk-skel" style="height:26px;width:110px;border-radius:999px;"></div>
                    </div>
                </div>
            </div>
            <!-- Brief -->
            <div class="mk-section" id="mk-proj-brief">
                <div class="mk-skel" style="height:11px;width:80px;margin-bottom:16px;"></div>
                <div class="mk-skel" style="height:14px;width:100%;margin-bottom:8px;"></div>
                <div class="mk-skel" style="height:14px;width:70%;"></div>
            </div>
            <!-- Actions -->
            <div class="mk-section" id="mk-proj-actions">
                <div class="mk-skel" style="height:11px;width:60px;margin-bottom:16px;"></div>
                <div class="mk-skel" style="height:44px;width:190px;border-radius:12px;"></div>
            </div>
            <!-- Submissions -->
            <div class="mk-section" id="mk-proj-submissions">
                <div class="mk-skel" style="height:11px;width:90px;margin-bottom:16px;"></div>
                <div class="mk-skel" style="height:78px;width:100%;border-radius:14px;"></div>
            </div>
            <!-- Comments -->
            <div class="mk-section">
                <p class="mk-section-label">Comments</p>
                <div id="mk-comments-feed">
                    <div class="mk-no-comments">Loading...</div>
                </div>
                <div class="mk-comment-input-row">
                    <textarea id="mk-comment-input" placeholder="Add a comment…" rows="1"
                        onkeydown="window._mk.commentKeydown(event)"></textarea>
                    <button class="mk-send-btn" onclick="window._mk.sendComment()">Send</button>
                </div>
            </div>
        </div>`
    document.body.appendChild(page)

    // ── Load all data in parallel ──
    // Split clients into separate query — FK joins can fail silently under RLS
    const [projRes, membersRes, submissionsRes, commentsRes] = await Promise.all([
        supabase.from("projects")
            .select("id,title,status,priority,due_date,brief,brief_file,client_id")
            .eq("id", projectId).single(),
        supabase.from("project_members")
            .select("username,role_in_project")
            .eq("project_id", projectId),
        supabase.from("submissions")
            .select("id,submitted_by,file_url,file_name,version,created_at")
            .eq("project_id", projectId)
            .order("version", { ascending: true }),
        supabase.from("comments")
            .select("id,from_user,message,created_at")
            .eq("project_id", projectId)
            .order("created_at", { ascending: true }),
    ])


    if (projRes.error || !projRes.data) {
        console.error("[MarkenOS] Failed to load project:", projRes.error)
        // Replace skeleton with readable error state instead of freezing
        const header = document.getElementById("mk-proj-header")
        if (header) header.innerHTML = `
            <p style="color:#EF4444;font-family:Manrope,sans-serif;font-size:15px;font-weight:600;margin:0;">
                Failed to load project. Please go back and try again.
            </p>
            <p style="color:rgba(255,255,255,0.3);font-family:Manrope,sans-serif;font-size:12px;margin:8px 0 0;">
                ${projRes.error?.message ?? "Unknown error"} · id: ${projectId}
            </p>`
        ;["mk-proj-brief","mk-proj-actions","mk-proj-submissions"].forEach(id => {
            const el = document.getElementById(id)
            if (el) el.style.display = "none"
        })
        const feed = document.getElementById("mk-comments-feed")
        if (feed) feed.innerHTML = ""
        toast("Failed to load project", "err")
        return
    }

    let project    = projRes.data as any
    let rawMembers = membersRes.data ?? []

    // Fetch client name separately
    if (project.client_id) {
        const { data: clientData } = await supabase
            .from("clients").select("name").eq("id", project.client_id).single()
        project = { ...project, clients: clientData ? { name: clientData.name } : null }
    }

    let submissions  = submissionsRes.data ?? []
    const comments   = commentsRes.data ?? []

    // Enrich members with full names + avatars from users table
    let members = rawMembers
    const allUsernames = [
        ...new Set([
            ...rawMembers.map(m => m.username),
            ...comments.map(c => c.from_user).filter(u => u && u !== "__system__"),
        ])
    ]
    if (allUsernames.length > 0) {
        const { data: usersData } = await supabase
            .from("users").select("username,full_name,avatar_url").in("username", allUsernames)
        if (usersData) {
            const nameMap: Record<string, string> = {}
            for (const u of usersData) {
                nameMap[u.username] = u.full_name
                if (u.avatar_url) _avatarMap[u.username] = u.avatar_url
            }
            members = rawMembers.map(m => ({ ...m, full_name: nameMap[m.username] ?? m.username }))
        }
    }

    // ── Extract last changes note from comments for inline display ──
    function getLastChangesNote(cmts: any[]): string {
        const last = [...cmts].reverse().find(c =>
            c.message?.startsWith("↩ Changes requested:")
        )
        if (!last) return ""
        return last.message.replace(/^↩ Changes requested: ?"?/, "").replace(/"$/, "").trim()
    }

    // ── Initial render ──
    renderHeader(project, members)
    renderBrief(project)
    renderActions(project, user, getLastChangesNote(comments))
    renderSubmissions(members, submissions, user)
    renderCommentsSection(comments)

    // ── Expose handlers ──
    ;(window as any)._mk = {

        back() {
            const domainUrls: Record<string, string> = {
                marketing:   "/marketing-dashboard",
                design:      "/design-dashboard",
                socialmedia: "/socialmedia-dashboard",
                webdev:      "/webdev-dashboard",
            }
            const u = getUser()
            if (u.role === "admin") { window.location.href = "/admin-dashboard"; return }
            window.location.href = domainUrls[u.domain] ?? "/marketing-dashboard"
        },

        // ── Brief file download ──
        async downloadBrief(index: number = 0) {
            if (!project.brief_file) return
            let paths: string[] = []
            try { paths = JSON.parse(project.brief_file) } catch { paths = [project.brief_file] }
            const path = paths[index]
            if (!path) { toast("File not found", "err"); return }
            const { data } = supabase.storage.from("submissions").getPublicUrl(path)
            if (data?.publicUrl) window.open(data.publicUrl, "_blank")
            else toast("Could not get download link", "err")
        },

        // ── Status: submit for review ──
        async submitForReview() {
            if ((window as any)._mkAG) return
            ;(window as any)._mkAG = true
            setTimeout(() => delete (window as any)._mkAG, 2500)

            const { error } = await supabase.from("projects")
                .update({ status: "in_review" }).eq("id", projectId)
            if (error) { toast("Failed to update status", "err"); return }
            await supabase.from("comments").insert({
                project_id: projectId, from_user: user.username,
                message: `📤 Submitted project for review`,
            })
            toast("Submitted for review!", "ok")
        },

        // ── Status: mark in progress ──
        // Used both when starting an assigned project AND after changes requested
        async markInProgress() {
            if ((window as any)._mkAG) return
            ;(window as any)._mkAG = true
            setTimeout(() => delete (window as any)._mkAG, 2500)

            const wasAssigned = project.status === "assigned"
            const { error } = await supabase.from("projects")
                .update({ status: "in_progress" }).eq("id", projectId)
            if (error) { toast("Failed to update status", "err"); return }
            await supabase.from("comments").insert({
                project_id: projectId, from_user: user.username,
                message: wasAssigned
                    ? `▶ Started project`
                    : `🔄 Marked as In Progress — working on changes`,
            })
            toast(wasAssigned ? "Project started!" : "Status updated", "ok")
        },

        // ── Status: approve ──
        async approveProject() {
            if ((window as any)._mkAG) return
            ;(window as any)._mkAG = true
            setTimeout(() => delete (window as any)._mkAG, 2500)

            const { error } = await supabase.from("projects")
                .update({ status: "approved" }).eq("id", projectId)
            if (error) { toast("Failed to approve", "err"); return }

            await supabase.from("comments").insert({
                project_id: projectId, from_user: user.username,
                message: `✅ Project approved!`,
            })
            if (members.length > 0) {
                await supabase.from("notifications").insert(
                    members.map(m => ({
                        for_user: m.username, type: "project_approved",
                        message: `"${project.title}" has been approved! 🎉`,
                        project_id: projectId, is_read: false,
                    }))
                )
            }
            toast("Project approved! 🎉", "ok")
        },

        // ── Request changes modal ──
        openChangesModal() {
            if (document.getElementById("mk-changes-modal")) return
            const el = document.createElement("div")
            el.id = "mk-changes-modal"
            el.innerHTML = `
                <div class="mk-changes-box">
                    <p class="mk-changes-title">Request Changes</p>
                    <p class="mk-changes-sub">Describe what needs to be changed (optional).</p>
                    <textarea id="mk-changes-note" class="mk-changes-ta"
                        placeholder="e.g. The colour palette needs to match the brand guide…"></textarea>
                    <div class="mk-changes-btns">
                        <button class="mk-changes-cancel"
                            onclick="window._mk.closeChangesModal()">Cancel</button>
                        <button class="mk-changes-confirm"
                            onclick="window._mk.confirmChanges()">↩ Request Changes</button>
                    </div>
                </div>`
            document.body.appendChild(el)
            setTimeout(() => (document.getElementById("mk-changes-note") as HTMLTextAreaElement)?.focus(), 60)
        },

        closeChangesModal() {
            document.getElementById("mk-changes-modal")?.remove()
        },

        async confirmChanges() {
            if ((window as any)._mkAG) return
            ;(window as any)._mkAG = true
            setTimeout(() => delete (window as any)._mkAG, 2500)

            const note = ((document.getElementById("mk-changes-note") as HTMLTextAreaElement)?.value ?? "").trim()
            document.getElementById("mk-changes-modal")?.remove()

            // Move directly to in_progress so employee can keep working
            // The changes note is recorded in comments so they know what to fix
            const { error } = await supabase.from("projects")
                .update({ status: "in_progress" }).eq("id", projectId)
            if (error) { toast("Failed to update status", "err"); return }

            await supabase.from("comments").insert({
                project_id: projectId, from_user: user.username,
                message: note ? `↩ Changes requested: "${note}"` : `↩ Changes requested`,
            })
            if (members.length > 0) {
                await supabase.from("notifications").insert(
                    members.map(m => ({
                        for_user: m.username, type: "changes_requested",
                        message: `Changes requested on "${project.title}"`,
                        project_id: projectId, is_read: false,
                    }))
                )
            }
            toast("Changes requested", "ok")
        },

        // ── Submissions ──
        triggerUpload(username: string) {
            document.getElementById(`mk-file-${username}`)?.click()
        },

        async fileChosen(username: string, input: HTMLInputElement) {
            const files = Array.from(input.files ?? [])
            if (!files.length) return
            input.value = "" // reset so same file can be re-selected

            toast(`Uploading ${files.length} file${files.length > 1 ? "s" : ""}…`, "ok")

            for (const file of files) {
                const existingVersions = submissions.filter(s => s.submitted_by === username)
                const nextVersion = existingVersions.length + 1
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 40)
                const path = `${projectId}/${username}/v${nextVersion}_${safeName}`

                const { error: upErr } = await supabase.storage
                    .from("submissions").upload(path, file, { upsert: true, contentType: file.type })
                if (upErr) {
                    toast(`"${file.name}" failed: ${upErr.message ?? "storage error"}`, "err")
                    continue
                }

                const { data: urlData } = supabase.storage.from("submissions").getPublicUrl(path)

                const { data: sub, error: subErr } = await supabase.from("submissions").insert({
                    project_id:   projectId,
                    submitted_by: username,
                    file_url:     urlData?.publicUrl ?? "",
                    file_name:    file.name,
                    version:      nextVersion,
                }).select().single()

                if (subErr || !sub) { toast(`Failed to save "${file.name}"`, "err"); continue }

                await supabase.from("comments").insert({
                    project_id: projectId, from_user: username,
                    message: `📎 Uploaded v${nextVersion}: ${file.name}`,
                })

                submissions = [...submissions, sub]
            }

            renderSubmissions(members, submissions, user)
            toast(`Upload complete!`, "ok")
        },

        // ── Submission link ──
        toggleSubLink(username: string) {
            _subLinkVisible[username] = !(_subLinkVisible[username] ?? false)
            renderSubmissions(members, submissions, user)
        },

        async submitLink(username: string) {
            const input = document.getElementById(`mk-sub-link-${username}`) as HTMLInputElement
            const url   = (input?.value ?? "").trim()
            if (!url || !url.startsWith("http")) { toast("Enter a valid URL", "err"); return }

            const existingVersions = submissions.filter(s => s.submitted_by === username)
            const nextVersion      = existingVersions.length + 1

            const { data: sub, error: subErr } = await supabase.from("submissions").insert({
                project_id:   projectId,
                submitted_by: username,
                file_url:     url,
                file_name:    url.replace(/^https?:\/\//, "").substring(0, 60),
                version:      nextVersion,
            }).select().single()

            if (subErr || !sub) { toast("Failed to save link", "err"); return }

            await supabase.from("comments").insert({
                project_id: projectId, from_user: username,
                message: `🔗 Submitted link v${nextVersion}: ${url}`,
            })

            submissions = [...submissions, sub]
            _subLinkVisible[username] = false
            renderSubmissions(members, submissions, user)
            toast("Link submitted!", "ok")
        },

        // ── Comments ──
        commentKeydown(e: KeyboardEvent) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                ;(window as any)._mk.sendComment()
            }
        },

        async sendComment() {
            const input = document.getElementById("mk-comment-input") as HTMLTextAreaElement
            const message = (input?.value ?? "").trim()
            if (!message) return

            const btn = document.querySelector(".mk-send-btn") as HTMLButtonElement
            if (btn) btn.disabled = true
            if (input) input.value = ""

            const { error } = await supabase.from("comments").insert({
                project_id: projectId,
                from_user:   user.username,
                message,
            })

            if (btn) btn.disabled = false
            if (error) {
                console.error("[MarkenOS] comment insert error:", error)
                toast(`Failed to send: ${error.message ?? "unknown error"}`, "err")
                if (input) input.value = message
            }
        },
    }

    // ── Realtime subscriptions ──

    // 1. Project status/priority changes → header + actions only
    const projCh = supabase.channel(`rt-proj-${projectId}`)
        .on("postgres_changes", {
            event: "UPDATE", schema: "public", table: "projects",
            filter: `id=eq.${projectId}`,
        }, payload => {
            project = { ...project, ...payload.new }
            renderHeader(project, members)
            // Re-compute the changes note from the current comment list
            const allComments = Array.from(document.querySelectorAll(".mk-comment"))
                .map(el => ({ message: el.querySelector(".mk-comment-text")?.textContent ?? "" }))
            renderActions(project, user, getLastChangesNote(allComments))
        })
        .subscribe()
    _channels.push(projCh)

    // 2. New submissions → submissions section only
    const subCh = supabase.channel(`rt-subs-${projectId}`)
        .on("postgres_changes", {
            event: "INSERT", schema: "public", table: "submissions",
            filter: `project_id=eq.${projectId}`,
        }, payload => {
            const s = payload.new as any
            if (!submissions.find(x => x.id === s.id)) {
                submissions = [...submissions, s]
                renderSubmissions(members, submissions, user)
            }
        })
        .subscribe()
    _channels.push(subCh)

    // 3. New comments → append only (input focus preserved)
    //    Also refresh actions if a changes-requested comment arrives
    //    so the employee sees the note immediately on the same page
    const cmtCh = supabase.channel(`rt-cmts-${projectId}`)
        .on("postgres_changes", {
            event: "INSERT", schema: "public", table: "comments",
            filter: `project_id=eq.${projectId}`,
        }, payload => {
            const c = payload.new as any
            appendComment(c)
            if (c.message?.startsWith("↩ Changes requested")) {
                const note = c.message.replace(/^↩ Changes requested: ?"?/, "").replace(/"$/, "").trim()
                renderActions(project, user, note)
            }
        })
        .subscribe()
    _channels.push(cmtCh)
}

// ─── Framer override ─────────────────────────────────────────

export function ProjectPage(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props: any) {
        useEffect(() => {
            initProjectPage()
            return cleanup
        }, [])
        // Hide the Framer placeholder — page is fully injected
        return (
            <Component
                {...props}
                style={{
                    ...props.style,
                    opacity: 0,
                    pointerEvents: "none",
                    position: "fixed",
                }}
            />
        )
    }
}
