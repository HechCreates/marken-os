import React from "react"
import { Sequence, staticFile, interpolate, useCurrentFrame } from "remotion"
import { C } from "../theme"
import { Screen, Shot, useRise, useExit } from "../ui"

/**
 * The product itself. Each beat holds one screenshot and one claim about it —
 * the claim is what the screenshot is evidence for, not a caption of it.
 */
const BEATS = [
  {
    file: "login.png",
    tag: "Sign in",
    head: "Usernames, not emails",
    body: "jane.marketing maps to a synthetic address by a function mirrored in the app and the database. No password is ever compared in the browser.",
  },
  {
    file: "admin.png",
    tag: "Admin",
    head: "Every domain at once",
    body: "Active work, overdue, pending approvals and clients — then the four domains, then a merged activity feed. Filtered by policy, not by a WHERE clause.",
  },
  {
    file: "domain.png",
    tag: "Domain head",
    head: "One domain, filterable",
    body: "The filter lives in the URL, so a filtered view is shareable and survives the back button.",
  },
  {
    file: "employee.png",
    tag: "Employee",
    head: "Their own vocabulary",
    body: "Sent for approval, not in_review. Rework, not changes_requested. The pipeline named the way the person recognises it.",
  },
  {
    file: "project.png",
    tag: "Project",
    head: "Where the work happens",
    body: "Brief, role-gated actions, versioned submissions and a thread where system entries read as audit, not conversation.",
  },
  {
    file: "settings.png",
    tag: "Settings",
    head: "The admin's parental control",
    body: "People and clients. Deactivating is the default, because deleting an account takes their uploaded work with it.",
  },
]

const PER = 80 // frames per beat — six beats fills the 480-frame scene

export const Screens: React.FC<{ dur: number }> = ({ dur }) => {
  const exit = useExit(dur, 20)
  return (
    <div style={{ position: "absolute", inset: 0, opacity: exit }}>
      {BEATS.map((b, i) => (
        <Sequence key={b.file} from={i * PER} durationInFrames={PER}>
          <Beat {...b} />
        </Sequence>
      ))}
    </div>
  )
}

const Beat: React.FC<(typeof BEATS)[number]> = ({ file, tag, head, body }) => {
  const frame = useCurrentFrame()
  // A slow push-in keeps the stills from feeling like a slideshow.
  const scale = interpolate(frame, [0, PER], [1, 1.045])
  const fade = interpolate(frame, [0, 10, PER - 10, PER], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <Screen pad={88}>
      <div
        style={{
          opacity: fade,
          display: "grid",
          gridTemplateColumns: "0.78fr 1.58fr",
          gap: 64,
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              ...useRise(4),
              display: "inline-block",
              fontSize: 19,
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.onAccent,
              background: C.accent,
              padding: "7px 15px",
              borderRadius: 999,
            }}
          >
            {tag}
          </div>
          <h2
            style={{
              ...useRise(10),
              fontSize: 58,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              margin: "22px 0 0",
            }}
          >
            {head}
          </h2>
          <p
            style={{
              ...useRise(16),
              fontSize: 26,
              lineHeight: 1.55,
              color: C.label2,
              margin: "22px 0 0",
            }}
          >
            {body}
          </p>
        </div>

        <div style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
          <Shot src={staticFile(`shots/${file}`)} aspect={file === "project.png" ? 1.32 : 1.97} />
        </div>
      </div>
    </Screen>
  )
}
