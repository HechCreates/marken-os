import React from "react"
import { interpolate, useCurrentFrame } from "remotion"
import { C } from "../theme"
import { Screen, Wordmark, useRise, useExit } from "../ui"

export const Title: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame()
  const exit = useExit(dur, 20)

  // The rule under the wordmark draws itself, left to right.
  const rule = interpolate(frame, [16, 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <Screen>
      <div style={{ opacity: exit, textAlign: "center" }}>
        <div style={useRise(0)}>
          <Wordmark size={150} />
        </div>
        <div
          style={{
            height: 3,
            background: C.accent,
            width: `${rule * 46}%`,
            margin: "34px auto 0",
            borderRadius: 2,
          }}
        />
        <p
          style={{
            ...useRise(22),
            fontSize: 34,
            color: C.label2,
            marginTop: 34,
            letterSpacing: "-0.01em",
          }}
        >
          An agency operations tool, rebuilt from the database up
        </p>
      </div>
    </Screen>
  )
}
