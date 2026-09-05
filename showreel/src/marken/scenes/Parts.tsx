import React from "react"
import { interpolate, useCurrentFrame } from "remotion"
import { C } from "../theme"
import { Screen, Wordmark, useRise, useExit } from "../ui"
import { DOMAIN_CARDS, ROLES, PIPELINE, STACK } from "../content"

/** Shared eyebrow, so every section title is set the same way. */
const Kicker: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={useRise(0)}>
    <span
      style={{
        fontSize: 20,
        fontWeight: 800,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color: C.accent,
      }}
    >
      {children}
    </span>
  </div>
)

const Head: React.FC<{ children: React.ReactNode; size?: number }> = ({
  children,
  size = 62,
}) => (
  <h2
    style={{
      ...useRise(6),
      fontSize: size,
      fontWeight: 800,
      letterSpacing: "-0.03em",
      lineHeight: 1.12,
      margin: "20px 0 0",
    }}
  >
    {children}
  </h2>
)

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const

/* ── Opening ─────────────────────────────────────────────── */

export const Title: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame()
  const exit = useExit(dur, 20)
  const rule = interpolate(frame, [18, 50], [0, 1], clamp)

  return (
    <Screen>
      <div style={{ opacity: exit, textAlign: "center" }}>
        <div style={useRise(0)}>
          <Wordmark size={148} />
        </div>
        <div
          style={{
            height: 3,
            background: C.accent,
            width: `${rule * 44}%`,
            margin: "34px auto 0",
            borderRadius: 2,
          }}
        />
        <p
          style={{
            ...useRise(26),
            fontSize: 38,
            color: C.label2,
            marginTop: 36,
            letterSpacing: "-0.015em",
          }}
        >
          The internal tool that runs a creative agency
        </p>
      </div>
    </Screen>
  )
}

/**
 * The thesis, and the one place a motion graphic earns its keep: the four
 * scattered places work currently lives drift together and collapse into one.
 * The animation is the argument.
 */
const SCATTERED = [
  // `x`/`y` is where each chip drifts in from; `hx`/`hy` where it settles.
  // They come to rest in a readable 2×2 and sit there for a beat before the
  // one thing that replaces them arrives.
  { label: "A chat thread", x: -300, y: -110, r: -7, hx: -190, hy: -44 },
  { label: "An inbox", x: 330, y: -140, r: 6, hx: 190, hy: -44 },
  { label: "A shared drive", x: -250, y: 130, r: 5, hx: -190, hy: 44 },
  { label: "Somebody's memory", x: 300, y: 150, r: -5, hx: 190, hy: 44 },
] as const

export const WhatItIs: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame()
  const exit = useExit(dur, 20)

  // 1 while scattered, 0 once gathered into the 2×2.
  const gather = interpolate(frame, [60, 108], [1, 0], clamp)
  // The four hold long enough to be read, then the card takes the frame.
  const settle = interpolate(frame, [142, 182], [0, 1], clamp)

  return (
    <Screen>
      <div style={{ opacity: exit }}>
        <h2
          style={{
            ...useRise(0),
            fontSize: 58,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.16,
            margin: 0,
            maxWidth: 1500,
          }}
        >
          Client work usually lives in four places at once.
        </h2>

        <div
          style={{
            position: "relative",
            height: 330,
            marginTop: 40,
          }}
        >
          {SCATTERED.map((s, i) => (
            <div
              key={s.label}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) translate(${
                  s.hx + (s.x - s.hx) * gather
                }px, ${s.hy + (s.y - s.hy) * gather}px) rotate(${
                  s.r * gather
                }deg) scale(${1 - settle * 0.12})`,
                opacity:
                  interpolate(frame, [10 + i * 7, 34 + i * 7], [0, 1], clamp) *
                  (1 - settle * 0.92),
                background: C.card,
                border: `1px solid ${C.line}`,
                borderRadius: 16,
                padding: "20px 30px",
                fontSize: 27,
                color: C.label2,
                whiteSpace: "nowrap",
              }}
            >
              {s.label}
            </div>
          ))}

          {/* What replaces them. */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) scale(${interpolate(
                settle,
                [0, 1],
                [0.94, 1]
              )})`,
              opacity: settle,
              background: C.surface,
              border: `2px solid ${C.accent}`,
              borderRadius: 24,
              padding: "34px 56px",
              textAlign: "center",
              boxShadow: "0 0 90px rgba(251,255,18,0.14)",
            }}
          >
            <Wordmark size={64} />
            <div style={{ fontSize: 27, color: C.label2, marginTop: 12 }}>
              puts all of it on one screen
            </div>
          </div>
        </div>

        <p
          style={{
            opacity: settle,
            fontSize: 28,
            color: C.label3,
            marginTop: 14,
            lineHeight: 1.5,
            maxWidth: 1250,
          }}
        >
          Every project, who it belongs to, what stage it has reached, what was
          delivered, and who signed it off.
        </p>
      </div>
    </Screen>
  )
}

/* ── Domains ─────────────────────────────────────────────── */

export const Domains: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame()
  const exit = useExit(dur, 20)

  return (
    <Screen>
      <div style={{ opacity: exit }}>
        <Kicker>How work is organised</Kicker>
        <Head>Four domains, each with its own team</Head>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 26,
            marginTop: 54,
          }}
        >
          {DOMAIN_CARDS.map((d, i) => {
            // The accent edge grows down the card as it arrives, so the four
            // land in a readable order rather than all at once.
            const edge = interpolate(
              frame,
              [22 + i * 12, 52 + i * 12],
              [0, 1],
              clamp
            )
            return (
              <div
                key={d.name}
                style={{
                  ...useRise(20 + i * 12),
                  position: "relative",
                  background: C.card,
                  border: `1px solid ${C.line}`,
                  borderRadius: 20,
                  padding: "30px 34px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: 4,
                    height: `${edge * 100}%`,
                    background: C.accent,
                  }}
                />
                <div
                  style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.025em" }}
                >
                  {d.name}
                </div>
                <div style={{ fontSize: 24, color: C.label2, marginTop: 10 }}>
                  {d.what}
                </div>
              </div>
            )
          })}
        </div>

        <p style={{ ...useRise(76), fontSize: 26, color: C.label3, marginTop: 40 }}>
          A project belongs to exactly one domain, and every client belongs to
          the agency rather than to a team.
        </p>
      </div>
    </Screen>
  )
}

/* ── Roles ───────────────────────────────────────────────── */

export const Roles: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame()
  const exit = useExit(dur, 20)

  // Same reading clock as Feature: emphasis travels left to right across the
  // hold so the three columns get read in order.
  const prog = interpolate(frame, [80, dur - 30], [0, 1], clamp)
  const heat = (i: number) => Math.max(0, 1 - Math.abs(prog * 2 - i))

  return (
    <Screen>
      <div style={{ opacity: exit }}>
        <Kicker>Who sees what</Kicker>
        <Head>Three roles, three different applications</Head>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 26,
            marginTop: 50,
          }}
        >
          {ROLES.map((r, i) => {
            const h = heat(i)
            return (
              <div
                key={r.name}
                style={{
                  ...useRise(20 + i * 14),
                  background: C.card,
                  border: `1px solid ${C.line}`,
                  borderRadius: 22,
                  padding: "34px 32px",
                  borderTop: `4px solid ${r.tone}`,
                  transform: `translateY(${-h * 8}px)`,
                  boxShadow: h > 0.05 ? `0 0 ${h * 60}px ${r.tone}22` : "none",
                }}
              >
                <div
                  style={{
                    fontSize: 38,
                    fontWeight: 800,
                    letterSpacing: "-0.025em",
                    color: r.tone,
                  }}
                >
                  {r.name}
                </div>
                <div
                  style={{
                    fontSize: 23,
                    color: C.label3,
                    marginTop: 10,
                    minHeight: 62,
                    lineHeight: 1.4,
                  }}
                >
                  {r.sees}
                </div>
                <ul style={{ margin: "22px 0 0", padding: 0, listStyle: "none" }}>
                  {r.can.map((c) => (
                    <li
                      key={c}
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                        marginTop: 14,
                        fontSize: 23,
                        lineHeight: 1.45,
                        color: C.label2,
                      }}
                    >
                      <span style={{ color: r.tone, fontWeight: 800 }}>·</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </Screen>
  )
}

/* ── Pipeline ────────────────────────────────────────────── */

export const Pipeline: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame()
  const exit = useExit(dur, 20)

  // Each stage lights in turn, then the rework loop draws last.
  const step = (i: number) =>
    interpolate(frame, [40 + i * 34, 70 + i * 34], [0, 1], clamp)
  const loop = interpolate(frame, [40 + 4 * 34, 90 + 4 * 34], [0, 1], clamp)

  return (
    <Screen>
      <div style={{ opacity: exit }}>
        <Kicker>How work moves</Kicker>
        <Head>Every project follows one path</Head>

        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: 18,
            marginTop: 62,
          }}
        >
          {PIPELINE.map((s, i) => (
            <React.Fragment key={s.name}>
              <div
                style={{
                  flex: 1,
                  background: C.card,
                  border: `2px solid ${step(i) > 0.5 ? s.tone : C.line}`,
                  borderRadius: 20,
                  padding: "28px 22px",
                  textAlign: "center",
                  opacity: 0.35 + step(i) * 0.65,
                  boxShadow: step(i) > 0.5 ? `0 0 40px ${s.tone}22` : "none",
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: s.tone,
                    margin: "0 auto 16px",
                    transform: `scale(${interpolate(
                      step(i),
                      [0, 0.6, 1],
                      [0.4, 1.35, 1]
                    )})`,
                  }}
                />
                <div
                  style={{
                    fontSize: 29,
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    color: step(i) > 0.5 ? s.tone : C.label3,
                  }}
                >
                  {s.name}
                </div>
                <div
                  style={{
                    fontSize: 21,
                    color: C.label3,
                    marginTop: 12,
                    lineHeight: 1.4,
                    minHeight: 88,
                  }}
                >
                  {s.who}
                </div>
              </div>
              {i < PIPELINE.length - 1 && (
                // The arrow nudges forward as the stage it points at lights,
                // so the eye is handed from one card to the next.
                <div
                  style={{
                    alignSelf: "center",
                    fontSize: 30,
                    color: step(i + 1) > 0.3 ? C.accent : C.label3,
                    opacity: 0.4 + step(i + 1) * 0.6,
                    transform: `translateX(${interpolate(
                      step(i + 1),
                      [0, 0.5, 1],
                      [-10, 6, 0]
                    )}px)`,
                  }}
                >
                  ▶
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* The rework loop: review sends work back rather than ending it. */}
        <div style={{ marginTop: 30, height: 74, position: "relative", opacity: loop }}>
          <div
            style={{
              position: "absolute",
              left: "22%",
              // Draws from the review end back toward progress, in the
              // direction the work actually travels.
              right: `${22 + (1 - loop) * 56}%`,
              top: 34,
              height: 3,
              background: C.danger,
              borderRadius: 2,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "22%",
              top: 0,
              width: 3,
              height: 36,
              background: C.danger,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: "22%",
              top: 0,
              width: 3,
              height: 36,
              background: C.danger,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 46,
              textAlign: "center",
              fontSize: 24,
              color: C.danger,
              fontWeight: 700,
            }}
          >
            Changes requested — the work goes back, with the note attached
          </div>
        </div>
      </div>
    </Screen>
  )
}

/* ── The build ───────────────────────────────────────────── */

export const Stack: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame()
  const exit = useExit(dur, 20)

  // One running index across every row in every column, so the marks appear in
  // reading order rather than three columns racing each other.
  let seq = 0

  return (
    <Screen>
      <div style={{ opacity: exit }}>
        <Kicker>What it is built on</Kicker>
        <Head>Boring where it matters</Head>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr 1fr 0.78fr",
            gap: 24,
            marginTop: 46,
            alignItems: "start",
          }}
        >
          {STACK.map((group) => (
            <div
              key={group.layer}
              style={{
                background: C.card,
                border: `1px solid ${C.line}`,
                borderTop: `4px solid ${group.tone}`,
                borderRadius: 22,
                padding: "26px 28px 30px",
              }}
            >
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: group.tone,
                }}
              >
                {group.layer}
              </div>

              {group.tools.map((t) => {
                const i = seq++
                const at = 24 + i * 11
                const pop = interpolate(frame, [at, at + 16], [0, 1], clamp)
                return (
                  <div
                    key={t.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 18,
                      marginTop: 22,
                      opacity: pop,
                      transform: `translateX(${(1 - pop) * 18}px)`,
                    }}
                  >
                    <div
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 14,
                        background: C.fill,
                        border: `1px solid ${C.line}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transform: `scale(${interpolate(
                          pop,
                          [0, 0.7, 1],
                          [0.7, 1.08, 1]
                        )})`,
                      }}
                    >
                      <t.Icon size={32} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 26,
                          fontWeight: 800,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {t.name}
                      </div>
                      <div style={{ fontSize: 20, color: C.label3, marginTop: 3 }}>
                        {t.role}
                      </div>
                    </div>
                  </div>
                )
              })}

              {group.layer === "Delivery" && (
                <p
                  style={{
                    fontSize: 20,
                    color: C.label3,
                    lineHeight: 1.5,
                    marginTop: 24,
                    marginBottom: 0,
                  }}
                >
                  Every push to main ships. No secret ever reaches the browser.
                </p>
              )}
            </div>
          ))}
        </div>

        <p
          style={{
            ...useRise(150),
            fontSize: 25,
            color: C.label3,
            marginTop: 34,
            maxWidth: 1400,
          }}
        >
          The permission rules live in the database, not in the interface — so a
          request that should not see a row does not get one, whatever it asks.
        </p>
      </div>
    </Screen>
  )
}

/* ── Closing ─────────────────────────────────────────────── */

export const Closing: React.FC<{ dur: number }> = () => {
  const frame = useCurrentFrame()
  const rule = interpolate(frame, [16, 48], [0, 1], clamp)

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
            width: `${rule * 34}%`,
            margin: "30px auto 0",
            borderRadius: 2,
          }}
        />
        <p style={{ ...useRise(20), fontSize: 30, color: C.label2, marginTop: 34 }}>
          One place for every project, every review and every sign-off.
        </p>
        <div
          style={{
            ...useRise(34),
            marginTop: 40,
            fontSize: 30,
            fontWeight: 700,
            color: C.accent,
          }}
        >
          marken-os.vercel.app
        </div>
      </div>
    </Screen>
  )
}
