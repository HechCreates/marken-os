import { C } from "./theme"
import {
  NextIcon,
  ReactIcon,
  TypeScriptIcon,
  TailwindIcon,
  LucideIcon,
  SupabaseIcon,
  PostgresIcon,
  ShieldIcon,
  VercelIcon,
} from "./icons"

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

/**
 * What it is built on, grouped by the layer each tool belongs to. The marks
 * are used nominatively — to identify the tool, not to imply endorsement.
 */
export const STACK = [
  {
    layer: "Interface",
    tone: C.info,
    tools: [
      { name: "Next.js 16", role: "App Router, server components", Icon: NextIcon },
      { name: "React 19", role: "Server-rendered by default", Icon: ReactIcon },
      { name: "TypeScript", role: "Strict, no implicit any", Icon: TypeScriptIcon },
      { name: "Tailwind CSS 4", role: "One semantic token layer", Icon: TailwindIcon },
      { name: "Lucide", role: "Iconography", Icon: LucideIcon },
    ],
  },
  {
    layer: "Data and rules",
    tone: C.ok,
    tools: [
      { name: "Supabase", role: "Auth, storage, realtime", Icon: SupabaseIcon },
      { name: "PostgreSQL", role: "Every table, every constraint", Icon: PostgresIcon },
      { name: "Row Level Security", role: "The database enforces who sees what", Icon: ShieldIcon },
    ],
  },
  {
    layer: "Delivery",
    tone: C.accent,
    tools: [{ name: "Vercel", role: "Deployed from the main branch", Icon: VercelIcon }],
  },
] as const
