// accountOverride.tsx
// Full DOM-injected account page
// ATTACH: AccountPage → any frame on a blank /account page
// ACCESS: Click user's name in nav bar on any dashboard

import type { ComponentType } from "react"
import { useEffect } from "react"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
    "https://kufsbpaleeawqmtlnnno.supabase.co",
    "sb_publishable_S3HP2seIYkKSuBoXrRyp3g_2_cWKoLd"
)

const MARKEN_YELLOW = "#FBFF12"
const MARKEN_BLACK  = "#3C3D2A"
const WHITE         = "#FFFFFF"
const PAGE_BG       = "#1A1B12"
const CARD_BG       = "#2E3021"
const INPUT_BG      = "#1E1F14"
const INPUT_BORDER  = "rgba(251,255,18,0.18)"

const DOMAIN_LABELS: Record<string, string> = {
    marketing:   "Marketing and Sales",
    design:      "Design and Creatives",
    socialmedia: "Social Media Management",
    webdev:      "Website Design and Development",
}
const ROLE_LABELS: Record<string, string> = {
    admin:    "Admin",
    head:     "Domain Head",
    employee: "Employee",
}

function isEditor(): boolean {
    try {
        return window.location.href.includes("framer.com") ||
               window.location.href.includes("framerstatic.com")
    } catch { return true }
}

function getUser(): any {
    try { return JSON.parse(sessionStorage.getItem("marken_user") ?? "{}") } catch { return {} }
}
function esc(s: string): string {
    return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
function toast(msg: string, type: "ok" | "err") {
    document.getElementById("mk-ac-toast")?.remove()
    const el = document.createElement("div")
    el.id = "mk-ac-toast"; el.className = type; el.innerText = msg
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 3200)
}

let _cleanup: (() => void) | null = null

function getDashboardUrl(user: any): string {
    if (user.role === "admin") return "/admin-dashboard"
    const map: Record<string, string> = {
        marketing:   "/marketing-dashboard",
        design:      "/design-dashboard",
        socialmedia: "/socialmedia-dashboard",
        webdev:      "/webdev-dashboard",
    }
    return map[user.domain] ?? "/marketing-dashboard"
}

function injectStyles() {
    if (document.getElementById("mk-ac-styles")) return
    const existingVp = document.querySelector("meta[name=viewport]") as HTMLMetaElement | null
    if (existingVp) existingVp.content = "width=device-width, initial-scale=1"
    else {
        const vp = document.createElement("meta"); vp.name = "viewport"
        vp.content = "width=device-width, initial-scale=1"; document.head.appendChild(vp)
    }
    const s = document.createElement("style"); s.id = "mk-ac-styles"
    s.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes mkAcFadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mkAcShimmer {
            0%{background-position:200% 0} 100%{background-position:-200% 0}
        }

        #mk-account-page {
            position: fixed; inset: 0;
            background: ${PAGE_BG};
            z-index: 9000;
            overflow-y: auto;
            font-family: Manrope, sans-serif;
            color: #fff;
        }
        #mk-account-page::-webkit-scrollbar { width: 6px; }
        #mk-account-page::-webkit-scrollbar-thumb { background: rgba(251,255,18,0.1); border-radius: 3px; }

        /* ── Nav ── */
        #mk-ac-nav {
            position: sticky; top: 0;
            background: ${PAGE_BG};
            border-bottom: 1px solid rgba(255,255,255,0.06);
            z-index: 100;
            padding: 0 28px;
            display: flex; align-items: center; justify-content: space-between;
            height: 62px;
        }
        .mk-ac-logo { font-size: 21px; font-weight: 800; letter-spacing: -0.05em; color: ${WHITE}; }
        .mk-ac-back {
            display: flex; align-items: center; gap: 6px;
            padding: 8px 16px; border-radius: 10px;
            border: 1.5px solid rgba(255,255,255,0.14); background: transparent;
            color: rgba(255,255,255,0.5); font-family: Manrope,sans-serif;
            font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s;
        }
        .mk-ac-back:hover { border-color: rgba(255,255,255,0.32); color: #fff; }

        /* ── Layout ── */
        #mk-ac-content {
            max-width: 740px; margin: 0 auto;
            padding: 36px 24px 80px;
            display: flex; flex-direction: column; gap: 16px;
            animation: mkAcFadeIn 0.25s ease;
        }

        /* ── Cards ── */
        .mk-ac-card {
            background: ${CARD_BG};
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 20px;
            padding: 26px 28px;
        }
        .mk-ac-card-label {
            font-size: 10px; font-weight: 700; letter-spacing: 0.09em;
            text-transform: uppercase; color: rgba(255,255,255,0.28);
            margin: 0 0 20px;
        }

        /* ── Avatar section ── */
        #mk-ac-avatar-section { display: flex; align-items: center; gap: 22px; }
        #mk-ac-avatar {
            width: 80px; height: 80px; border-radius: 50%; flex-shrink: 0;
            background: rgba(251,255,18,0.12);
            border: 2.5px solid rgba(251,255,18,0.28);
            display: flex; align-items: center; justify-content: center;
            font-size: 28px; font-weight: 800; color: ${MARKEN_YELLOW};
            text-transform: uppercase; overflow: hidden; cursor: pointer;
            transition: border-color 0.15s;
            position: relative;
        }
        #mk-ac-avatar:hover { border-color: ${MARKEN_YELLOW}; }
        #mk-ac-avatar:hover::after {
            content: "Change";
            position: absolute; inset: 0;
            background: rgba(0,0,0,0.55);
            display: flex; align-items: center; justify-content: center;
            font-size: 12px; font-weight: 700; color: #fff;
            border-radius: 50%;
        }
        #mk-ac-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
        #mk-ac-avatar-info { flex: 1; }
        #mk-ac-avatar-name { font-size: 22px; font-weight: 800; letter-spacing: -0.05em; color: #fff; margin: 0 0 8px; }
        .mk-ac-badge-row { display: flex; flex-wrap: wrap; gap: 7px; }
        .mk-ac-badge {
            padding: 4px 12px; border-radius: 999px;
            font-size: 11px; font-weight: 700;
            background: rgba(251,255,18,0.1);
            border: 1.5px solid rgba(251,255,18,0.2);
            color: ${MARKEN_YELLOW};
        }
        .mk-ac-badge.role { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.6); }
        .mk-ac-avatar-hint {
            font-size: 11px; color: rgba(255,255,255,0.25); margin-top: 10px; font-weight: 500;
        }
        #mk-ac-avatar-input { display: none; }

        /* ── Form fields ── */
        .mk-ac-field { margin-bottom: 16px; }
        .mk-ac-field:last-child { margin-bottom: 0; }
        .mk-ac-label {
            font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
            text-transform: uppercase; color: rgba(255,255,255,0.35);
            display: block; margin-bottom: 8px;
        }
        .mk-ac-input {
            width: 100%; background: ${INPUT_BG};
            border: 1.5px solid ${INPUT_BORDER};
            border-radius: 12px; padding: 12px 16px;
            font-family: Manrope,sans-serif; font-size: 15px; color: #fff;
            outline: none; transition: border-color 0.15s;
        }
        .mk-ac-input:focus { border-color: ${MARKEN_YELLOW}; }
        .mk-ac-input::placeholder { color: rgba(255,255,255,0.2); }
        .mk-ac-input[readonly] { opacity: 0.4; cursor: not-allowed; }
        .mk-ac-input-row { display: flex; gap: 10px; align-items: flex-end; }
        .mk-ac-input-row .mk-ac-input { flex: 1; }

        /* ── Buttons ── */
        .mk-ac-save {
            margin-top: 18px; padding: 12px 28px;
            border-radius: 12px; border: none;
            background: ${MARKEN_YELLOW}; color: ${MARKEN_BLACK};
            font-family: Manrope,sans-serif; font-size: 14px; font-weight: 700;
            cursor: pointer; transition: opacity 0.15s; letter-spacing: -0.02em;
        }
        .mk-ac-save:hover { opacity: 0.88; }
        .mk-ac-save:disabled { opacity: 0.35; cursor: not-allowed; }

        /* ── Password strength ── */
        #mk-pw-strength-bar {
            height: 3px; border-radius: 999px;
            background: rgba(255,255,255,0.08);
            margin-top: 8px; overflow: hidden;
        }
        #mk-pw-strength-fill {
            height: 100%; border-radius: 999px;
            transition: width 0.3s, background 0.3s;
            width: 0%;
        }
        #mk-pw-strength-label {
            font-size: 11px; font-weight: 600; margin-top: 5px;
            color: rgba(255,255,255,0.3);
        }
        .mk-pw-show {
            padding: 0 14px; height: 46px; border-radius: 10px;
            border: 1.5px solid rgba(255,255,255,0.13); background: transparent;
            color: rgba(255,255,255,0.4); font-family: Manrope,sans-serif;
            font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;
            transition: all 0.15s; flex-shrink: 0;
        }
        .mk-pw-show:hover { border-color: rgba(255,255,255,0.28); color: #fff; }

        /* ── Stats ── */
        .mk-ac-stats-grid {
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
        }
        .mk-ac-stat {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 14px; padding: 18px 16px;
            text-align: center;
        }
        .mk-ac-stat-num {
            font-size: 32px; font-weight: 800; letter-spacing: -0.05em;
            color: ${MARKEN_YELLOW}; line-height: 1; margin-bottom: 6px;
        }
        .mk-ac-stat-lbl {
            font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35);
            text-transform: uppercase; letter-spacing: 0.06em;
        }
        .mk-ac-skel {
            background: linear-gradient(90deg,
                rgba(255,255,255,0.05) 25%,rgba(255,255,255,0.09) 50%,rgba(255,255,255,0.05) 75%);
            background-size: 400% 100%;
            animation: mkAcShimmer 1.8s ease infinite;
            border-radius: 8px;
        }

        /* ── Toast ── */
        #mk-ac-toast {
            position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
            padding: 11px 22px; border-radius: 12px;
            font-family: Manrope,sans-serif; font-size: 14px; font-weight: 600;
            z-index: 99999; white-space: nowrap; pointer-events: none;
            animation: mkAcFadeIn 0.2s ease;
        }
        #mk-ac-toast.ok  { background: ${MARKEN_YELLOW}; color: ${MARKEN_BLACK}; }
        #mk-ac-toast.err { background: #EF4444; color: #fff; }

        /* ── Mobile ── */
        @media (max-width: 768px) {
            #mk-ac-nav { padding: 0 16px !important; }
            .mk-ac-logo { font-size: 17px !important; }
            #mk-ac-content { padding: 20px 12px 60px !important; gap: 12px !important; }
            .mk-ac-card { padding: 20px 16px !important; border-radius: 16px !important; }
            #mk-ac-avatar-section { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
            #mk-ac-avatar-name { font-size: 18px !important; }
            .mk-ac-stats-grid { grid-template-columns: repeat(3,1fr) !important; gap: 8px !important; }
            .mk-ac-stat-num { font-size: 24px !important; }
            .mk-ac-input-row { flex-direction: column !important; }
            .mk-pw-show { width: 100% !important; height: 44px !important; }
        }
    `
    document.head.appendChild(s)
}

// ─── Password strength ───────────────────────────────────────

function pwStrength(pw: string): { score: number; label: string; color: string } {
    if (!pw) return { score: 0, label: "", color: "" }
    let score = 0
    if (pw.length >= 8)  score++
    if (pw.length >= 12) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    if (score <= 1) return { score: 20,  label: "Weak",   color: "#EF4444" }
    if (score <= 2) return { score: 40,  label: "Fair",   color: "#F97316" }
    if (score <= 3) return { score: 65,  label: "Good",   color: "#EAB308" }
    if (score <= 4) return { score: 85,  label: "Strong", color: "#22C55E" }
    return { score: 100, label: "Very Strong", color: "#FBFF12" }
}

// ─── Main init ───────────────────────────────────────────────

async function initAccountPage() {
    injectStyles()
    const user = getUser()
    if (!user.username) { window.location.href = "/"; return }

    // ── Inject page shell ──
    const page = document.createElement("div")
    page.id = "mk-account-page"
    page.innerHTML = `
        <nav id="mk-ac-nav">
            <span class="mk-ac-logo">Marken OS</span>
            <button class="mk-ac-back" onclick="window._mkAc.back()">← Back</button>
        </nav>
        <div id="mk-ac-content">

            <!-- Profile card -->
            <div class="mk-ac-card">
                <p class="mk-ac-card-label">Profile</p>
                <div id="mk-ac-avatar-section">
                    <div id="mk-ac-avatar" onclick="document.getElementById('mk-ac-avatar-input').click()">
                        <span id="mk-ac-avatar-initials">${esc((user.full_name ?? user.username ?? "?").substring(0,2).toUpperCase())}</span>
                        <img id="mk-ac-avatar-img" style="display:none;" />
                    </div>
                    <input id="mk-ac-avatar-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif"
                        onchange="window._mkAc.avatarChosen(this)" />
                    <div id="mk-ac-avatar-info">
                        <p id="mk-ac-avatar-name">${esc(user.full_name ?? user.username)}</p>
                        <div class="mk-ac-badge-row">
                            <span class="mk-ac-badge">${esc(DOMAIN_LABELS[user.domain] ?? user.domain ?? "—")}</span>
                            <span class="mk-ac-badge role">${esc(ROLE_LABELS[user.role] ?? user.role ?? "—")}</span>
                        </div>
                        <p class="mk-ac-avatar-hint">Click your avatar to upload a new photo</p>
                    </div>
                </div>
            </div>

            <!-- Edit name card -->
            <div class="mk-ac-card">
                <p class="mk-ac-card-label">Personal Info</p>
                <div class="mk-ac-field">
                    <label class="mk-ac-label">Username</label>
                    <input class="mk-ac-input" value="${esc(user.username)}" readonly />
                </div>
                <div class="mk-ac-field">
                    <label class="mk-ac-label">Full Name</label>
                    <input id="mk-ac-fullname" class="mk-ac-input"
                        placeholder="Your full name" value="${esc(user.full_name ?? "")}" />
                </div>
                <button class="mk-ac-save" id="mk-ac-save-name"
                    onclick="window._mkAc.saveName()">Save Name</button>
            </div>

            <!-- Change password card -->
            <div class="mk-ac-card">
                <p class="mk-ac-card-label">Change Password</p>
                <div class="mk-ac-field">
                    <label class="mk-ac-label">Current Password</label>
                    <div class="mk-ac-input-row">
                        <input id="mk-ac-pw-current" class="mk-ac-input" type="password" placeholder="Enter current password" />
                        <button class="mk-pw-show" onclick="window._mkAc.togglePw('mk-ac-pw-current', this)">Show</button>
                    </div>
                </div>
                <div class="mk-ac-field">
                    <label class="mk-ac-label">New Password</label>
                    <div class="mk-ac-input-row">
                        <input id="mk-ac-pw-new" class="mk-ac-input" type="password"
                            placeholder="Min. 8 characters"
                            oninput="window._mkAc.checkPwStrength(this.value)" />
                        <button class="mk-pw-show" onclick="window._mkAc.togglePw('mk-ac-pw-new', this)">Show</button>
                    </div>
                    <div id="mk-pw-strength-bar"><div id="mk-pw-strength-fill"></div></div>
                    <p id="mk-pw-strength-label"></p>
                </div>
                <div class="mk-ac-field">
                    <label class="mk-ac-label">Confirm New Password</label>
                    <div class="mk-ac-input-row">
                        <input id="mk-ac-pw-confirm" class="mk-ac-input" type="password" placeholder="Repeat new password" />
                        <button class="mk-pw-show" onclick="window._mkAc.togglePw('mk-ac-pw-confirm', this)">Show</button>
                    </div>
                </div>
                <button class="mk-ac-save" id="mk-ac-save-pw"
                    onclick="window._mkAc.savePassword()">Update Password</button>
            </div>

            <!-- Stats card -->
            <div class="mk-ac-card">
                <p class="mk-ac-card-label">Your Activity</p>
                <div class="mk-ac-stats-grid" id="mk-ac-stats">
                    <div class="mk-ac-stat">
                        <div class="mk-ac-skel" style="height:32px;width:60%;margin:0 auto 8px;"></div>
                        <div class="mk-ac-skel" style="height:10px;width:80%;margin:0 auto;"></div>
                    </div>
                    <div class="mk-ac-stat">
                        <div class="mk-ac-skel" style="height:32px;width:60%;margin:0 auto 8px;"></div>
                        <div class="mk-ac-skel" style="height:10px;width:80%;margin:0 auto;"></div>
                    </div>
                    <div class="mk-ac-stat">
                        <div class="mk-ac-skel" style="height:32px;width:60%;margin:0 auto 8px;"></div>
                        <div class="mk-ac-skel" style="height:10px;width:80%;margin:0 auto;"></div>
                    </div>
                </div>
            </div>

        </div>`
    document.body.appendChild(page)

    // ── Load avatar if exists ──
    const { data: userData } = await supabase
        .from("users").select("avatar_url,full_name").eq("username", user.username).single()
    if (userData?.avatar_url) {
        setAvatarImg(userData.avatar_url)
    }
    if (userData?.full_name) {
        const nameEl = document.getElementById("mk-ac-avatar-name")
        if (nameEl) nameEl.textContent = userData.full_name
    }

    // ── Load stats ──
    const [projRes, subRes, cmtRes] = await Promise.all([
        supabase.from("project_members").select("id", { count: "exact", head: true }).eq("username", user.username),
        supabase.from("submissions").select("id", { count: "exact", head: true }).eq("submitted_by", user.username),
        supabase.from("comments").select("id", { count: "exact", head: true }).eq("from_user", user.username),
    ])
    const statsEl = document.getElementById("mk-ac-stats")
    if (statsEl) {
        statsEl.innerHTML = [
            { num: projRes.count ?? 0, lbl: "Projects" },
            { num: subRes.count  ?? 0, lbl: "Submissions" },
            { num: cmtRes.count  ?? 0, lbl: "Comments" },
        ].map(s => `
            <div class="mk-ac-stat">
                <div class="mk-ac-stat-num">${s.num}</div>
                <div class="mk-ac-stat-lbl">${s.lbl}</div>
            </div>`).join("")
    }

    // ── Helpers ──
    function setAvatarImg(url: string) {
        const img = document.getElementById("mk-ac-avatar-img") as HTMLImageElement | null
        const initials = document.getElementById("mk-ac-avatar-initials")
        if (img) { img.src = url; img.style.display = "block" }
        if (initials) initials.style.display = "none"
    }

    // ── Expose handlers ──
    ;(window as any)._mkAc = {

        back() { window.location.href = getDashboardUrl(user) },

        togglePw(id: string, btn: HTMLButtonElement) {
            const input = document.getElementById(id) as HTMLInputElement | null
            if (!input) return
            const hidden = input.type === "password"
            input.type = hidden ? "text" : "password"
            btn.textContent = hidden ? "Hide" : "Show"
        },

        checkPwStrength(val: string) {
            const { score, label, color } = pwStrength(val)
            const fill  = document.getElementById("mk-pw-strength-fill")
            const lbl   = document.getElementById("mk-pw-strength-label")
            if (fill) { fill.style.width = `${score}%`; fill.style.background = color }
            if (lbl)  { lbl.textContent = label; lbl.style.color = color }
        },

        async avatarChosen(input: HTMLInputElement) {
            const file = input.files?.[0]
            if (!file) return
            toast("Uploading…", "ok")
            const ext  = file.name.split(".").pop() ?? "jpg"
            const path = `${user.username}/avatar.${ext}`
            const { error: upErr } = await supabase.storage
                .from("avatars").upload(path, file, { upsert: true, contentType: file.type })
            if (upErr) { toast(`Upload failed: ${upErr.message}`, "err"); return }
            const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
            const publicUrl = urlData?.publicUrl
            if (!publicUrl) { toast("Could not get avatar URL", "err"); return }
            const { error: dbErr } = await supabase.from("users")
                .update({ avatar_url: publicUrl }).eq("username", user.username)
            if (dbErr) { toast(`Failed to save avatar: ${dbErr.message}`, "err"); return }
            // Update sessionStorage
            const updated = { ...user, avatar_url: publicUrl }
            sessionStorage.setItem("marken_user", JSON.stringify(updated))
            setAvatarImg(publicUrl)
            toast("Profile picture updated!", "ok")
        },

        async saveName() {
            const val = (document.getElementById("mk-ac-fullname") as HTMLInputElement)?.value.trim()
            if (!val) { toast("Name cannot be empty", "err"); return }
            const btn = document.getElementById("mk-ac-save-name") as HTMLButtonElement
            if (btn) { btn.disabled = true; btn.textContent = "Saving…" }
            const { error } = await supabase.from("users")
                .update({ full_name: val }).eq("username", user.username)
            if (btn) { btn.disabled = false; btn.textContent = "Save Name" }
            if (error) { toast(`Failed: ${error.message}`, "err"); return }
            // Update sessionStorage + UI
            const updated = { ...user, full_name: val }
            sessionStorage.setItem("marken_user", JSON.stringify(updated))
            const nameEl = document.getElementById("mk-ac-avatar-name")
            if (nameEl) nameEl.textContent = val
            toast("Name updated!", "ok")
        },

        async savePassword() {
            const current = (document.getElementById("mk-ac-pw-current") as HTMLInputElement)?.value
            const newPw   = (document.getElementById("mk-ac-pw-new")     as HTMLInputElement)?.value
            const confirm = (document.getElementById("mk-ac-pw-confirm") as HTMLInputElement)?.value

            if (!current) { toast("Enter your current password", "err"); return }
            if (!newPw)   { toast("Enter a new password", "err"); return }
            if (newPw.length < 8) { toast("New password must be at least 8 characters", "err"); return }
            if (newPw !== confirm) { toast("Passwords don't match", "err"); return }

            const btn = document.getElementById("mk-ac-save-pw") as HTMLButtonElement
            if (btn) { btn.disabled = true; btn.textContent = "Updating…" }

            // Verify current password against DB
            const { data: check, error: checkErr } = await supabase
                .from("users").select("password").eq("username", user.username).single()
            if (checkErr || !check) {
                if (btn) { btn.disabled = false; btn.textContent = "Update Password" }
                toast("Could not verify current password", "err"); return
            }
            if (check.password !== current) {
                if (btn) { btn.disabled = false; btn.textContent = "Update Password" }
                toast("Current password is incorrect", "err"); return
            }

            const { error } = await supabase.from("users")
                .update({ password: newPw }).eq("username", user.username)
            if (btn) { btn.disabled = false; btn.textContent = "Update Password" }
            if (error) { toast(`Failed: ${error.message}`, "err"); return }

            // Clear fields
            ;["mk-ac-pw-current","mk-ac-pw-new","mk-ac-pw-confirm"].forEach(id => {
                const el = document.getElementById(id) as HTMLInputElement | null
                if (el) el.value = ""
            })
            ;(window as any)._mkAc.checkPwStrength("")
            toast("Password updated!", "ok")
        },
    }
}

function cleanup() {
    document.getElementById("mk-account-page")?.remove()
    document.getElementById("mk-ac-styles")?.remove()
    delete (window as any)._mkAc
}

export function AccountPage(Component: ComponentType<any>): ComponentType<any> {
    return function Wrapped(props: any) {
        if (isEditor()) return <Component {...props} />
        useEffect(() => {
            initAccountPage()
            return cleanup
        }, [])
        return (
            <Component {...props} style={{ ...props.style, opacity: 0, pointerEvents: "none", position: "fixed" }} />
        )
    }
}
