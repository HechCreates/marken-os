import React from "react"
import { C } from "../theme"
import { Screen, Eyebrow, Title, useRise, useExit } from "../ui"
import { TOOLS } from "../icons"

export const Stack: React.FC<{ dur: number }> = ({ dur }) => {
  const exit = useExit(dur, 20)

  return (
    <Screen>
      <div style={{ opacity: exit }}>
        <Eyebrow>Built with</Eyebrow>
        <Title size={72}>The stack</Title>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 22,
            marginTop: 54,
          }}
        >
          {TOOLS.map((t, i) => {
            const { Icon } = t
            return (
              <div
                key={t.name}
                style={{
                  ...useRise(20 + i * 9),
                  background: C.card,
                  border: `1px solid ${C.line}`,
                  borderRadius: 20,
                  padding: "28px 26px",
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                }}
              >
                <div
                  style={{
                    width: 74,
                    height: 74,
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.05)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={42} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 27,
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.name}
                  </div>
                  <div style={{ fontSize: 20, color: C.label3, marginTop: 4 }}>
                    {t.role}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <p
          style={{
            ...useRise(118),
            fontSize: 26,
            color: C.label2,
            marginTop: 44,
          }}
        >
          Eleven migrations. Nine RPCs. Zero authorization logic in the browser.
        </p>
      </div>
    </Screen>
  )
}
