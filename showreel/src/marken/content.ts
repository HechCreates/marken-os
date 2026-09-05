import { C } from "./theme"

/**
 * All the copy in one place, so the script can be read and edited without
 * going scene by scene.
 */

export const DOMAIN_CARDS = [
  { name: "Marketing and Sales", what: "Campaigns, collateral, retention work" },
  { name: "Design and Creatives", what: "Brand systems, decks, packaging, signage" },
  { name: "Social Media Management", what: "Content calendars, series, launches" },
  { name: "Website Design and Development", what: "Sites, rebuilds, checkout and tech" },
] as const

export const ROLES = [
  {
    name: "Admin",
    tone: C.accent,
    sees: "Every domain, every project, every person.",
    can: [
      "Onboard clients and staff",
      "Assign work across any team",
      "Approve or send back anything",
    ],
  },
  {
    name: "Domain head",
    tone: C.info,
    sees: "Their own domain, in full.",
    can: [
      "Create projects and assign their team",
      "Review submitted work",
      "Approve or request changes",
    ],
  },
  {
    name: "Employee",
    tone: C.ok,
    sees: "Only the projects they are on.",
    can: [
      "Start assigned work",
      "Submit files or links, versioned",
      "Comment and respond to feedback",
    ],
  },
] as const

export const PIPELINE = [
  { name: "Assigned", tone: C.accent, who: "A head creates the project and picks who works on it" },
  { name: "In progress", tone: C.info, who: "The person assigned starts, and the clock is visible to everyone" },
  { name: "In review", tone: C.warn, who: "Work is submitted and waiting on a head or an admin" },
  { name: "Approved", tone: C.ok, who: "Signed off, with a record of who approved it and when" },
] as const
