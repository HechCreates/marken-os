import React from "react"
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { C, FONT } from "./theme"

/** Springy entrance. `delay` is in frames from the sequence's own start. */
export const useRise = (delay = 0, damping = 200) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({
    frame: frame - delay,
    fps,
    config: { damping, mass: 0.6, stiffness: 90 },
  })
  return {
    opacity: s,
    transform: `translateY(${interpolate(s, [0, 1], [26, 0])}px)`,
  }
}

/** Fades a block out over the last `len` frames of its sequence. */
export const useExit = (durationInFrames: number, len = 18) => {
  const frame = useCurrentFrame()
  return interpolate(
    frame,
    [durationInFrames - len, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  )
}

export const Screen: React.FC<{
  children: React.ReactNode
  pad?: number
}> = ({ children, pad = 128 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: C.page,
      fontFamily: FONT,
      color: C.label,
      padding: pad,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    }}
  >
    {/* The same two yellow washes the app paints behind its glass layer. */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background:
          "radial-gradient(1200px 700px at 10% -10%, rgba(251,255,18,0.07), transparent 60%), radial-gradient(950px 600px at 92% 6%, rgba(251,255,18,0.04), transparent 55%)",
      }}
    />
    <div style={{ position: "relative" }}>{children}</div>
  </div>
)

export const Eyebrow: React.FC<{ children: React.ReactNode; delay?: number }> = ({
  children,
  delay = 0,
}) => (
  <div
    style={{
      ...useRise(delay),
      fontSize: 22,
      fontWeight: 700,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: C.accent,
    }}
  >
    {children}
  </div>
)

export const Title: React.FC<{
  children: React.ReactNode
  delay?: number
  size?: number
}> = ({ children, delay = 0, size = 86 }) => (
  <h1
    style={{
      ...useRise(delay),
      fontSize: size,
      lineHeight: 1.05,
      fontWeight: 800,
      letterSpacing: "-0.035em",
      margin: "18px 0 0",
      maxWidth: 1400,
    }}
  >
    {children}
  </h1>
)

export const Sub: React.FC<{ children: React.ReactNode; delay?: number }> = ({
  children,
  delay = 0,
}) => (
  <p
    style={{
      ...useRise(delay),
      fontSize: 30,
      lineHeight: 1.5,
      color: C.label2,
      margin: "22px 0 0",
      maxWidth: 1150,
    }}
  >
    {children}
  </p>
)

/** The product wordmark, with the yellow OS. */
export const Wordmark: React.FC<{ size?: number }> = ({ size = 120 }) => (
  <span
    style={{
      fontSize: size,
      fontWeight: 800,
      letterSpacing: "-0.045em",
      color: C.label,
    }}
  >
    Marken<span style={{ color: C.accent }}>OS</span>
  </span>
)

export const Card: React.FC<{
  children: React.ReactNode
  style?: React.CSSProperties
}> = ({ children, style }) => (
  <div
    style={{
      background: C.card,
      border: `1px solid ${C.line}`,
      borderRadius: 22,
      padding: 30,
      ...style,
    }}
  >
    {children}
  </div>
)

/**
 * A screenshot in window chrome, so it reads as a product shot.
 *
 * Sized by ASPECT, not height. The captures are 1600px wide with content
 * ending around 800–850px, so a ~2:1 frame lands the crop right at the end of
 * the content — a taller frame would include the empty page below it.
 * objectPosition top keeps the nav and headline in every shot.
 */
export const Shot: React.FC<{
  src: string
  style?: React.CSSProperties
  aspect?: number
}> = ({ src, style, aspect = 1.97 }) => (
  <div
    style={{
      borderRadius: 18,
      overflow: "hidden",
      border: `1px solid ${C.line}`,
      boxShadow: "0 40px 100px rgba(0,0,0,0.65)",
      background: C.page,
      aspectRatio: `${aspect} / 1`,
      ...style,
    }}
  >
    {/* height:100% as well as width, or cover has nothing to crop against and
        a tall capture letterboxes inside its own frame. Top-anchored so the
        nav and headline always survive the crop. */}
    <img
      src={src}
      alt=""
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "top center",
      }}
    />
  </div>
)
