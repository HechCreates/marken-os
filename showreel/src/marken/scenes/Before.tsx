import React from "react"
import { interpolate, useCurrentFrame } from "remotion"
import { C } from "../theme"
import { Screen, Eyebrow, Title, Card, useRise, useExit } from "../ui"

/** The three things that were actually wrong with the original build. */
const FLAWS = [
  {
    head: "Passwords in plain text",
    body: "The browser fetched the user row and compared the password itself.",
    code: "data.password !== password",
  },
  {
    head: "Row Level Security off",
    body: "Any visitor with the public key could read every username and password.",
    code: "select * from users",
  },
  {
    head: "Both buckets public",
    body: "Every client deliverable was readable by anyone holding the URL.",
    code: "{project}/{user}/v1_file.pdf",
  },
]

export const Before: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame()
  const exit = useExit(dur, 20)

  return (
    <Screen>
      <div style={{ opacity: exit }}>
        <Eyebrow>What it replaced</Eyebrow>
        <Title size={72}>
          A Framer site driven by 5,200 lines of overrides
        </Title>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 26,
            marginTop: 56,
          }}
        >
          {FLAWS.map((f, i) => {
            const d = 26 + i * 14
            // A red strike sweeps across each card as it lands.
            const strike = interpolate(frame, [d + 26, d + 52], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
            return (
              <Card
                key={f.head}
                style={{
                  ...useRise(d),
                  position: "relative",
                  overflow: "hidden",
                  borderColor: "rgba(255,128,120,0.28)",
                }}
              >
                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    color: C.danger,
                  }}
                >
                  {f.head}
                </div>
                <p
                  style={{
                    fontSize: 23,
                    lineHeight: 1.5,
                    color: C.label2,
                    margin: "14px 0 20px",
                    minHeight: 104,
                  }}
                >
                  {f.body}
                </p>
                <code
                  style={{
                    display: "block",
                    fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                    fontSize: 19,
                    color: C.label3,
                    background: "rgba(0,0,0,0.35)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    position: "relative",
                  }}
                >
                  {f.code}
                  <span
                    style={{
                      position: "absolute",
                      left: 14,
                      right: 14,
                      top: "50%",
                      height: 2,
                      background: C.danger,
                      transformOrigin: "left center",
                      transform: `scaleX(${strike})`,
                    }}
                  />
                </code>
              </Card>
            )
          })}
        </div>
      </div>
    </Screen>
  )
}
