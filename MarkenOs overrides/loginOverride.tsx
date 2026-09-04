// loginOverride.tsx
//
// ATTACH OVERRIDES:
// UsernameInput → OUTER usernameInput component (not inner Input layer)
// PasswordInput → OUTER passwordInput component (not inner Input layer)
// LoginButton   → loginInput outer component

import type { ComponentType } from "react"
import { useEffect, useState } from "react"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
    "https://kufsbpaleeawqmtlnnno.supabase.co",
    "sb_publishable_S3HP2seIYkKSuBoXrRyp3g_2_cWKoLd"
)

const MARKEN_BLACK  = "#3C3D2A"
const MARKEN_YELLOW = "#FBFF12"
const WHITE         = "#FFFFFF"

const REDIRECTS: Record<string, string> = {
    admin:       "/admin-dashboard",
    marketing:   "/marketing-dashboard",
    design:      "/design-dashboard",
    socialmedia: "/socialmedia-dashboard",
    webdev:      "/webdev-dashboard",
}

function extractValue(input: any): string {
    if (typeof input === "string") return input
    if (input?.target?.value !== undefined) return input.target.value
    if (input?.currentTarget?.value !== undefined) return input.currentTarget.value
    return String(input ?? "")
}

// ============================================================
// SHARED PILL STYLES
// ============================================================
const pillStyle: React.CSSProperties = {
    width:         "100%",
    height:        "100%",
    position:      "relative",
    display:       "flex",
    alignItems:    "center",
    borderRadius:  "999px",
    background:    "rgba(251, 255, 18, 0.35)",
    border:        `1.5px solid ${MARKEN_BLACK}`,
    boxSizing:     "border-box",
    overflow:      "hidden",
}

const inputStyle: React.CSSProperties = {
    position:    "absolute",
    inset:       0,
    width:       "100%",
    height:      "100%",
    background:  "transparent",
    border:      "none",
    outline:     "none",
    paddingLeft: "46px",
    paddingRight: "16px",
    fontSize:    "15px",
    fontFamily:  "Manrope, sans-serif",
    fontWeight:  "400",
    color:       MARKEN_BLACK,
    letterSpacing: "0",
    boxSizing:   "border-box",
    WebkitAppearance: "none",
    MozAppearance:    "none",
}

const iconWrapStyle: React.CSSProperties = {
    position:      "absolute",
    left:          "16px",
    top:           "50%",
    transform:     "translateY(-50%)",
    display:       "flex",
    alignItems:    "center",
    opacity:       0.5,
    pointerEvents: "none",
}

// ============================================================
// STYLES
// ============================================================
function injectStyles() {
    if (document.getElementById("marken-login-styles")) return
    const tag = document.createElement("style")
    tag.id = "marken-login-styles"
    tag.innerHTML = `
        @keyframes markenSpin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
        }
        @keyframes markenFadeIn {
            from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes markenPopup {
            from { opacity: 0; transform: translate(-50%, -46%); }
            to   { opacity: 1; transform: translate(-50%, -50%); }
        }
        #marken-overlay {
            position: fixed; inset: 0;
            background: rgba(60, 61, 42, 0.4);
            backdrop-filter: blur(3px);
            -webkit-backdrop-filter: blur(3px);
            z-index: 99998;
            animation: markenFadeIn 0.2s ease;
        }
        #marken-spinner-wrap {
            position: fixed; inset: 0;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
        }
        #marken-spinner-ring {
            width: 52px; height: 52px;
            border-radius: 50%;
            border: 4px solid rgba(60, 61, 42, 0.18);
            border-top-color: ${MARKEN_BLACK};
            border-right-color: ${MARKEN_BLACK};
            border-bottom-color: transparent;
            border-left-color: transparent;
            animation: markenSpin 0.75s linear infinite;
            transform-origin: center center;
        }
        #marken-error-popup {
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            z-index: 99999;
            background: ${MARKEN_BLACK};
            border-radius: 20px;
            padding: 44px 52px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 28px;
            min-width: 360px;
            box-shadow: 0 24px 80px rgba(0,0,0,0.3);
            animation: markenPopup 0.3s cubic-bezier(0.34, 1.4, 0.64, 1);
        }
        #marken-error-popup p {
            font-family: 'Manrope', sans-serif;
            font-weight: 700;
            font-size: 18px;
            letter-spacing: -0.05em;
            color: ${WHITE};
            text-align: center;
            margin: 0;
            line-height: 1.5;
        }
        #marken-error-popup .mk-try-btn {
            font-family: 'Manrope', sans-serif;
            font-weight: 700;
            font-size: 15px;
            color: ${MARKEN_BLACK};
            background: ${MARKEN_YELLOW};
            border: none;
            border-radius: 999px;
            padding: 12px 32px;
            cursor: pointer;
            transition: opacity 0.15s ease;
        }
        #marken-error-popup .mk-try-btn:hover { opacity: 0.8; }
    `
    document.head.appendChild(tag)
}

// ============================================================
// SPINNER / POPUP / CLEAR
// ============================================================
function showSpinner() {
    clearUI()
    const overlay = document.createElement("div")
    overlay.id = "marken-overlay"
    const wrap = document.createElement("div")
    wrap.id = "marken-spinner-wrap"
    const ring = document.createElement("div")
    ring.id = "marken-spinner-ring"
    wrap.appendChild(ring)
    document.body.appendChild(overlay)
    document.body.appendChild(wrap)
}

function showErrorPopup() {
    clearUI()
    const overlay = document.createElement("div")
    overlay.id = "marken-overlay"
    overlay.addEventListener("click", clearUI)
    const popup = document.createElement("div")
    popup.id = "marken-error-popup"
    const text = document.createElement("p")
    text.innerText = "Enter valid username\nor password"
    const btn = document.createElement("button")
    btn.className = "mk-try-btn"
    btn.innerText = "Try Again"
    btn.addEventListener("click", clearUI)
    popup.appendChild(text)
    popup.appendChild(btn)
    document.body.appendChild(overlay)
    document.body.appendChild(popup)
}

function clearUI() {
    ["marken-overlay", "marken-spinner-wrap", "marken-error-popup"]
        .forEach(id => document.getElementById(id)?.remove())
}

// ============================================================
// LOGIN
// ============================================================
async function runLogin() {
    clearUI()
    injectStyles()

    const username = extractValue((window as any).marken_username).trim().toLowerCase()
    const password = extractValue((window as any).marken_password).trim()

    if (!username || !password) {
        showErrorPopup()
        return
    }

    showSpinner()

    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single()

    if (error || !data || data.password !== password) {
        showErrorPopup()
        return
    }

    sessionStorage.setItem("marken_user", JSON.stringify({
        username:  data.username,
        full_name: data.full_name,
        domain:    data.domain,
        role:      data.role,
    }))

    // ── Clock in — write attendance record ──
    // Fire and forget — don't block redirect on this
    try {
        const today = new Date().toISOString().split("T")[0]
        // Check if already clocked in today (e.g. page refresh)
        const { data: existing } = await supabase
            .from("attendance")
            .select("id")
            .eq("username", data.username)
            .eq("date", today)
            .is("clock_out", null)
            .limit(1)
        if (!existing || existing.length === 0) {
            await supabase.from("attendance").insert({
                username:  data.username,
                clock_in:  new Date().toISOString(),
                date:      today,
            })
        }
    } catch (e) { console.warn("[MarkenOS] clock-in failed:", e) }

    // Use role for admin, domain for everyone else
    window.location.href = data.role === "admin" ? "/admin-dashboard" : (REDIRECTS[data.domain] ?? "/")
}

// ============================================================
// OVERRIDE 1: UsernameInput
// ⚠️  Attach to the OUTER usernameInput component now
// Pure HTML pill — person icon left, text input centre
// ============================================================
export function UsernameInput(Component: ComponentType<any>): ComponentType<any> {
    return function WrappedUsername(props) {
        useEffect(() => { injectStyles() }, [])

        return (
            <div style={{
                ...pillStyle,
                width:  props.style?.width  ?? "100%",
                height: props.style?.height ?? "100%",
            }}>
                {/* Person icon — left */}
                <div style={iconWrapStyle}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke={MARKEN_BLACK} strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                </div>

                {/* Text input */}
                <input
                    type="text"
                    placeholder="Username"
                    autoComplete="username"
                    onChange={(e) => {
                        ;(window as any).marken_username = e.target.value
                    }}
                    style={inputStyle}
                />
            </div>
        )
    }
}

// ============================================================
// OVERRIDE 2: PasswordInput
// ⚠️  Attach to the OUTER passwordInput component
// Pure HTML pill — lock icon left, input centre, eye right
// ============================================================
export function PasswordInput(Component: ComponentType<any>): ComponentType<any> {
    return function WrappedPassword(props) {
        const [show, setShow] = useState(false)
        useEffect(() => { injectStyles() }, [])

        return (
            <div style={{
                ...pillStyle,
                width:  props.style?.width  ?? "100%",
                height: props.style?.height ?? "100%",
            }}>
                {/* Lock icon — left */}
                <div style={iconWrapStyle}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke={MARKEN_BLACK} strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                </div>

                {/* Password input — right padding makes room for eye */}
                <input
                    type={show ? "text" : "password"}
                    placeholder="Password"
                    autoComplete="new-password"
                    onChange={(e) => {
                        ;(window as any).marken_password = e.target.value
                    }}
                    style={{ ...inputStyle, paddingRight: "46px" }}
                />

                {/* Eye toggle — right */}
                <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setShow(s => !s) }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = "1" }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = "0.45" }}
                    style={{
                        position:        "absolute",
                        right:           "14px",
                        top:             "50%",
                        transform:       "translateY(-50%)",
                        background:      "none",
                        border:          "none",
                        cursor:          "pointer",
                        padding:         "4px",
                        display:         "flex",
                        alignItems:      "center",
                        justifyContent:  "center",
                        opacity:         0.45,
                        transition:      "opacity 0.15s ease",
                        zIndex:          3,
                        lineHeight:      0,
                    }}
                >
                    {show ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke={MARKEN_BLACK} strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke={MARKEN_BLACK} strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                    )}
                </button>
            </div>
        )
    }
}

// ============================================================
// OVERRIDE 3: LoginButton
// ============================================================
export function LoginButton(Component: ComponentType<any>): ComponentType<any> {
    return function WrappedLoginButton(props) {
        useEffect(() => {
            const handleKey = (e: KeyboardEvent) => {
                if (e.key === "Enter") runLogin()
            }
            window.addEventListener("keydown", handleKey)
            return () => window.removeEventListener("keydown", handleKey)
        }, [])

        return (
            <Component
                {...props}
                onClick={runLogin}
                onTap={runLogin}
            />
        )
    }
}
