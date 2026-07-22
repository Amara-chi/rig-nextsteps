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
- `index.html` — visitor check-in form (public, mobile-first, offline queue via localStorage,
  kiosk mode via `?kiosk=1` which auto-resets after each check-in)
- `admin/index.html` — staff app: login, Today dashboard, Session Mode (video + QR + live
  arrivals), People (journey, notes, editing), Follow-Up Centre (3 stages), Reports
- `config.js` — all configuration; placeholders in repo, real values only on the server
- `supabase/schema.sql` — canonical full schema for FRESH installs (tables, RLS, RPCs, views)
- `supabase/migrations/` — same content split for `supabase db push` workflows
- `supabase/import-history.sql` — one-time historical data load (27 people, Mar–Jul 2026);
  idempotent; run AFTER the schema
- `supabase/upgrade-v3.sql`, `upgrade-v4.sql` — only for databases created from older schema
  versions; NOT needed on fresh installs
- `supabase/functions/email-report` — optional Edge Function: emails weekly report via Resend
- `supabase/functions/send-followups` — optional Edge Function: auto-sends WhatsApp follow-ups
  via Meta WhatsApp Cloud API (requires approved template `next_steps_followup`)

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
- `anon` (visitors): can ONLY call two RPCs — `lookup_person(phone)` (returns first name +
  steps, nothing else) and `check_in(...)`. No table access. Never widen this.
- `authenticated` staff: SELECT on everything; INSERT on `person_notes` (any staff, including
  read-only leaders, with `author_id = auth.uid()` enforced).
- Admin only (technical role 'director', checked by `public.is_director()`): all writes to people/sessions/checkins/followups;
  delete any note. Leaders can delete only their own notes.
- Phone numbers are stored normalised by `norm_phone()`: Nigerian → `234XXXXXXXXXX`,
  foreign kept as digits. Keep frontend `normPhoneJS()` in sync with the SQL function.
- One check-in per person per day: `unique (person_id, checkin_date)`.

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
- SQL: run schema + import against local Postgres with a stub `auth` schema
  (`create schema auth; auth.users table; auth.uid()` reading `request.jwt.claim.sub`),
  grants mimicking Supabase defaults, then assert RLS behaviour by `set role` +
  `set request.jwt.claim.sub`.
- Frontend: Playwright against `file://` pages with CDN scripts route-mocked
  (supabase-js and qrcodejs stubs) — assert flows, not pixels.
- Check `node --check` on extracted inline scripts after edits.

## Known data caveats (documented in person_notes with an [Import] prefix)
- Some pre-platform session dates are estimates (the old form recorded steps without dates).
- nelsonmonday@17gmail.com is a suspected typo; two people have a staff email on file.

## Roadmap candidates (discussed, not committed)
- Note tags (prayer / action / for HC leader) + filtered overseer view
- Automated WhatsApp via Cloud API (function exists; needs Meta setup)
- Auto-email weekly report (function exists; needs Resend setup)
- Gated video catch-up for people who miss a Sunday (admin-unlocked only)
