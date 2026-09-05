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
 * of a scene and then HOLDS — the rest of each block is dwell time, and the
 * motion during it (the reading rail, the slow pan down each screenshot) is
 * there to pace the eye, not to fill the frame.
 *
 * Only the things that make the tool what it is are here. Notifications, the
 * upload dialog and attendance were cut: every tool has a bell and an upload
 * button, and neither is the reason this one exists.
 */
export const SCENE_LIST = [
  { id: "title", dur: 180 }, //  6.0s
  { id: "whatItIs", dur: 330 }, // 11.0s — the chips gather, then are replaced
  { id: "domains", dur: 270 }, //  9.0s
  { id: "roles", dur: 360 }, // 12.0s — three columns of copy
  { id: "admin", dur: 330 }, // 11.0s
  { id: "head", dur: 315 }, // 10.5s
  { id: "employee", dur: 315 }, // 10.5s
  { id: "pipeline", dur: 390 }, // 13.0s — animated, five states
  { id: "project", dur: 420 }, // 14.0s — the densest screen
  { id: "review", dur: 330 }, // 11.0s
  { id: "newProject", dur: 300 }, // 10.0s
  { id: "administration", dur: 315 }, // 10.5s — staff and clients, together
  { id: "stack", dur: 375 }, // 12.5s — nine marks to take in
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
