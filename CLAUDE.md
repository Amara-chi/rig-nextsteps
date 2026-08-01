# CLAUDE.md — Next Steps Platform · Rig Church Lagos

## What this is
A check-in and follow-up platform for the "Next Steps" newcomer programme at Rig Church Lagos.
Visitors scan a QR code on Sundays and check in on their own phones (no login). Staff sign in
to a dashboard to run sessions, track each person's journey through 4 steps, send WhatsApp
follow-ups, and generate reports.

## Architecture (deliberately simple — keep it that way)
- **Static frontend, no build step.** Plain HTML/CSS/JS, no framework, no bundler, no npm.
  Deployed by uploading files to a Hostinger Business subdomain (nextsteps.rigchurchlagos.org).
- **Backend = Supabase** (Postgres + Auth + RLS). The frontend talks to it via supabase-js v2
  from CDN. All authorization lives in Row Level Security policies, NOT in frontend code.
- **`config.js`** is the only file with environment values (Supabase URL + anon key, video
  links, message templates). Never hardcode these elsewhere. Real keys are never committed.

## File map
- `index.html` — staff app, served at the domain root (`nextsteps.rigchurchlagos.org/`): login
  (plus a set-password screen for invite/recovery links), Today dashboard, Registration (QR +
  video + live arrivals), People (journey, notes, editing), Follow-Up Centre (3 stages),
  Reports (customizable fields via `app_settings.report_fields`, below, plus ad-hoc one-off
  fields per session via `sessions.custom_fields` — "Add a field" for anything not worth a
  permanent one), Team (director only)
- `checkin/index.html` — visitor check-in form (public, mobile-first, offline queue via
  localStorage, kiosk mode via `?kiosk=1` which auto-resets after each check-in), served at
  `nextsteps.rigchurchlagos.org/checkin` — this is the URL the Sunday QR code must point to
  (`config.js`'s `CHECKIN_URL`)
- `config.js` — all configuration; placeholders in repo, real values only on the server
- `images/` — brand assets: `logo.png` (dark text, for light backgrounds), `logo-light.png`
  (white text, for dark backgrounds like the sidebar), `favicon.png` (icon mark only, used as
  the browser tab icon and anywhere a small square mark is needed)
- `supabase/schema.sql` — canonical full schema for FRESH installs (tables, RLS, RPCs, views)
- `supabase/migrations/` — same content split for `supabase db push` workflows
- `supabase/import-history.sql` — one-time historical data load (27 people, Mar–Jul 2026);
  idempotent; run AFTER the schema
- `supabase/upgrade-v3.sql` through `upgrade-v11.sql` — only for databases created from older
  schema versions; NOT needed on fresh installs
- `supabase/functions/email-report` — optional Edge Function: emails weekly report via Resend.
  Field selection and order matches `app_settings.report_fields` (see below) — same report,
  same customization, whether viewed on screen or emailed.
- `supabase/functions/send-followups` — optional Edge Function: auto-sends WhatsApp follow-ups
  via Meta WhatsApp Cloud API (requires approved template `next_steps_followup`)
- `supabase/functions/manage-staff` — powers the Team pane (director-only): invite, remove, or
  re-role staff without hand-running SQL. Deploy it (`supabase functions deploy manage-staff`)
  for that pane to work; without it, role management still falls back to the manual SQL in
  `schema.sql`'s closing comment. Business rule enforced server-side, not just in the UI: a
  director can never remove or re-role themselves (no exceptions) or another director — only
  by hand in Supabase, on purpose — EXCEPT one named account (`SUPER_ADMIN_EMAIL` in the
  function, org decision 2026-08-01) which can remove/re-role other directors, though still
  never itself.

## Fresh environment bootstrap (in order)
1. Create a Supabase project (or `supabase start` for local dev).
2. Run `supabase/schema.sql` (SQL editor) or `supabase db push` with the migrations folder.
3. Run `supabase/import-history.sql` (idempotent — safe to re-run).
4. Create staff users in Supabase Auth, then promote the admin (technical role name stays 'director'):
   `update public.profiles set role='director' where id = (select id from auth.users where email='<director-email>');`
   All other users default to read-only 'leader'.
5. Put the project URL + anon key into `config.js`.
6. Serve the files statically (any static server locally; Hostinger in production).

## Business rules (from the church's SOP — do not change without the admin's sign-off)
- The journey is 4 steps, attended in ANY order; completion = all 4 done.
- **House church eligibility requires ALL 4 steps** (changed Jul 2026 from the original
  step-1 rule; the view column `hc_eligible` encodes this).
- Completing all 4 opens a **30-day membership window**; after it passes the person is
  `membership_ready`. Recording membership (`people.member_since`) only documents a
  decision leadership already made — the app must never automate that decision.
- House church PLACEMENT belongs to the overseer; the app only records interest
  (`hc_interest`) and eligibility.
- Follow-up: contact within 24h of attendance; no-shows get Monday call → text → door open,
  never chased. Outcomes are logged after the fact (followups.outcome) and mirrored as
  person_notes.

## Security model (RLS — enforced in the database, never trust the client)
Three staff roles, checked by `public.is_director()` / `is_leader()` / `is_support()`:
- **director** (full admin): all writes to people/sessions/checkins/followups, including
  editing or deleting existing records (not just inserting) — the UI exposes this in People
  (edit check-ins) and Reports (edit/delete a session). Can edit or delete any note.
- **leader** (read-only): sees everyone, same as director, but cannot write to
  people/sessions/checkins/followups. Can add a note on anyone (`person_notes` INSERT, any
  staff, `author_id = auth.uid()` enforced) and edit/delete only their own notes.
- **support** (narrow, non-admin): sees ONLY people matching `public.support_visible_person()`
  — house church interest, the post-4-step membership pipeline, or an open follow-up (a
  pending message, one sent with no outcome yet, or a no-show). No direct table access to
  `people` or `checkins` at all (row-filtering alone isn't enough — a raw `people` query would
  still return every column, not just the few support needs) — the frontend reads instead
  through `v_support_people`, a view built to expose only name/phone/email/milestone-reason,
  never full step history. `followups` and `person_notes` ARE readable/writable directly, but
  row-scoped to `support_visible_person()` on every policy (SELECT/INSERT on notes, SELECT on
  followups; INSERT/UPDATE on followups to log an outcome) — nothing outside that filter.
  UI shows this as 3 separate pages (House Church / Follow Up / Membership). `v_support_people`
  exposes these as INDEPENDENT booleans (`is_house_church`, `is_membership`,
  `is_awaiting_followup`, `is_noshow`), not one mutually-exclusive category — a person can be
  house-church-interested AND have finished all 4 steps at once, and must show up on both
  pages. (An earlier version used a single priority-ordered `reason` column and got this
  wrong — it silently hid house-church interest on anyone who'd also completed all 4 steps.)
- `anon` (visitors): can ONLY call two RPCs — `lookup_person(phone)` (returns first name +
  steps, nothing else) and `check_in(...)`. No table access. Never widen this.
- Phone numbers are stored normalised by `norm_phone()`: Nigerian → `234XXXXXXXXXX`,
  foreign kept as digits. Keep frontend `normPhoneJS()` in sync with the SQL function.
- One check-in per person per day: `unique (person_id, checkin_date)`.
- The no-show rule (1-3 steps done, not seen since last Sunday) is duplicated in both
  `support_visible_person()` (SQL) and the Follow-Up Centre's no-show list (`index.html`) —
  keep them in sync if either changes.

## Brand & UI conventions
- Colours from the logo: orange `#F25125`, charcoal `#454B59` / `#313743`, cream `#EFEBE2`.
- Fonts: Archivo (display 800/900, tight tracking) + IBM Plex Mono for labels/data.
- Signature motif: the arch shape (border-radius `999px 999px 12px 12px`) from the logo —
  used for step markers, bars, the QR centre.
- Tone of copy: warm, confident, never corporate ("You belong here."). British/Nigerian
  spelling. Dates day-month-year. No em dashes in church-facing copy.
- Everything must work well at 390px wide (most users are on phones); admin uses a bottom
  nav under 760px.

## Testing conventions used so far
- Full local stack (real Auth, real RLS, real Edge Functions — the most reliable way to test
  anything role/RLS-related): `npx supabase start` (needs Docker Desktop running). Applies
  `supabase/migrations/` fresh. Known local-only quirks, neither one a bug in the app:
  - Kong can hold a stale upstream IP for the auth container right after `supabase start` /
    `db reset` restarts things — `curl http://127.0.0.1:54321/auth/v1/health` and if it 502s,
    `docker restart supabase_kong_<project>`.
  - A hosted Supabase project auto-grants `authenticated`/`service_role` table privileges on
    project creation; a bare local instance doesn't. `schema.sql` now grants these explicitly
    for exactly this reason — if a brand new table/view ever gets added without a matching
    `grant ... to authenticated, service_role`, it'll work on production (until it doesn't)
    and fail immediately on a fresh local instance, which is the tell.
  - Create test users via the Admin API (`POST /auth/v1/admin/users` with the local
    `service_role` key, `email_confirm: true`), then promote roles with `docker exec -i
    <db-container> psql -U postgres -d postgres -c "update public.profiles set role=...`.
  - Invite emails land in Mailpit at `http://127.0.0.1:54324`, not a real inbox.
- Lighter SQL-only check: local Postgres with a stub `auth` schema (`create schema auth;
  auth.users` table; `auth.uid()` reading `request.jwt.claim.sub`), grants mimicking Supabase
  defaults, then assert RLS behaviour by `set role` + `set request.jwt.claim.sub`. Faster, but
  can't catch the grant/Auth-flow issues above since there's no real GoTrue/PostgREST in front
  of it.
- Frontend: Playwright/Puppeteer against the static files (`file://` or a plain static server)
  with CDN scripts route-mocked, or — for real coverage — pointed at the local stack above and
  signed in as each role. Assert flows, not pixels.
- Check `node --check` on extracted inline scripts after edits.

## Known data caveats (documented in person_notes with an [Import] prefix)
- Some pre-platform session dates are estimates (the old form recorded steps without dates).
- nelsonmonday@17gmail.com is a suspected typo; two people have a staff email on file.
- People with zero check-ins on file get Step 1 backfilled, dated to their record's
  `created_at`, via `supabase/backfill-blank-step1.sql` (director's decision, 31 Jul 2026;
  idempotent, run once).

## Roadmap candidates (discussed, not committed)
- Note tags (prayer / action / for HC leader) + filtered overseer view
- Automated WhatsApp via Cloud API (function exists; needs Meta setup)
- Auto-email weekly report (function exists; needs Resend setup)
- Gated video catch-up for people who miss a Sunday (admin-unlocked only)
- **Migrate the plain CSS to Tailwind**, for maintainability as the codebase grows (raised by
  Joshua, the main developer, 31 Jul 2026). Deliberately shelved for now — it's a full rewrite
  of every screen's markup/styling with no user-facing benefit on its own, so do it as a
  dedicated pass when there's headroom, not bundled into a feature change. Keep the "no build
  step" architecture rule in mind: this would need the Tailwind CLI (or CDN build) added to
  the toolchain without turning the project into a bundled SPA.
