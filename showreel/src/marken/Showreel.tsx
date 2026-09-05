import React from "react"
import { AbsoluteFill, Sequence } from "remotion"
import { C, AT, TOTAL } from "./theme"
import { Feature } from "./Feature"
import {
  Title,
  WhatItIs,
  Domains,
  Roles,
  Pipeline,
  Attendance,
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
 * them, then the supporting features.
 *
 * Timings live in theme.ts. Every scene holds its content still after the
 * first two seconds so nothing has to be read in a hurry.
 */
export const Showreel: React.FC = () => (
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
        aspect={1.66}
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
        aspect={1.74}
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
        aspect={2.0}
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
          "The brief, with any reference links and attachments the head added.",
          "The actions available to you right now — and nothing that is not yours to do.",
          "Every version anyone has submitted, newest marked, all openable.",
          "A thread where the conversation and the audit trail sit side by side.",
        ]}
        shot="project.png"
        aspect={1.2}
        flip
      />
    </S>

    <S id="submit">
      <Feature
        dur={AT.submit.dur}
        tag="Handing work in"
        head="Upload a file, or just paste a link"
        lines={[
          "Drafts are versioned automatically — v1, v2, v3 — so nothing overwrites anything.",
          "Working in Figma or Drive? Submit the link instead of exporting.",
          "Files are private. Only people on the project can open them.",
        ]}
        shot="project.png"
        aspect={1.55}
      />
    </S>

    <S id="review">
      <Feature
        dur={AT.review.dur}
        tag="Review"
        head="Approve it, or send it back with a note"
        lines={[
          "Heads and admins see approve and request-changes buttons; nobody else does.",
          "Requesting changes puts the reason in the thread and notifies whoever is assigned.",
          "An approval records who signed it off and when — the record the old process never kept.",
        ]}
        shot="notifications.png"
        aspect={2.2}
        flip
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
          "Everyone assigned gets a notification the moment it is created.",
        ]}
        shot="newproj.png"
        aspect={1.4}
      />
    </S>

    <S id="notifications">
      <Feature
        dur={AT.notifications.dur}
        tag="Notifications"
        head="You are told when something needs you"
        lines={[
          "New assignments, approvals and change requests, newest first.",
          "Unread items are marked three ways, so they are hard to miss.",
          "Opening one takes you straight to the project it is about.",
        ]}
        shot="notifications.png"
        aspect={2.0}
        flip
      />
    </S>

    <S id="people">
      <Feature
        dur={AT.people.dur}
        tag="People"
        head="Adding and managing staff"
        lines={[
          "Create an account, set the role and domain, and hand over the generated password.",
          "Change someone's role or move them between domains at any time.",
          "Someone leaving is deactivated rather than deleted, so their work history survives.",
        ]}
        shot="settings.png"
        aspect={1.82}
      />
    </S>

    <S id="clients">
      <Feature
        dur={AT.clients.dur}
        tag="Clients"
        head="Every client, and what they have running"
        lines={[
          "Add a client once and they are available to every domain.",
          "Each shows how many projects it has, so nothing is deleted by accident.",
        ]}
        shot="clients.png"
        aspect={2.1}
        flip
      />
    </S>

    <S id="attendance">
      <Attendance dur={AT.attendance.dur} />
    </S>

    <S id="closing">
      <Closing dur={AT.closing.dur} />
    </S>
  </AbsoluteFill>
)
