# CLAUDE.md — Next Steps Platform · Rig Church Lagos

## What this is
A check-in and follow-up platform for the "Next Steps" newcomer programme at Rig Church Lagos.
Visitors scan a QR code on Sundays and check in on their own phones (no login). Staff sign in
to a dashboard to run sessions, track each person's journey through 4 steps, send WhatsApp
follow-ups, and generate reports.

Since the redesign (29 Oct 2026) the admin app has three areas, each a sidebar group:
- **Next Steps**: Check-in, Videos, People, Reports, and **Messaging** (the automatic WhatsApp
  line only: what the church number sent, its delivery status, and replies).
- **Follow Up**: the human calls. Its own **Contacts** (welcome cards, group lists like Law
  school, and people Next Steps hands over), **Outcomes** (full create/edit/delete),
  Membership and House Church, plus a dashboard. Next Steps and Follow Up are different
  teams; people pass from one to the other.
- **Bible Study**: Tuesday teaching written up by series, with an admin Upload page.
The design was worked out on a claude.ai Design canvas ("Bible Study Tab"); `Shell.dc.html`
there is the reference for the sidebar and Follow Up pages, `TodayN.dc.html` for Today.

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
- `src/App.jsx` — admin shell: auth gate, grouped sidebar (a hamburger drawer on phones —
  the user explicitly rejected a phone bottom bar, don't bring one back), pane-switch state,
  wires the shared data hooks to each pane. `src/nav.jsx` defines the three groups and which
  role sees which page (`navFor(role)`).
- `src/checkin/CheckinApp.jsx` — the visitor check-in form, one self-contained component (own
  screen-by-screen state, offline queue via localStorage, kiosk mode via `?kiosk=1`).
- `src/pages/` — one file per admin pane. Next Steps: `Today` (nested rings, soft bars,
  "Needs you"; director/leader only), `SessionPane` (Check-in — QR + live arrivals),
  `VideosPage`, `People` (Next Steps people only: welcome-card contacts with no steps stay in
  Contacts), `Reports` (customizable fields via `app_settings.report_fields`, plus ad-hoc
  fields per session via `sessions.custom_fields`), `Messaging` (delivery log + replies +
  the three templates; replaced the old Follow-Up Centre and Messages panes). Follow Up:
  `FollowUpDashboard`, `Contacts`, `Outcomes`, `Membership`, `HouseChurch`. Bible Study:
  `BibleStudy` (series, then sessions, then one session), `BibleUpload` (director). `Team`
  (director only), `Profile`.
- `src/components/` — shared UI: `Modal` (the one generic modal, ~12 call sites, each owning
  its own form-field state instead of the old `getElementById(...).value`-at-save-time
  pattern), `Dialog` (the wider dialog with its own footer), `Card`/`CardHead`, `Badge`,
  `Avatar`, `BtnSm`/`Btn`, `NotesThread` (People's person view and the contact panel),
  `followup.jsx` (every Follow Up building block: `ContactPanel`, `OutcomeDialog` for log
  and edit, `DeleteOutcomeDialog`, `ContactFormDialog`, badges, `Stat`, `Chips`),
  `useContactDialogs.jsx` (one set of those dialogs per Follow Up page), `ImportContacts`
  (CSV import shaped around the church's follow-up sheet and its Call feedbacks sheet),
  `ChatPanel` (the in-app WhatsApp conversation), `Sidebar` (+ `MobileTopBar`), `Pane`,
  `Toast`, `VideoFallbackModal`.
- `src/hooks/` — `useAuth`, `useAppData` (people/session/session-feed, polled every 10s for
  non-support roles), `useFollowUpData` (`v_contacts`, `v_outcomes`, `staff_names()`; every
  role, polled), `useMessaging` (outbound/inbound WhatsApp, queued follow-ups, conversations;
  not for support), `useBibleStudy`, `useTodayData` (check-in dates and follow-ups behind
  Today's charts), `useReports`, `usePolling` (generic `setInterval` + `document.hidden`
  guard), `useToast`.
- `src/lib/` — `supabaseClient.js` (reads the `VITE_*` env vars), `phone.js` (`normPhoneJS`,
  kept in sync with the SQL `norm_phone()` function), `format.js`, `video.js`
  (`toEmbed`/`isDirectVideo` for the Videos pane's YouTube/Vimeo/direct-file players), `csv.js`,
  `whatsapp.js` (`sendWhatsApp`, the one door to the `whatsapp-send` function — it exists
  mainly because `functions.invoke()` reports every non-2xx as a generic FunctionsHttpError,
  and the message worth showing a human is in the response body, off `error.context`).
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
- `supabase/seed-bible-study.sql` — optional, idempotent: the Seven Churches series (8 sessions,
  Jul to Sep 2026) as written up on the design canvas. Run after v15.
- `supabase/upgrade-v3.sql` through `upgrade-v16.sql` — only for databases created from older
  schema versions; NOT needed on fresh installs
- `supabase/templates/` — the branded auth emails GoTrue sends: `reset-password.html`
  (forgot-password link) and `invite.html` (new staff member's first sign in). Same shell as
  each other and as the report email's cream logo banner, so all three read as one system:
  table-based layout, inline styles only, `Arial` (webfonts don't survive most mail clients),
  brand hexes hardcoded because an email can't reach `theme.css`. The WhatsApp reply alert
  (`functions/whatsapp-webhook/email.ts`) uses the same shell, so all of them read as one
  system; keep the three in step. That one escapes the message body, since it is text a
  newcomer wrote going straight into HTML. `config.toml`'s
  `[auth.email.template.*]` wiring only affects the LOCAL stack, so a hosted project needs the
  same HTML pasted into Dashboard → Authentication → Emails (or pushed with
  `supabase config push`); keep the two in step whenever a template changes.
- `supabase/functions/email-report` — optional Edge Function: emails weekly report via Resend.
  Field selection and order matches `app_settings.report_fields` (see below) — same report,
  same customization, whether viewed on screen or emailed.
- `supabase/functions/send-followups` — the Sunday 4pm message (org decision, 12 Oct 2026):
  sends the attended template to everyone who checked in THAT DAY (Lagos date) and is still
  pending, records each in `whatsapp_messages` like `whatsapp-send` does, marks the followup
  sent. Idempotent (someone already sent today's template is marked sent and skipped), leaves
  anyone who just completed all 4 for a person unless `WHATSAPP_TEMPLATE_COMPLETED` exists,
  never touches older pending rows. Accepts only the service role key (or `CRON_SECRET` via
  `x-cron-secret`) because the anon key is public and this messages newcomers. `?dry=1`
  previews. Scheduled by `supabase/schedule-sunday-followups.sql` (pg_cron + Vault, 0 15 * * 0
  = 16:00 Lagos, no DST). The wording lives in `_shared/messages.ts`, a deliberate copy of
  `src/config/site.js` because a function cannot import from `src/`: keep the two identical.
- `supabase/functions/_shared/` — `email.ts` (the one email shell: banner, arch, CTA, plus
  `quote`/`section` blocks) and `mailer.ts` (SMTP send). Two audiences, deliberately separate:
  `NOTIFY_EMAILS` is operational (someone is waiting on a reply now) and `DIGEST_EMAILS` is
  leadership's Monday picture. The digest falls back to `NOTIFY_EMAILS`, so an unset secret
  means "the same people as before" rather than a digest that silently goes nowhere. Shared so the church's emails can't
  drift into looking like three different senders. Port decides the TLS mode: 465 is implicit
  TLS, anything else STARTTLS, and Hostinger's 587/STARTTLS path fails inside denomailer
  ("invalid cmd" during the handshake), so 465 is the working setting.
- `supabase/functions/weekly-digest` — optional Edge Function: the Monday 06:00 Lagos email of
  what's waiting (unanswered conversations, the To send queue, who completed Next Steps, whose
  membership window has passed, house church waiting on placement, no-shows). It only ever
  REPORTS: recording membership and placing someone in a house church stay human decisions, so
  it names who is waiting and never moves anyone. Sends nothing at all on a quiet week.
- `supabase/functions/whatsapp-send` + `whatsapp-webhook` — the two halves of the in-app
  WhatsApp chat (see "WhatsApp" below). `-send` is called from the browser by a signed-in
  staff member and does the authorisation itself (director only; support and leader never,
  see "Follow Up has no WhatsApp access" below); `-webhook` is called by Meta with no session, so
  it deploys `--no-verify-jwt` and authenticates by verifying Meta's `X-Hub-Signature-256`
  against `WHATSAPP_APP_SECRET` instead. It fails closed: no app secret configured means every
  POST is rejected, because the alternative is a public endpoint anyone can post fabricated
  newcomer messages into.
- `supabase/functions/manage-staff` — powers the Team pane (director-only): invite, remove, or
  re-role staff without hand-running SQL. **Invites create the account with a generated
  password and email it with the sign-in link through the church's SMTP** (org decision,
  12 Oct 2026): the GoTrue magic-link invite kept tripping people up (expired links, wrong
  browser, wrong inbox), so `supabase/templates/invite.html` is no longer what new staff
  receive. The director always sees the password too, in a "Sign-in details" box with a
  copy button, whether or not the email went out (so it can be read out over the phone); if
  SMTP is unset or the send fails the box says so and the account still exists. Passwords are 12 look-alike-free characters in three groups, crypto-random. Deploy it (`supabase functions deploy manage-staff`)
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
  never chased. Outcomes are logged after the fact in `public.outcomes` (one row per call,
  credited to whoever made it). Triggers keep the rest in step: logging one closes the
  person's open follow-up and writes the matching person_note; editing it rewrites both;
  deleting it removes the note and reopens the follow-up. `followups.outcome` is still
  written (other code and the Monday digest read it) but `outcomes` is the record.
- Follow Up's contacts are rows in the SAME `people` table, with `source` ('next_steps',
  'welcome_card', 'group', 'referral'), so a welcome-card visitor who later scans the QR code
  stays one person. `phone` is nullable for them (a card may only have an email); a check
  constraint still requires phone or email.

## Security model (RLS — enforced in the database, never trust the client)
Three staff roles, checked by `public.is_director()` / `is_leader()` / `is_support()`:
- **director** (full admin): all writes to people/sessions/checkins/followups, including
  editing or deleting existing records (not just inserting) — the UI exposes this in People
  (edit check-ins) and Reports (edit/delete a session). Can edit or delete any note.
- **leader** (read-only): sees everyone, same as director, but cannot write to
  people/sessions/checkins/followups. Can add a note on anyone (`person_notes` INSERT, any
  staff, `author_id = auth.uid()` enforced) and edit/delete only their own notes.
- **support** (shown in the UI as **Follow Up**; technical name unchanged): sees ONLY people
  matching `public.support_visible_person()` — house church interest, the post-4-step
  membership pipeline, an open follow-up (a pending message, one sent with no outcome yet, or
  a no-show), and since v15 any contact not from Next Steps, anyone assigned a caller, and
  anyone handed over from a reply. Its whole UI is the Follow Up group. It reads through
  `v_contacts` and `v_outcomes` (not security_invoker; the WHERE clause is the gate), writes
  contacts only through `add_contact()`, `update_contact()` and `take_contact()` (security
  definer, re-checking visibility), and may insert outcomes as itself and edit/delete only the
  outcomes it logged (`outcomes` RLS). Import, assigning callers, recording membership and
  house church placement are director-only. The older notes below on `v_support_people` still
  hold for the Edge Functions, which read it; the UI no longer does. No direct table access to
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
- The no-show rule (1-3 steps done, not seen since last Sunday) lives in SQL in three places:
  `support_visible_person()`, `v_support_people` (kept for the Edge Functions) and
  `v_contacts`' reason/waiting columns — keep them in sync if it changes.

## WhatsApp (Cloud API)
- **Everything to a newcomer goes from the church's own number**, not from whoever tapped the
  button (org decision, 16 Sep 2026). `wa.me` links are gone from Follow-Up and the Support
  pages. The one deliberate survivor is Reports' "Send to leader" — that is staff messaging
  staff, not the church messaging a newcomer.
- **Consequence: leaders can no longer send.** They could before, from their own phone. The
  church number is written to through the database's own rules, and leaders are read-only, so
  the Send buttons are director-only now.
- **Follow Up has no WhatsApp access, for any reason** (org decision, 29 Oct 2026, replacing
  the 12 Oct one that gave support its own Messages page and a scoped send). The line belongs
  to Next Steps. Support cannot read `whatsapp_messages` (RLS), mark read (`wa_mark_read`),
  or send (`whatsapp-send` refuses it); the UI gives it no Messaging, no chat, no Send. It
  still sees that a message FAILED (`v_contacts.reason = 'failed'`), because that is how Next
  Steps hands someone over for a call, but `failed_error` is null for it. Don't give the Follow
  Up group a chat or a Messages page back.
- **The 24-hour customer service window** is the rule that shapes all of this. WhatsApp only
  permits free-form business messages within 24 hours of the person's last inbound message;
  outside it, only pre-approved templates. Encoded in three places on purpose:
  `wa_window_open()` in SQL, a refusal in `whatsapp-send`, and the greyed-out compose box in
  `ChatPanel`. The UI copy is a courtesy; the function is what keeps us compliant.
- **One approved template per wording.** Meta approves each set of words separately, so
  `MSG_ATTENDED`, `MSG_COMPLETED` and `MSG_NOSHOW` each need their own. Only the attended one
  (`next_steps_followup`) exists; the other two are refused with a clear on-screen message
  until `WHATSAPP_TEMPLATE_COMPLETED` / `WHATSAPP_TEMPLATE_NOSHOW` are set, rather than
  quietly sending the wrong words.
- **`MSG_ATTENDED` must stay word for word identical to the approved template.** If it drifts,
  the chat shows people something they never received.
- Meta classifies the follow-up copy as **Marketing**, not Utility: Utility means
  transactional, about an existing order or account. Marketing costs more per message and
  expects people to have been told they'll be messaged, which is why the check-in form says so
  above the phone field. That line is a condition of the category, not decoration.
- **Unread is shared across staff, not per person** (org decision, 17 Sep 2026). One church
  inbox: whoever opens a conversation marks it read for everybody. Per-user unread was
  considered and rejected, because it lets two people answer the same newcomer without either
  realising. Staff have no UPDATE on the table, so `ChatPanel` clears it through the
  `wa_mark_read()` RPC, which re-checks visibility itself rather than trusting the caller.
- **Messaging's Replies tab exists because conversations outlive the follow-up lifecycle.**
  (It was the Messages pane until the 29 Oct 2026 redesign.) A reply that needs a person is
  passed to Follow Up with "Pass to Follow Up" (`people.handed_over_at`), which puts them in
  Contacts as waiting. Once an
  outcome is logged a person drops off Follow-Up's lists, so before this pane a reply from
  them landed in the database and was seen by nobody. `v_wa_conversations` is keyed on
  person_id, falling back to phone, so a message from a number not on file is still visible
  rather than orphaned. Since 12 Oct 2026 the pane lists EVERYONE on file, like a WhatsApp
  contact list, with a search box: conversations first by latest activity, then a "Not
  messaged yet" section by name, so a chat can be started with anyone from one place.
  Messaging is director/leader only; Follow Up has no access (see above).
- The read-only banner is leader-only. Support is not read-only (it adds contacts and logs
  outcomes), so showing it there was misleading and it was removed from that view.
- **Email alerts go through the church's own SMTP**, not Resend (the account already exists for
  `info@rigchurchlagos.org`). One email per conversation that needs attention, not one per
  message: only the message that takes a conversation from nothing-unread to something-unread
  sends one. With `SMTP_HOST` unset, email is skipped silently, and the in-app badge is the
  source of truth either way. Email is a convenience, never the record.
- `whatsapp_messages` is written **only** by the two Edge Functions (service_role). Staff read
  it and never insert, which is why there is no INSERT policy for `authenticated`. `person_id`
  is nullable so a message from an unknown number is kept rather than dropped; those rows are
  visible to director/leader only, never support.

## Notifications
- **Deliberately not a notifications centre** (decision, 17 Sep 2026). A bell and a feed would
  be a second inbox to read, clear and eventually ignore, and it would mostly duplicate the two
  badges that already sit on the panes you'd click anyway. What was actually missing was the
  time-based milestones, which nothing surfaced: the 30-day membership window opening, that
  window elapsing, house-church-eligible people waiting on the overseer. `weekly-digest` covers
  those, and it arrives on a Monday morning, when the follow-up work actually happens.
- The in-app badges are the live signal (Follow-Up's queue, Messages' unread conversations);
  email is the nudge for people who aren't in the app that day. Neither is the record.

## Brand & UI conventions
- Colours from the logo: orange `#F25125`, charcoal `#454B59` / `#313743`, cream `#EFEBE2`.
  All design tokens live in `src/theme.css`'s `@theme` block — use the Tailwind utility
  (`bg-orange`, `text-ink-deep`, etc.), never a hardcoded hex.
- Fonts: Archivo (display 800/900, tight tracking) + IBM Plex Mono for labels/data.
- Signature motif: the arch shape (`rounded-arch`, `border-radius: 999px 999px 12px 12px`)
  from the logo — reserved for the four Next Steps steps (step markers, the "all four done"
  pips, the QR centre). The user asked for it NOT to be reused for anything else (numbered
  lists, Follow Up icons, date tiles): use circles or rounded squares there instead.
- Tone of copy: warm, confident, never corporate ("You belong here."). British/Nigerian
  spelling. Dates day-month-year. No em dashes in church-facing copy.
- Everything must work well at 390px wide (most users are on phones); admin uses a top bar
  with a hamburger that opens the sidebar as a drawer under the `mobile` breakpoint (760px) and a two-column-to-one collapse under `tablet`
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
- Real-browser checks: `puppeteer-core` driving the machine's own Edge
  (`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`) against `npm run dev` +
  the local stack works well for screenshots and overflow checks (compare
  `document.documentElement.scrollWidth` to `clientWidth`); no browser download needed. Wait
  for sign-in by watching for "Sign out" in the body text, NOT for the password input to
  disappear: Profile's change-password fields are always mounted.
- `<main>` must keep `min-w-0`: without it an unbreakable string (a long URL in a message
  preview) widens the whole admin column past the viewport, found 12 Oct 2026.
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
- `keepalive.yml` (Wednesday and Saturday, plus manual dispatch): pings the anon-callable
  `lookup_person` RPC with a phone that matches nobody, so the hosted Supabase project never
  goes 7 days without API activity (the free tier auto-pauses after that, which would break the
  Sunday QR check-in until someone restored it by hand). Read-only, creates nothing. Upgrading
  the project to Pro is the only way to switch auto-pausing off outright; this is the free
  alternative. GitHub disables scheduled workflows after 60 days with no commits, so re-enable
  it from the Actions tab if the repo goes quiet.
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
- Auto-email weekly report (function exists; needs Resend setup)
- Gated video catch-up for people who miss a Sunday (admin-unlocked only)
- Add TypeScript on top of the React port (`supabase gen types typescript`), now that the port
  itself is proven — deliberately left plain JS/JSX for the migration itself, so it stayed a
  mechanical translation rather than also introducing a type system's worth of new risk.
