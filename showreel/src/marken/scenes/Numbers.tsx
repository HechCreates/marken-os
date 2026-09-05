import React from "react"
import { interpolate, useCurrentFrame } from "remotion"
import { C } from "../theme"
import { Screen, Eyebrow, Title, useRise, useExit } from "../ui"

/** Every figure here was measured, not estimated. */
const STATS = [
  { value: 12, suffix: "", label: "tables under RLS", note: "was zero" },
  { value: 21, suffix: "/21", label: "contrast pairs pass AA", note: "checked by script" },
  { value: 11, suffix: "", label: "migrations", note: "schema to policies" },
  { value: 0, suffix: "", label: "passwords in the codebase", note: "Supabase verifies" },
]

export const Numbers: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame()
  const exit = useExit(dur, 20)

  return (
    <Screen>
      <div style={{ opacity: exit }}>
        <Eyebrow>Verified, not asserted</Eyebrow>
        <Title size={72}>What the rebuild actually changed</Title>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 24,
            marginTop: 58,
          }}
        >
          {STATS.map((s, i) => {
            const d = 20 + i * 12
            // Count up to the figure rather than cutting to it.
            const n = Math.round(
              interpolate(frame, [d, d + 34], [0, s.value], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            )
            return (
              <div
                key={s.label}
                style={{
                  ...useRise(d),
                  background: C.card,
                  border: `1px solid ${C.line}`,
                  borderRadius: 22,
                  padding: "34px 30px",
                }}
              >
                <div
                  style={{
                    fontSize: 92,
                    fontWeight: 800,
                    letterSpacing: "-0.05em",
                    color: C.accent,
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {n}
                  <span style={{ fontSize: 44, color: C.label3 }}>{s.suffix}</span>
                </div>
                <div style={{ fontSize: 24, marginTop: 16, lineHeight: 1.35 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 19, color: C.label3, marginTop: 8 }}>
                  {s.note}
                </div>
              </div>
            )
          })}
        </div>

        <p
          style={{
            ...useRise(96),
            fontSize: 26,
            color: C.label2,
            marginTop: 46,
            maxWidth: 1280,
          }}
        >
          Storage went private with signed URLs. State transitions became database
          functions, so a tampered client gets an exception rather than a transition.
        </p>
      </div>
    </Screen>
  )
}
