import React from "react"
import { staticFile, interpolate, useCurrentFrame } from "remotion"
import { C } from "./theme"
import { Screen, Shot, useRise, useExit } from "./ui"

/**
 * The workhorse scene: one screen of the product, a claim about it, and two or
 * three supporting lines.
 *
 * Everything lands inside the first ~60 frames and then holds still for the
 * remainder of the scene, so a reader has the whole dwell time to take the
 * copy in rather than chasing it. The only continuing motion is a very slow
 * push on the screenshot, which keeps the frame alive without demanding
 * attention.
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
}> = ({ dur, tag, head, lines, shot, aspect = 1.9, flip = false }) => {
  const frame = useCurrentFrame()
  const exit = useExit(dur, 18)

  // A whole-scene push of about 3%. Slow enough to read through.
  const scale = interpolate(frame, [0, dur], [1, 1.03])

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

      <ul style={{ margin: "30px 0 0", padding: 0, listStyle: "none" }}>
        {lines.map((l, i) => (
          <li
            key={l}
            style={{
              ...useRise(22 + i * 10),
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
              marginTop: i === 0 ? 0 : 20,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: C.accent,
                marginTop: 13,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 27, lineHeight: 1.5, color: C.label2 }}>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  )

  const image = (
    <div style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
      <Shot src={staticFile(`shots/${shot}`)} aspect={aspect} />
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
