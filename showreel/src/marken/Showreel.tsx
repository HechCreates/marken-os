import React from "react"
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion"
import { C, AT, TOTAL } from "./theme"
import { Feature } from "./Feature"
import { Progress } from "./ui"
import {
  Title,
  WhatItIs,
  Domains,
  Roles,
  Pipeline,
  Stack,
  Closing,
} from "./scenes/Parts"

export const SHOWREEL_DURATION = TOTAL

const S: React.FC<{ id: keyof typeof AT; children: React.ReactNode }> = ({
  id,
  children,
}) => (
  <Sequence from={AT[id].from} durationInFrames={AT[id].dur}>
    {children}
  </Sequence>
)

/**
 * A product explainer: what Marken OS is and what it does, in the order a new
 * person would need to learn it. Concepts first, then the screens that carry
 * them, then the supporting features, then what it is built on.
 *
 * Only the things that make this tool what it is are here. The notification
 * list, the upload dialog and the attendance clock were cut — every tool has
 * a bell and an upload button, and none of them is the reason this one exists.
 * What survived either changes what someone can see, or moves work forward.
 *
 * Timings live in theme.ts. Every scene holds its content still after the
 * first two seconds so nothing has to be read in a hurry.
 */
export const Showreel: React.FC = () => {
  const frame = useCurrentFrame()

  return (
    <AbsoluteFill style={{ background: C.page }}>
      <S id="title">
        <Title dur={AT.title.dur} />
      </S>
      <S id="whatItIs">
        <WhatItIs dur={AT.whatItIs.dur} />
      </S>
      <S id="domains">
        <Domains dur={AT.domains.dur} />
      </S>
      <S id="roles">
        <Roles dur={AT.roles.dur} />
      </S>

      <S id="admin">
        <Feature
          dur={AT.admin.dur}
          tag="Admin"
          head="The whole agency, at a glance"
          lines={[
            "Active work, what is overdue, what is waiting on a decision, and how many clients are on the books.",
            "Each domain shows its live project count — one click goes straight into that team.",
            "A running feed of what everyone has submitted, approved or commented on.",
          ]}
          shot="admin.png"
          aspect={1.95}
        />
      </S>

      <S id="head">
        <Feature
          dur={AT.head.dur}
          tag="Domain head"
          head="Your team, and only your team"
          lines={[
            "The same four figures, narrowed to the domain you run.",
            "Filter by stage to see what is assigned, in progress, waiting on you, or done.",
            "Every card shows the client, the due date and who is on it — overdue work turns red.",
          ]}
          shot="domain.png"
          aspect={2.05}
          flip
        />
      </S>

      <S id="employee">
        <Feature
          dur={AT.employee.dur}
          tag="Employee"
          head="Just the work that is yours"
          lines={[
            "Four counts in plain language: assigned, sent for approval, rework, completed.",
            "No stats for the wider domain, and no projects you are not part of.",
            "Tap any figure to filter straight to those projects.",
          ]}
          shot="employee.png"
          aspect={2.25}
        />
      </S>

      <S id="pipeline">
        <Pipeline dur={AT.pipeline.dur} />
      </S>

      <S id="project">
        <Feature
          dur={AT.project.dur}
          tag="The project page"
          head="Everything about one job, in one place"
          lines={[
            "The brief, with the reference links and attachments the head added.",
            "Submit a file or paste a Figma or Drive link — drafts are versioned automatically, so nothing overwrites anything.",
            "Files are private: only the people on the project can open them.",
            "A thread where the conversation and the audit trail sit side by side.",
          ]}
          shot="project.png"
          aspect={1.35}
          flip
        />
      </S>

      <S id="review">
        <Feature
          dur={AT.review.dur}
          tag="Review"
          head="Approve it, or send it back with a note"
          lines={[
            "Heads and admins see approve and request-changes. Nobody else does — the buttons are not there to hide.",
            "Requesting changes puts the reason in the thread and tells whoever is assigned.",
            "An approval records who signed it off and when: the record the old process never kept.",
          ]}
          shot="project.png"
          aspect={1.9}
          pan={[38, 100]}
        />
      </S>

      <S id="newProject">
        <Feature
          dur={AT.newProject.dur}
          tag="Starting work"
          head="A new project takes about a minute"
          lines={[
            "Title, client, brief, due date and priority. Add a client inline if they are new.",
            "Pick who works on it — the first person chosen becomes the lead.",
            "Everyone assigned is told the moment it is created.",
          ]}
          shot="newproj.png"
          aspect={1.5}
          flip
        />
      </S>

      <S id="administration">
        <Feature
          dur={AT.administration.dur}
          tag="Administration"
          head="Adding people, adding clients"
          lines={[
            "Create an account, set the role and the domain, and hand over the generated password.",
            "Move someone between domains or change their role at any time. Leavers are deactivated, not deleted, so their work history survives.",
            "Add a client once and every domain can use them — each shows how much work it carries, so none is removed by accident.",
          ]}
          shot="settings.png"
          aspect={2.05}
        />
      </S>

      <S id="stack">
        <Stack dur={AT.stack.dur} />
      </S>

      <S id="closing">
        <Closing dur={AT.closing.dur} />
      </S>

      {/* Outside every Sequence, so it reads absolute frames and runs
          continuously across the cuts. */}
      <Progress frame={frame} total={TOTAL} />
    </AbsoluteFill>
  )
}
