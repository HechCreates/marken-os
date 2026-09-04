# Marken OS

Internal operations tool for a creative agency — client projects moving through
a review pipeline, with three roles, four domains, attendance and notifications.

Built with Next.js 16 and Supabase. Authorization lives in the database, not the
browser.

---

## What it does

Work is organised by **domain** (Marketing, Design, Social Media, Web Dev) and
moves through a review pipeline:

```
assigned → in_progress → in_review → approved
                ↑             │
                └─────────────┘
             changes_requested
```

Three roles see three different applications:

| Role | Sees | Can do |
|---|---|---|
| **Admin** | Every domain | Everything, plus managing people and clients |
| **Domain head** | Their own domain | Create projects, assign work, approve or request changes |
| **Employee** | Projects they're assigned to | Start work, submit files or links, comment |

Employees also see the pipeline in their own vocabulary — *Sent for approval*
rather than `in_review`, *Rework* rather than `changes_requested`.

## Stack

- **Next.js 16** (App Router, React 19, Server Components)
- **Supabase** — Postgres, Auth, Storage, Row Level Security
- **Tailwind CSS 4** with a semantic design-token layer
- **TypeScript** (strict)
- **Lucide** for icons

## Architecture

### Authorization is three layers deep

1. **`src/proxy.ts`** — an unauthenticated request for `/admin` never reaches
   the page. It redirects at the edge.
2. **`requireProfile()` / `requireRole()`** — re-checked inside every page and
   server action. Next's own docs warn that Server Functions can drift outside
   proxy coverage after a refactor, so this is not assumed.
3. **Row Level Security** — the actual boundary. An employee and an admin run
   *identical* SQL and get different rows back, because the database decides.

Nothing in `src/lib/queries.ts` filters by role. That's the point.

### State transitions are RPCs, not updates

Employees have no `UPDATE` grant on `projects`. Starting work, submitting for
review, approving and requesting changes all go through `SECURITY DEFINER`
functions that validate the move server-side:

```sql
select public.submit_for_review(42);
-- ERROR: Project must be in progress to submit
```

A tampered client gets a Postgres exception, not a transition. The same applies
to project creation, which also writes notifications — a table ordinary users
cannot insert into.

### Storage is private

Both buckets are private with signed URLs and size limits. Storage policies key
on the project id in the object path, so file access inherits project access
automatically: if you can't see the project, you can't fetch its files.

### Design tokens are verified, not asserted

The palette is a single dark appearance — Marken's `#FBFF12` on `#1A1B12`
measures 16:1, while the same yellow on white is 1.1:1, so a light theme would
mean a different brand rather than an inverted one.

Every colour pairing is checked against WCAG AA by a script that parses the
stylesheet itself, so the numbers can't drift from what ships:

```bash
npm run contrast
```

## Running it

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.example` to `.env.local` and fill it in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_LOGIN_EMAIL_DOMAIN=markenos.internal
SUPABASE_SERVICE_ROLE_KEY=
```

The publishable key is safe in the browser — every row it can reach is decided
by RLS. The **service role key bypasses every policy**; it is server-only
(guarded by `import "server-only"`) and needed solely for creating and deleting
auth users from Settings. Everything else works without it.

### 3. Migrations

Apply `supabase/migrations/` in order. They are not incremental patches on a
working system — `0001` deliberately purges demo data, and `0004` replaces the
original `users` table with `profiles` keyed to `auth.users`.

### 4. Seed (optional)

Creates nine accounts across all three roles and four domains, five clients and
eleven projects covering every status:

```bash
cd supabase/seed && npm install
node seed.mjs
```

Reads `SUPABASE_SERVICE_ROLE_KEY` and `DEMO_PASSWORD` from the environment.

### 5. Run

```bash
npm run dev
```

## Login

Staff sign in with a **username**, not an email. Supabase Auth needs an address,
so `jane.marketing` is mapped to `jane.marketing@markenos.internal` by a
function mirrored on both sides — `usernameToEmail()` in the app and
`public.username_to_email()` in the database. The trade-off: those addresses
receive no mail, so password resets are an admin action rather than a
self-service email link.

## Notes

`MarkenOs overrides/` holds the original Framer code overrides this replaced,
kept for reference. `screen references/` holds the original mockups.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run contrast` | Verify every colour pairing against WCAG AA |
| `npm run types:gen` | Regenerate database types (needs the Supabase CLI) |
