import React from "react"
import { interpolate, useCurrentFrame } from "remotion"
import { C } from "../theme"
import { Screen, Eyebrow, Title, useRise, useExit } from "../ui"

const LAYERS = [
  {
    n: "01",
    name: "Proxy",
    file: "src/proxy.ts",
    what: "An unauthenticated request for /admin never reaches the page.",
    tone: C.info,
  },
  {
    n: "02",
    name: "Server checks",
    file: "requireProfile() · requireRole()",
    what: "Re-checked inside every page and every server action.",
    tone: C.warn,
  },
  {
    n: "03",
    name: "Row Level Security",
    file: "12 tables · SECURITY DEFINER helpers",
    what: "The actual boundary. The database decides which rows exist.",
    tone: C.ok,
  },
]

export const Layers: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame()
  const exit = useExit(dur, 20)

  // A request travels down the stack once the slabs have landed.
  const travel = interpolate(frame, [120, 250], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <Screen>
      <div style={{ opacity: exit }}>
        <Eyebrow>How it holds</Eyebrow>
        <Title size={72}>Authorization, three layers deep</Title>

        <div
          style={{
            marginTop: 48,
            display: "flex",
            gap: 44,
            alignItems: "stretch",
          }}
        >
          {/* The travelling request, drawn as a rail down the left */}
          <div style={{ width: 8, position: "relative", flexShrink: 0 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: C.line,
                borderRadius: 4,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: `${travel * 100}%`,
                background: `linear-gradient(${C.info}, ${C.warn}, ${C.ok})`,
                borderRadius: 4,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: -9,
                top: `calc(${travel * 100}% - 13px)`,
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: C.accent,
                boxShadow: `0 0 30px ${C.accent}`,
                opacity: travel > 0.01 ? 1 : 0,
              }}
            />
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
            {LAYERS.map((l, i) => {
              const arrive = 24 + i * 26
              // Each slab lights up as the request passes its band.
              const band = (i + 0.75) / LAYERS.length
              const lit = travel >= band ? 1 : 0
              return (
                <div
                  key={l.n}
                  style={{
                    ...useRise(arrive),
                    background: C.card,
                    border: `1px solid ${lit ? l.tone : C.line}`,
                    boxShadow: lit ? `0 0 0 1px ${l.tone}, 0 20px 60px rgba(0,0,0,0.4)` : "none",
                    borderRadius: 20,
                    padding: "26px 32px",
                    display: "flex",
                    alignItems: "center",
                    gap: 30,
                    transition: "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      color: lit ? l.tone : C.label3,
                      fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                      width: 46,
                    }}
                  >
                    {l.n}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                      <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.025em" }}>
                        {l.name}
                      </span>
                      <span
                        style={{
                          fontSize: 19,
                          color: C.label3,
                          fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                        }}
                      >
                        {l.file}
                      </span>
                    </div>
                    <p style={{ fontSize: 23, color: C.label2, margin: "8px 0 0" }}>
                      {l.what}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <p
          style={{
            ...useRise(150),
            fontSize: 25,
            color: C.label3,
            marginTop: 34,
            paddingLeft: 52,
          }}
        >
          An employee and an admin run identical SQL and get different rows back.
        </p>
      </div>
    </Screen>
  )
}
