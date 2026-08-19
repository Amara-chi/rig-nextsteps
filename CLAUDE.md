# CLAUDE.md — Next Steps Platform · Rig Church Lagos

## What this is
A check-in and follow-up platform for the "Next Steps" newcomer programme at Rig Church Lagos.
Visitors scan a QR code on Sundays and check in on their own phones (no login). Staff sign in
to a dashboard to run sessions, track each person's journey through 4 steps, send WhatsApp
follow-ups, and generate reports.

## Architecture
- **React + Vite + Tailwind CSS v4.** Migrated from a static no-build HTML/CSS/JS app (Aug
  2026) at the user's explicit request, as a faithful 1:1 port — same design, same behaviour,
  new toolchain. Plain JS (JSX), not TypeScript. Plain hooks + Context, no Redux/React Query —
  the app's real pattern is "full refetch on a 10s timer," not cached per-key queries.
- **One Vite project, two entry points**, not a single SPA with client routing: `index.html`
  (admin app, `src/main-admin.jsx`) and `checkin/index.html` (visitor form,
  `src/main-checkin.jsx`), configured via `vite.config.js`'s `build.rollupOptions.input`.
  Preserves the original two-independent-static-pages shape — no Hostinger rewrite rules
  needed, and the public checkin bundle stays free of admin code.
- **All admin panes stay always-mounted**, toggled via `<Pane>` (a `hidden`/`block` class
  swap), not conditional mounting — switching panes never loses in-progress state (an open
  People detail row, unsaved search text) because nothing unmounts. The check-in form's 4
  screens, by contrast, are plain conditional rendering: it's a linear wizard with no
  cross-screen state-preservation need, and its state lives in the top-level component anyway.
- **Backend = Supabase** (Postgres + Auth + RLS), unchanged by the migration. The frontend
  talks to it via `@supabase/supabase-js` v2 (npm now, not a CDN script) through
  `src/lib/supabaseClient.js`. All authorization lives in Row Level Security policies, NOT in
  frontend code.
- **Environment values are Vite env vars**, not a committed config file: `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` in a gitignored `.env.local` locally (copy `.env.example`), or the
  `SUPABASE_URL`/`SUPABASE_ANON_KEY` GitHub secrets in CI (`deploy.yml` maps them to the
  `VITE_`-prefixed names Vite requires at build time). Everything else that used to live in
  `RIG_CONFIG` (none of it secret) is now the plain committed `src/config/site.js`.
- One exception to "everything is bundled": `qrcodejs` (used for the Check-in pane's QR code)
  is still loaded via a CDN `<script>` tag in `index.html`, exactly as the old app did — its
  UMD-style global-attach (`var QRCode` at script scope) doesn't survive being bundled as an
  ES module, so `window.QRCode` is used directly rather than an npm import.

## File map
- `index.html` / `checkin/index.html` — thin Vite entry shells only (just `<div id="root">` +
  the module script tag, plus the QR CDN script on the admin one); all real markup lives in
  `src/`.
- `src/main-admin.jsx`, `src/main-checkin.jsx` — the two entry points, each mounting its own
  root component in `<StrictMode>`.
- `src/App.jsx` — admin shell: auth gate, sidebar/bottom-nav, pane-switch state, wires the
  shared data hooks to each pane.
- `src/checkin/CheckinApp.jsx` — the visitor check-in form, one self-contained component (own
  screen-by-screen state, offline queue via localStorage, kiosk mode via `?kiosk=1`).
- `src/pages/` — one file per admin pane: `Today`, `SessionPane` (Check-in — QR + live
  arrivals, renamed from "Registration" 3 Aug 2026), `VideosPage` (all 4 steps' teaching
  videos, always visible, not tied to today's session), `People`, `FollowUp` (the 3-tab
  Follow-Up Centre), `Reports` (customizable fields via `app_settings.report_fields`, below,
  plus ad-hoc one-off fields per session via `sessions.custom_fields`), `Team` (director only),
  and the 3 Support pages `SupportHouseChurch` / `SupportFollowUp` / `SupportMembership` (all
  three share `src/components/SupportPersonList.jsx` — same `v_support_people` row shape, same
  notes thread, differing only in which independent boolean filters the list and which badge
  shows).
- `src/components/` — shared UI: `Modal` (the one generic modal, ~12 call sites, each owning
  its own form-field state instead of the old `getElementById(...).value`-at-save-time
  pattern), `Card`/`CardHead`, `Badge`, `Avatar`, `BtnSm`/`Btn`, `NotesThread` (shared by
  People's person-detail view and the Support pages — `showLabel`/`className` props cover the
  two contexts' small markup differences), `OutcomeModal` (shared by Follow-Up Centre and
  Support's Follow Up page), `Sidebar`/`BottomNav`/`Pane`, `Toast`, `VideoFallbackModal`.
- `src/hooks/` — `useAuth`, `useAppData` (people/session/checkins/session-feed, polled every
  10s for non-support roles), `useFollowUp`, `useSupportPeople` (the support role's own
  `v_support_people`-backed data, also polled), `useReports`, `usePolling` (generic
  `setInterval` + `document.hidden` guard), `useToast`.
- `src/lib/` — `supabaseClient.js` (reads the `VITE_*` env vars), `phone.js` (`normPhoneJS`,
  kept in sync with the SQL `norm_phone()` function), `format.js`, `video.js`
  (`toEmbed`/`isDirectVideo` for the Videos pane's YouTube/Vimeo/direct-file players), `csv.js`.
- `src/config/site.js` — the non-secret settings that used to live in `RIG_CONFIG`
  (`CHECKIN_URL`, `CHURCH_NAME`, `STEPS`, message templates, `EMAIL_REPORTS` flag).
- `src/config/reportFields.js`, `src/context/` (`MeContext`, `ToastContext`) — supporting
  config/state for Reports and the cross-cutting role/toast concerns.
- `src/theme.css` — the Tailwind v4 `@theme` block: every design token (colours, the
  undeclared-but-repeated greys named by where they show up, the journey pipeline's 5-step
  `color-mix` ramp, `--radius-arch`, shadows, fonts, custom breakpoints at 760px/900px matching
  the old app's exact media-query cutoffs, and the admin/checkin fade-animation variants, which
  are genuinely different timings and kept distinct on purpose).
- `.env.example` — the two `VITE_*` var names to copy into a gitignored `.env.local`; no real
  values ever committed, same rule as before, just Vite's convention instead of
  `config.template.js` → `config.js`.
- `.htaccess` (in `public/`, passed through to `dist/` by Vite) — forces no-cache/must-revalidate
  on `.html` only now (narrowed from `.html`/`.js` during the migration — Vite's hashed
  `assets/*.js`/`*.css` filenames never change post-build, so forcing revalidation on those
  would now be a pure performance regression). See "Deploy & caching gotchas" below.
- `public/images/` — brand assets: `logo.png` (dark text, for light backgrounds), `logo-light.png`
  (white text, for dark backgrounds like the sidebar), `favicon.png` (icon mark only, used as
  the browser tab icon and anywhere a small square mark is needed).
- `supabase/schema.sql` — canonical full schema for FRESH installs (tables, RLS, RPCs, views)
- `supabase/migrations/` — same content split for `supabase db push` workflows
- `supabase/import-history.sql` — one-time historical data load (27 people, Mar–Jul 2026);
  idempotent; run AFTER the schema
- `supabase/upgrade-v3.sql` through `upgrade-v12.sql` — only for databases created from older
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
5. Copy `.env.example` to `.env.local` and fill in the project URL + anon key.
6. `npm install`, then `npm run dev` locally or `npm run build` for a production `dist/`
   (Hostinger serves the built output — see deploy.yml, which builds fresh on every push).

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
  foreign kept as digits. Keep `src/lib/phone.js`'s `normPhoneJS()` in sync with the SQL
  function. (The check-in form itself does NOT normalise client-side — it just checks the
  digit count and passes the raw string to `lookup_person`/`check_in`, which normalise
  server-side. `normPhoneJS()` is only used admin-side, for editing a person's phone number.)
- One check-in per person per day: `unique (person_id, checkin_date)`.
- The no-show rule (1-3 steps done, not seen since last Sunday) is duplicated in both
  `support_visible_person()` (SQL) and the Follow-Up Centre's no-show list
  (`src/hooks/useFollowUp.js`) — keep them in sync if either changes.

## Brand & UI conventions
- Colours from the logo: orange `#F25125`, charcoal `#454B59` / `#313743`, cream `#EFEBE2`.
  All design tokens live in `src/theme.css`'s `@theme` block — use the Tailwind utility
  (`bg-orange`, `text-ink-deep`, etc.), never a hardcoded hex.
- Fonts: Archivo (display 800/900, tight tracking) + IBM Plex Mono for labels/data.
- Signature motif: the arch shape (`rounded-arch`, `border-radius: 999px 999px 12px 12px`)
  from the logo — used for step markers, bars, the QR centre.
- Tone of copy: warm, confident, never corporate ("You belong here."). British/Nigerian
  spelling. Dates day-month-year. No em dashes in church-facing copy.
- Everything must work well at 390px wide (most users are on phones); admin uses a bottom
  nav under the `mobile` breakpoint (760px) and a two-column-to-one collapse under `tablet`
  (900px) — both custom breakpoints defined in `theme.css` to match the original app's exact
  cutoffs.
- Tailwind v4 decimal spacing scale is the default way to hit an exact old-CSS pixel value
  (e.g. `p-4.5` = 18px) rather than reaching for an arbitrary-value class. Use the trailing
  `!` suffix for `!important` (e.g. `mr-0.5!`) — two non-`!` utilities targeting the same CSS
  property don't reliably resolve by class-string order, so an override needs `!`, not just
  to be listed later in the className.

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
- Frontend: `npm run dev` (Vite dev server) pointed at the local Supabase stack above, driven
  with Puppeteer/Playwright, signed in as each role. Assert flows and real DOM/network state,
  not pixels or `innerText` — `document.body.innerText` is unreliable for dynamically-rendered
  or layout-dependent content in headless mode (use `textContent` or direct DOM inspection
  instead). A broad `document.querySelectorAll` + text-match can accidentally hit an element in
  a different, currently-hidden pane, since all admin panes stay mounted (see Architecture) —
  scope queries to the actually-visible `<section>` (`display !== 'none'`), not just any match
  in `main`. Native `element.value = x` on a controlled input/select does NOT reliably trigger
  React's change handling — use Puppeteer's real `page.type()` for text inputs and
  `page.select()` for `<select>` elements, not a synthetic `dispatchEvent`.
- Before a release/final check, also run `npm run build && npm run preview` — dev mode doesn't
  exercise the real hashed-bundle + `.htaccess` caching path production actually serves.
- A stale `node_modules/.vite` cache can serve an outdated Tailwind theme after adding many new
  files in one sitting (symptom: computed styles fall back to generic system fonts instead of
  Archivo/IBM Plex Mono) — not an app bug; `rm -rf node_modules/.vite` and restart the dev
  server.
- In dev mode only, React `<StrictMode>` double-invokes mount effects, which can race
  operations like the check-in form's offline-queue flush (both invocations read the queue
  before either writes it back) — harmless in dev, and doesn't happen in a production build,
  since StrictMode's extra invocation is stripped from `npm run build` output. Don't chase it
  as an app bug if seen only under `npm run dev`.
- Test data created while verifying against the local stack (people/checkins/followups/notes/
  sessions) should be deleted afterward via the REST API with the local `service_role` key —
  don't leave it for the next session to trip over.

## Deploy pipeline
- `deploy.yml` (push to `main`, or manual dispatch): `npm ci`, `npm run build` with
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` set from the `SUPABASE_URL`/`SUPABASE_ANON_KEY`
  GitHub secrets, zip `dist/` directly (no manual file list, no placeholder substitution —
  `public/images` and `public/.htaccess` already land in `dist/` via Vite's built-in
  passthrough), then deploy that zip to the Hostinger subdomain via `.github/deploy-tool/
  deploy.mjs` over the Hostinger MCP server (installed and started as earlier steps in the
  same job). The Hostinger MCP calls are wrapped in a retry (3 attempts, backoff) for
  transient network failures.
- **Retired by the migration, don't reintroduce:** the old `config.js?v=__BUILD_ID__`
  cache-busting `sed` hack. Vite's content-hashed asset filenames (`assets/index-<hash>.js`)
  are a stronger, automatic version of the same idea — a real code change always produces a
  new filename, so there is nothing to cache-bust by hand.

## Deploy & caching gotchas
- Hostinger's CDN (`hcdn`) fronts the site across multiple edge nodes. The deploy workflow
  calls `hosting_clearWebsiteCacheV1` after every deploy, but in practice that purge does not
  reliably reach every edge — this was confirmed (pre-migration, but the CDN behaviour itself
  hasn't changed) by hitting the same URL repeatedly and comparing
  `x-hcdn-request-id`/`x-hcdn-cache-status`/`Age` response headers.
- `.htaccess` sets `Cache-Control: no-cache, must-revalidate` on `.html` files only (see File
  map) — the admin/checkin shells always revalidate on load, while every hashed JS/CSS asset
  is safe to cache indefinitely, since a real change gives it a new filename rather than
  reusing the old one.
- When verifying a fix is live, don't trust one `curl` — an edge that already has a stale
  cached copy won't re-check the origin until that entry's own TTL expires, so hitting the
  same endpoint several times (or checking `x-hcdn-cache-status`) is the only way to tell
  "confirmed live everywhere" from "the one edge I happened to hit is fresh."

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
- Add TypeScript on top of the React port (`supabase gen types typescript`), now that the port
  itself is proven — deliberately left plain JS/JSX for the migration itself, so it stayed a
  mechanical translation rather than also introducing a type system's worth of new risk.
