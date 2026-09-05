import React from "react"
import { staticFile, interpolate, useCurrentFrame } from "remotion"
import { C } from "./theme"
import { Screen, Shot, useRise, useExit } from "./ui"

/** Frame by which the copy has finished arriving and the hold begins. */
const HOLD_START = 66
/** Frames of exit fade reserved at the end of every scene. */
const HOLD_TAIL = 26

/**
 * The workhorse scene: one screen of the product, a claim about it, and two to
 * four supporting lines.
 *
 * Everything lands inside the first ~2 seconds and then holds. The motion
 * during the hold is deliberately doing a job rather than decorating:
 *
 *  - A reading rail. Each line's left border lights in turn across the hold,
 *    at a pace set by how many lines the scene has. Nothing dims, so a faster
 *    reader is never held back — the rail only offers a place to be.
 *  - A pan down the screenshot, tied to the same clock. As the copy moves down
 *    the list, the shot scrolls down the page, so the part of the screen being
 *    described is the part on screen.
 *  - A wipe-in on the shot, top to bottom, so the eye enters at the nav and
 *    travels the way it would on the real page.
 */
export const Feature: React.FC<{
  dur: number
  tag: string
  head: string
  lines: string[]
  shot: string
  /** Crop ratio for the screenshot frame. Taller pages want a smaller number. */
  aspect?: number
  /** Put the image on the left instead of the right. */
  flip?: boolean
  /** Vertical crop window to travel between, as objectPosition percentages. */
  pan?: [number, number]
}> = ({
  dur,
  tag,
  head,
  lines,
  shot,
  aspect = 1.9,
  flip = false,
  pan = [0, 100],
}) => {
  const frame = useCurrentFrame()
  const exit = useExit(dur, 18)

  // One clock drives the rail and the pan, so the copy and the screen region
  // it describes stay in step.
  const prog = interpolate(frame, [HOLD_START, dur - HOLD_TAIL], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Travelling emphasis: 1 on the line being read, falling off to 0 on the
  // neighbours. A continuous value, so the rail slides rather than blinks.
  const heat = (i: number) =>
    lines.length < 2
      ? 1
      : Math.max(0, 1 - Math.abs(prog * (lines.length - 1) - i))

  // Both the rail and the type have to fade CONTINUOUSLY. Stepping either at a
  // threshold lights two lines at once, which is worse than lighting none.
  const railAt = (h: number) => `rgba(251,255,18,${(0.1 + h * 0.9).toFixed(3)})`
  const inkAt = (h: number) => {
    // #B3B5A1 (secondary) → #F4F5EA (primary).
    const ch = (a: number, b: number) => Math.round(a + (b - a) * h)
    return `rgb(${ch(179, 244)},${ch(181, 245)},${ch(161, 234)})`
  }

  const rule = interpolate(frame, [14, 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // A whole-scene push of about 3%. Slow enough to read through.
  const scale = interpolate(frame, [0, dur], [1, 1.03])
  const wipe = interpolate(frame, [8, 42], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const text = (
    <div>
      <div
        style={{
          ...useRise(2),
          display: "inline-block",
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: C.onAccent,
          background: C.accent,
          padding: "8px 16px",
          borderRadius: 999,
        }}
      >
        {tag}
      </div>

      <h2
        style={{
          ...useRise(10),
          fontSize: 60,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.08,
          margin: "24px 0 0",
        }}
      >
        {head}
      </h2>

      {/* Draws out under the headline as it settles. */}
      <div
        style={{
          height: 3,
          width: `${rule * 100}%`,
          maxWidth: 190,
          background: C.accent,
          borderRadius: 2,
          marginTop: 20,
        }}
      />

      <ul style={{ margin: "30px 0 0", padding: 0, listStyle: "none" }}>
        {lines.map((l, i) => {
          const h = heat(i)
          return (
            <li
              key={l}
              style={{
                ...useRise(22 + i * 10),
                marginTop: i === 0 ? 0 : 18,
                paddingLeft: 22 + h * 6,
                borderLeft: `3px solid ${railAt(h)}`,
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: 27,
                  lineHeight: 1.5,
                  // Only the line being read reaches full white; the rest sit
                  // at secondary, which is still comfortably above AA — a
                  // reader ahead of the rail is never held back.
                  color: inkAt(h),
                  paddingTop: 2,
                  paddingBottom: 2,
                }}
              >
                {l}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )

  const image = (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "center",
        maskImage: `linear-gradient(to bottom, #000 ${wipe * 100}%, transparent ${
          wipe * 100 + 9
        }%)`,
        WebkitMaskImage: `linear-gradient(to bottom, #000 ${wipe * 100}%, transparent ${
          wipe * 100 + 9
        }%)`,
      }}
    >
      <Shot
        src={staticFile(`shots/${shot}`)}
        aspect={aspect}
        posY={interpolate(prog, [0, 1], pan)}
      />
    </div>
  )

  return (
    <Screen pad={88}>
      <div
        style={{
          opacity: exit,
          display: "grid",
          gridTemplateColumns: flip ? "1.5fr 0.85fr" : "0.85fr 1.5fr",
          gap: 66,
          alignItems: "center",
        }}
      >
        {flip ? image : text}
        {flip ? text : image}
      </div>
    </Screen>
  )
}
