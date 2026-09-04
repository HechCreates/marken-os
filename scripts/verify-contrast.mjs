import { readFileSync } from "fs"

// Parses the shipped stylesheet rather than a copy of the values, so this
// cannot drift from what actually renders. Run with: npm run contrast
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8")

const grab = (name) => {
  const m = css.match(new RegExp("--" + name + ":\\s*([^;]+);"))
  if (!m) throw new Error(`token --${name} not found in globals.css`)
  return m[1].trim()
}

const hex = (h) => {
  h = h.replace("#", "")
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}
const rgba = (s) => {
  const m = s.match(/rgba?\(([^)]+)\)/)
  const p = m[1].split(",").map((x) => parseFloat(x))
  return { rgb: p.slice(0, 3), a: p[3] ?? 1 }
}
const lin = (c) => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}
const L = (r) => 0.2126 * lin(r[0]) + 0.7152 * lin(r[1]) + 0.0722 * lin(r[2])
const ratio = (a, b) => {
  const l1 = L(a), l2 = L(b)
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}
const over = (f, a, bg) => f.map((c, i) => c * a + bg[i] * (1 - a))
/** composite an rgba token onto an opaque background */
const layer = (token, bg) => {
  const { rgb, a } = rgba(grab(token))
  return over(rgb, a, bg)
}

const page = hex(grab("page"))
const surface = hex(grab("surface"))
const card = hex(grab("card"))
const accent = hex(grab("accent"))
// the functional layer: translucent glass composited over the page
const glass = layer("glass", page)

const rows = []
const chk = (name, fg, bg, need) => {
  const r = ratio(fg, bg)
  rows.push([name, r.toFixed(2), need, r >= need ? "PASS" : "FAIL"])
}

// ── text on each surface ──
chk("label on page", hex(grab("label")), page, 4.5)
chk("label on card", hex(grab("label")), card, 4.5)
chk("label on glass", hex(grab("label")), glass, 4.5)
chk("label-secondary on card", hex(grab("label-secondary")), card, 4.5)
chk("label-secondary on glass", hex(grab("label-secondary")), glass, 4.5)
chk("label-tertiary on page", hex(grab("label-tertiary")), page, 4.5)
chk("label-tertiary on card", hex(grab("label-tertiary")), card, 4.5)

// ── brand ──
chk("accent on page", accent, page, 4.5)
chk("accent on card", accent, card, 4.5)
chk("accent on glass", accent, glass, 4.5)
chk("on-accent over accent", hex(grab("on-accent")), accent, 4.5)

// ── interactive boundaries (WCAG 1.4.11 non-text contrast) ──
chk("border-control on card", hex(grab("border-control")), card, 3.0)
chk("border-control on page", hex(grab("border-control")), page, 3.0)
chk("border-control on glass", hex(grab("border-control")), glass, 3.0)

// ── status text over its own soft fill, on a card ──
for (const s of ["assigned", "progress", "review", "approved", "changes"]) {
  chk(`status ${s}`, hex(grab("status-" + s)), layer("status-" + s + "-soft", card), 4.5)
}

// surfaces must be distinguishable from one another
chk("card vs page (surface sep)", card, page, 1.1)
chk("surface vs page", surface, page, 1.05)

console.log("TOKEN                          RATIO  NEED  RESULT")
for (const r of rows)
  console.log(r[0].padEnd(30), String(r[1]).padStart(5), String(r[2]).padStart(5), "  " + r[3])

const fails = rows.filter((r) => r[3] === "FAIL")
console.log(
  "\n" +
    (fails.length
      ? `${fails.length} FAILING: ` + fails.map((r) => r[0]).join(", ")
      : `All ${rows.length} pairs pass WCAG AA`)
)
process.exit(fails.length ? 1 : 0)
