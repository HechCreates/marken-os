import React from "react"
import { interpolate, useCurrentFrame } from "remotion"
import { C } from "../theme"
import { Screen, Wordmark, useRise, useExit } from "../ui"
import { DOMAIN_CARDS, ROLES, PIPELINE } from "../content"

/* ── Opening ─────────────────────────────────────────────── */

export const Title: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame()
  const exit = useExit(dur, 20)
  const rule = interpolate(frame, [18, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

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

export const WhatItIs: React.FC<{ dur: number }> = ({ dur }) => {
  const exit = useExit(dur, 20)
  return (
    <Screen>
      <div style={{ opacity: exit, maxWidth: 1480 }}>
        <h2
          style={{
            ...useRise(0),
            fontSize: 66,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.16,
            margin: 0,
          }}
        >
          Client work usually lives in four places at once — a chat thread, an
          inbox, a shared drive, and somebody&rsquo;s memory.
        </h2>
        <p
          style={{
            ...useRise(34),
            fontSize: 40,
            color: C.accent,
            fontWeight: 700,
            marginTop: 42,
            letterSpacing: "-0.02em",
          }}
        >
          Marken OS puts all of it on one screen.
        </p>
        <p
          style={{
            ...useRise(48),
            fontSize: 28,
            color: C.label2,
            marginTop: 26,
            lineHeight: 1.5,
            maxWidth: 1180,
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
  const exit = useExit(dur, 20)
  return (
    <Screen>
      <div style={{ opacity: exit }}>
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
            How work is organised
          </span>
        </div>
        <h2
          style={{
            ...useRise(6),
            fontSize: 62,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            margin: "20px 0 0",
          }}
        >
          Four domains, each with its own team
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 26,
            marginTop: 54,
          }}
        >
          {DOMAIN_CARDS.map((d, i) => (
            <div
              key={d.name}
              style={{
                ...useRise(20 + i * 12),
                background: C.card,
                border: `1px solid ${C.line}`,
                borderLeft: `4px solid ${C.accent}`,
                borderRadius: 20,
                padding: "30px 34px",
              }}
            >
              <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.025em" }}>
                {d.name}
              </div>
              <div style={{ fontSize: 24, color: C.label2, marginTop: 10 }}>{d.what}</div>
            </div>
          ))}
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
  const exit = useExit(dur, 20)
  return (
    <Screen>
      <div style={{ opacity: exit }}>
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
            Who sees what
          </span>
        </div>
        <h2
          style={{
            ...useRise(6),
            fontSize: 62,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            margin: "20px 0 0",
          }}
        >
          Three roles, three different applications
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 26,
            marginTop: 50,
          }}
        >
          {ROLES.map((r, i) => (
            <div
              key={r.name}
              style={{
                ...useRise(20 + i * 14),
                background: C.card,
                border: `1px solid ${C.line}`,
                borderRadius: 22,
                padding: "34px 32px",
                borderTop: `4px solid ${r.tone}`,
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
          ))}
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
    interpolate(frame, [40 + i * 34, 70 + i * 34], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  const loop = interpolate(frame, [40 + 4 * 34, 90 + 4 * 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <Screen>
      <div style={{ opacity: exit }}>
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
            How work moves
          </span>
        </div>
        <h2
          style={{
            ...useRise(6),
            fontSize: 62,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            margin: "20px 0 0",
          }}
        >
          Every project follows one path
        </h2>

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
                <div
                  style={{
                    alignSelf: "center",
                    fontSize: 30,
                    color: step(i + 1) > 0.3 ? C.accent : C.label3,
                    opacity: 0.4 + step(i + 1) * 0.6,
                  }}
                >
                  ▶
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* The rework loop: review sends work back rather than ending it. */}
        <div
          style={{
            marginTop: 30,
            height: 74,
            position: "relative",
            opacity: loop,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "22%",
              right: "22%",
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

/* ── Attendance ──────────────────────────────────────────── */

export const Attendance: React.FC<{ dur: number }> = ({ dur }) => {
  const exit = useExit(dur, 20)
  return (
    <Screen>
      <div style={{ opacity: exit, maxWidth: 1480 }}>
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
            Hours, without a timesheet
          </span>
        </div>
        <h2
          style={{
            ...useRise(6),
            fontSize: 62,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            margin: "20px 0 0",
            lineHeight: 1.12,
          }}
        >
          Signing in starts the clock. Signing out stops it.
        </h2>

        <div style={{ display: "flex", gap: 26, marginTop: 48 }}>
          {[
            { k: "Nobody fills anything in", v: "Attendance is a by-product of using the tool, not a second job." },
            { k: "Heads see their own team", v: "Hours roll up per domain, visible to the people accountable for it." },
            { k: "Forgot to sign out?", v: "The session closes overnight, capped and flagged as an estimate." },
          ].map((c, i) => (
            <div
              key={c.k}
              style={{
                ...useRise(22 + i * 14),
                flex: 1,
                background: C.card,
                border: `1px solid ${C.line}`,
                borderRadius: 20,
                padding: "30px 28px",
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>
                {c.k}
              </div>
              <div style={{ fontSize: 23, color: C.label2, marginTop: 14, lineHeight: 1.5 }}>
                {c.v}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  )
}

/* ── Closing ─────────────────────────────────────────────── */

export const Closing: React.FC<{ dur: number }> = () => {
  const frame = useCurrentFrame()
  const rule = interpolate(frame, [16, 48], [0, 1], {
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
            width: `${rule * 34}%`,
            margin: "30px auto 0",
            borderRadius: 2,
          }}
        />
        <p style={{ ...useRise(20), fontSize: 30, color: C.label2, marginTop: 34 }}>
          One place for every project, every review and every hour.
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
