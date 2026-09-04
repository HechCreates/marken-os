// Marken OS — demo seed
//
// Creates 9 staff accounts across all four domains, 5 clients, and 11 projects
// spread across every status and priority so the dashboards, stat tiles and
// admin panel all render with real-looking numbers.
//
// Usage (PowerShell):
//   cd supabase/seed
//   npm install
//   $env:SUPABASE_SERVICE_ROLE_KEY = "<service role key>"
//   $env:DEMO_PASSWORD = "<a password you choose>"
//   node seed.mjs
//
// The service role key is in Supabase → Project Settings → API. It bypasses RLS
// by design, which is why this runs as a script and never from the browser.
// Both values are read from the environment; neither is stored in this file.
//
// Re-running: safe. It deletes and recreates the demo rows and accounts.

import { createClient } from "@supabase/supabase-js"

const URL = "https://kufsbpaleeawqmtlnnno.supabase.co"
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PW  = process.env.DEMO_PASSWORD

if (!KEY) { console.error("Set SUPABASE_SERVICE_ROLE_KEY first."); process.exit(1) }
if (!PW)  { console.error("Set DEMO_PASSWORD first."); process.exit(1) }
if (PW.length < 8) { console.error("DEMO_PASSWORD must be at least 8 characters."); process.exit(1) }

const db = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const email = (u) => `${u.toLowerCase()}@markenos.internal`
const day   = (n) => {
  const d = new Date(); d.setDate(d.getDate() + n)
  return d.toISOString().split("T")[0]
}
const hoursAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString()

// ── Staff ─────────────────────────────────────────────────────
const STAFF = [
  { username: "rohan.admin",     full_name: "Rohan Bhat",     role: "admin",    domain: null },
  { username: "jane.marketing",  full_name: "Jane Doe",       role: "head",     domain: "marketing" },
  { username: "liam.marketing",  full_name: "Liam Carter",    role: "employee", domain: "marketing" },
  { username: "nina.design",     full_name: "Nina Rao",       role: "head",     domain: "design" },
  { username: "carlos.design",   full_name: "Carlos Mendez",  role: "employee", domain: "design" },
  { username: "tom.social",      full_name: "Tom Fisher",     role: "head",     domain: "socialmedia" },
  { username: "mia.social",      full_name: "Mia Chen",       role: "employee", domain: "socialmedia" },
  { username: "dev.webdev",      full_name: "Dev Sharma",     role: "head",     domain: "webdev" },
  { username: "ryan.webdev",     full_name: "Ryan Patel",     role: "employee", domain: "webdev" },
]

const CLIENTS = [
  "Northwind Coffee", "Alderman & Finch", "Bluepeak Fitness",
  "Kesari Textiles", "Orbit Robotics",
]

// domain, client index, title, status, priority, due offset in days, lead, support
const PROJECTS = [
  ["marketing",   0, "Q4 Brand Campaign",            "in_review",         "urgent",  +4,  "liam.marketing", null],
  ["marketing",   1, "Email Nurture Rebuild",        "in_progress",       "normal",  +12, "liam.marketing", null],
  ["marketing",   2, "Trade Show Collateral",        "approved",          "normal",  -9,  "liam.marketing", null],
  ["marketing",   3, "Retention Offer Testing",      "assigned",          "high",    -3,  "liam.marketing", null],
  ["design",      0, "Packaging Refresh",            "in_review",         "high",    +2,  "carlos.design",  null],
  ["design",      4, "Investor Deck Design",         "changes_requested", "urgent",  +1,  "carlos.design",  null],
  ["design",      2, "Studio Signage System",        "approved",          "normal",  -15, "carlos.design",  null],
  ["socialmedia", 1, "Founder Story Series",         "in_progress",       "normal",  +8,  "mia.social",     null],
  ["socialmedia", 2, "Launch Week Content Calendar", "in_review",         "high",    -1,  "mia.social",     null],
  ["webdev",      4, "Marketing Site Rebuild",       "in_progress",       "urgent",  +21, "ryan.webdev",    "dev.webdev"],
  ["webdev",      3, "Checkout Flow Fixes",          "assigned",          "high",    +6,  "ryan.webdev",    null],
]

const HEAD_OF = { marketing: "jane.marketing", design: "nina.design", socialmedia: "tom.social", webdev: "dev.webdev" }

async function wipe() {
  console.log("Clearing existing demo data…")
  for (const t of ["notifications", "comments", "submissions", "project_members", "projects", "attendance", "clients"]) {
    await db.from(t).delete().neq("id", 0)
  }
  const { data } = await db.auth.admin.listUsers({ perPage: 200 })
  for (const u of data?.users ?? []) {
    if (u.email?.endsWith("@markenos.internal")) await db.auth.admin.deleteUser(u.id)
  }
}

async function createStaff() {
  const ids = {}
  for (const s of STAFF) {
    const { data, error } = await db.auth.admin.createUser({
      email: email(s.username),
      password: PW,
      email_confirm: true,
      user_metadata: { username: s.username, full_name: s.full_name, role: s.role, domain: s.domain ?? "" },
    })
    if (error) throw new Error(`createUser ${s.username}: ${error.message}`)
    ids[s.username] = data.user.id
    console.log(`  ${s.role.padEnd(8)} ${s.username}`)
  }
  // The on_auth_user_created trigger writes profiles. Verify it fired.
  const { data: profs } = await db.from("profiles").select("username, role, domain")
  if ((profs?.length ?? 0) !== STAFF.length) {
    throw new Error(`Expected ${STAFF.length} profiles, found ${profs?.length ?? 0}. Is the trigger installed?`)
  }
  return ids
}

async function seedContent(ids) {
  const admin = ids["rohan.admin"]

  const { data: clients, error: cErr } = await db.from("clients")
    .insert(CLIENTS.map((name) => ({ name, created_by: admin }))).select()
  if (cErr) throw new Error(`clients: ${cErr.message}`)
  console.log(`  ${clients.length} clients`)

  let nProjects = 0, nSubs = 0, nComments = 0, nNotifs = 0
  for (const [domain, ci, title, status, priority, due, lead, support] of PROJECTS) {
    const head = ids[HEAD_OF[domain]]
    const { data: proj, error: pErr } = await db.from("projects").insert({
      title, domain, priority, status,
      client_id: clients[ci].id,
      brief: `Scope, deliverables and timeline for ${title.toLowerCase()} with ${clients[ci].name}.`,
      due_date: day(due),
      created_by: head,
      approved_by:  status === "approved" ? head : null,
      approved_at:  status === "approved" ? hoursAgo(72) : null,
    }).select().single()
    if (pErr) throw new Error(`project "${title}": ${pErr.message}`)
    nProjects++

    const members = [{ project_id: proj.id, user_id: ids[lead], role_in_project: "lead", assigned_by: head }]
    if (support) members.push({ project_id: proj.id, user_id: ids[support], role_in_project: "support", assigned_by: head })
    await db.from("project_members").insert(members)

    // Submissions on anything that has reached review at least once
    if (["in_review", "approved", "changes_requested"].includes(status)) {
      const versions = status === "approved" ? 2 : 1
      for (let v = 1; v <= versions; v++) {
        await db.from("submissions").insert({
          project_id: proj.id, submitted_by: ids[lead], version: v,
          file_url: `https://example.com/marken-demo/${proj.id}/v${v}`,
          file_name: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-v${v}`,
        })
        nSubs++
      }
    }

    // Every object in a batch insert MUST carry an identical key set — PostgREST
    // rejects the whole batch otherwise, so is_system is always spelled out.
    const say = (author, message, is_system = false) =>
      ({ project_id: proj.id, author_id: author, message, is_system })

    const thread = [say(ids[lead], "Started project", true)]
    if (status === "in_review")         thread.push(say(ids[lead], "Submitted for review", true))
    if (status === "changes_requested") thread.push(say(head, "Type hierarchy on slides 4-7 needs to match the brand guide."))
    if (status === "approved")          thread.push(say(head, "Project approved", true))
    if (status === "in_progress")       thread.push(say(ids[lead], "First draft is close — should have something to review in a couple of days."))

    const { error: cmErr } = await db.from("comments").insert(thread)
    if (cmErr) throw new Error(`comments for "${title}": ${cmErr.message}`)
    nComments += thread.length

    if (status === "changes_requested" || status === "approved") {
      await db.from("notifications").insert({
        for_user: ids[lead],
        type: status === "approved" ? "project_approved" : "changes_requested",
        message: status === "approved" ? `"${title}" has been approved` : `Changes requested on "${title}"`,
        project_id: proj.id,
        is_read: false,
      })
      nNotifs++
    }
  }
  console.log(`  ${nProjects} projects · ${nSubs} submissions · ${nComments} comments · ${nNotifs} notifications`)

  // Attendance: a working week for every non-admin, one still clocked in today
  const rows = []
  const staff = STAFF.filter((s) => s.role !== "admin")
  for (const s of staff) {
    for (let d = 6; d >= 1; d--) {
      const date = new Date(); date.setDate(date.getDate() - d)
      if (date.getDay() === 0 || date.getDay() === 6) continue
      const inAt = new Date(date); inAt.setHours(9, 10 + Math.floor(Math.random() * 40), 0, 0)
      const out  = new Date(inAt); out.setHours(17, 30 + Math.floor(Math.random() * 50), 0, 0)
      rows.push({ user_id: ids[s.username], date: date.toISOString().split("T")[0], clock_in: inAt.toISOString(), clock_out: out.toISOString() })
    }
  }
  // One person currently on the clock — the partial unique index allows exactly one open session each
  rows.push({ user_id: ids["mia.social"], date: day(0), clock_in: hoursAgo(3), clock_out: null })
  const { error: aErr } = await db.from("attendance").insert(rows)
  if (aErr) throw new Error(`attendance: ${aErr.message}`)
  console.log(`  ${rows.length} attendance records`)
}

async function main() {
  await wipe()
  console.log("Creating staff accounts…")
  const ids = await createStaff()
  console.log("Seeding content…")
  await seedContent(ids)
  console.log("\nDone. Sign in with any username below and the password you set:\n")
  for (const s of STAFF) console.log(`  ${s.username.padEnd(18)} ${s.role.padEnd(9)} ${s.domain ?? "all domains"}`)
}

main().catch((e) => { console.error("\nSeed failed:", e.message); process.exit(1) })
