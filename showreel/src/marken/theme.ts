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

/** 1920x1080 at 30fps. */
export const FPS = 30
export const W = 1920
export const H = 1080

/** Scene boundaries, in frames. Sums to 1800 — exactly sixty seconds. */
export const SCENES = {
  title: { from: 0, dur: 110 },
  before: { from: 110, dur: 280 },
  stack: { from: 390, dur: 280 },
  layers: { from: 670, dur: 340 },
  screens: { from: 1010, dur: 480 },
  numbers: { from: 1490, dur: 210 },
  closing: { from: 1700, dur: 100 },
} as const

export const TOTAL = 1800
