import React from "react"
import { interpolate, useCurrentFrame } from "remotion"
import { C } from "../theme"
import { Screen, Wordmark, useRise } from "../ui"

export const Closing: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame()
  // Hold to the last frame rather than fading to black — the card is the end.
  const rule = interpolate(frame, [14, 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <Screen>
      <div style={{ textAlign: "center" }}>
        <div style={useRise(0)}>
          <Wordmark size={132} />
        </div>
        <div
          style={{
            height: 3,
            background: C.accent,
            width: `${rule * 36}%`,
            margin: "30px auto 0",
            borderRadius: 2,
          }}
        />
        <div
          style={{
            ...useRise(20),
            marginTop: 36,
            display: "flex",
            gap: 46,
            justifyContent: "center",
            fontSize: 28,
            color: C.label2,
          }}
        >
          <span style={{ color: C.accent, fontWeight: 700 }}>marken-os.vercel.app</span>
          <span style={{ color: C.label3 }}>github.com/HechCreates/marken-os</span>
        </div>
      </div>
    </Screen>
  )
}
