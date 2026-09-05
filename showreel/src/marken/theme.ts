import { MANROPE } from "./fonts"

/**
 * Lifted straight from the app's own token layer so the film and the product
 * are the same object. Values match src/app/globals.css.
 */
export const C = {
  page: "#1A1B12",
  surface: "#22231A",
  card: "#2E3021",
  accent: "#FBFF12",
  accentDim: "#D4D80F",
  onAccent: "#1A1B12",
  label: "#F4F5EA",
  label2: "#B3B5A1",
  label3: "#A3A493",
  line: "rgba(255,255,255,0.10)",
  fill: "rgba(255,255,255,0.05)",
  danger: "#FF8078",
  warn: "#FFAB5E",
  ok: "#5FD882",
  info: "#7AB6FF",
} as const

// MANROPE comes from fonts.ts, which actually loads the face. Naming it here
// without loading it would silently render a system fallback.
export const FONT = `${MANROPE}, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`

export const FPS = 30
export const W = 1920
export const H = 1080

/**
 * Scene lengths in frames, at 30fps.
 *
 * Paced for reading, not for pace. Content lands inside the first two seconds
 * of a scene and then HOLDS — the rest of each block is dwell time. Text-heavy
 * scenes (roles, project page) get the longest holds; a screenshot with two
 * lines of copy needs less.
 */
export const SCENE_LIST = [
  { id: "title", dur: 180 }, //  6.0s
  { id: "whatItIs", dur: 255 }, //  8.5s
  { id: "domains", dur: 270 }, //  9.0s
  { id: "roles", dur: 360 }, // 12.0s — three columns of copy
  { id: "admin", dur: 330 }, // 11.0s
  { id: "head", dur: 330 }, // 11.0s
  { id: "employee", dur: 330 }, // 11.0s
  { id: "pipeline", dur: 390 }, // 13.0s — animated, five states
  { id: "project", dur: 420 }, // 14.0s — the densest screen
  { id: "submit", dur: 315 }, // 10.5s
  { id: "review", dur: 345 }, // 11.5s
  { id: "newProject", dur: 315 }, // 10.5s
  { id: "notifications", dur: 285 }, //  9.5s
  { id: "people", dur: 315 }, // 10.5s
  { id: "clients", dur: 270 }, //  9.0s
  { id: "attendance", dur: 270 }, //  9.0s
  { id: "closing", dur: 210 }, //  7.0s
] as const

export type SceneId = (typeof SCENE_LIST)[number]["id"]

/** Absolute start frame for each scene, derived so nothing drifts. */
export const AT: Record<string, { from: number; dur: number }> = (() => {
  let cursor = 0
  const out: Record<string, { from: number; dur: number }> = {}
  for (const s of SCENE_LIST) {
    out[s.id] = { from: cursor, dur: s.dur }
    cursor += s.dur
  }
  return out
})()

export const TOTAL = SCENE_LIST.reduce((sum, s) => sum + s.dur, 0)
