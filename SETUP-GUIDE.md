# Next Steps Platform — Setup Guide
### Rig Church Lagos · from zero to live in about 45 minutes

This guide takes you from the files in this folder to a live check-in system at **nextsteps.rigchurchlagos.org**. No coding needed — just careful copy-and-paste. Do the parts in order.

---

## What's in this folder

This is a React + Vite app (not plain files you edit directly and upload) — a GitHub Actions
pipeline builds and deploys it automatically every time a change is pushed to `main`.

| File | What it is |
|---|---|
| `src/` | All the actual app code (team app + visitor check-in form) |
| `.env.example` | Copy this to `.env.local` and fill in your Supabase keys, for running it on your own computer |
| `.github/workflows/deploy.yml` | The pipeline that builds the app and uploads it to Hostinger automatically |
| `supabase/schema.sql` | The database design — pasted into Supabase once |
| `SETUP-GUIDE.md` | This guide |

---

## Part 1 — Create the database (Supabase, ~15 min)

Supabase is the free service that stores your data and handles team logins. The check-in form and team app both talk to it.

1. Go to **supabase.com** and sign up (the free plan is all you need).
2. Click **New project**. Name it `rig-next-steps`, set a strong database password (save it somewhere safe — you rarely need it again), and pick region **West EU (Ireland)** or the closest available to Nigeria. Wait ~2 minutes for it to provision.
3. In the left menu open **SQL Editor**, click **New query**, then open `supabase/schema.sql` from this folder, copy **everything**, paste it in, and press **Run**. You should see "Success. No rows returned". Your entire database — tables, security rules, check-in functions — now exists.
4. Create the director's login: left menu → **Authentication → Users → Add user**. Enter the director's email and a password, and tick **Auto confirm user**.
5. Promote that login to director: back in **SQL Editor**, run this (replace the email):

```sql
update public.profiles set role = 'director', full_name = 'Next Steps Director'
where id = (select id from auth.users where email = 'director@rigchurchlagos.org');
```

6. Add leadership accounts the same way as step 4 (e.g. the house church overseer). **Don't** run the SQL for them — every new account is automatically read-only leadership. Only the director can edit records.

   For someone who only does house church, membership and follow-up outreach (not full leadership), promote them to **support** instead — they'll only see people in those three categories, not the full People list:
   ```sql
   update public.profiles set role = 'support', full_name = 'Their Name'
   where id = (select id from auth.users where email = 'their-email@example.com');
   ```
7. Get your two keys: left menu → **Project Settings → API**. Copy the **Project URL** and the **anon public** key. You'll paste them in Part 2.

> Security note: the anon key is designed to be public — it can only do what the database rules allow, which for visitors is exactly two things: look up a first name by phone number, and check in. It cannot read the contact list.

---

## Part 2 — Configure the app (~5 min, one-time, needs a technical person)

The keys from Part 1 aren't edited into a file anymore — they're stored as **GitHub repository
secrets**, and the app is built automatically from them every time it's deployed. This part
needs someone comfortable with GitHub; once it's done, it's done for good (you won't touch it
again for day-to-day running).

1. In the GitHub repository → **Settings → Secrets and variables → Actions**, add two
   repository secrets:
   - `SUPABASE_URL` — the Project URL from Part 1, step 7
   - `SUPABASE_ANON_KEY` — the anon public key
2. The follow-up message wording, church name, and step videos live in
   `src/config/site.js` (plain text, safe to edit — none of it is secret) instead of `config.js`.
3. If you ever want to run the app on your own computer to test a change: install
   [Node.js](https://nodejs.org), copy `.env.example` to `.env.local` and fill in the same two
   values, then run `npm install` followed by `npm run dev`.

---

## Part 3 — Put it on Hostinger (~15 min, one-time)

1. Log in to **hPanel** → your hosting → **Domains → Subdomains**. Create the subdomain `nextsteps` under `rigchurchlagos.org`. Hostinger creates a folder for it (usually `public_html/nextsteps` or a separate directory it shows you) and issues a **free SSL certificate** automatically — this can take up to an hour, usually much less.
2. As long as Part 2's GitHub secrets are set, every push to the repository's `main` branch
   automatically builds the app and uploads it to that Hostinger subdomain — check the
   **Actions** tab on GitHub to watch a deploy run (takes 1-2 minutes). There's nothing to
   upload by hand.
3. Visit `https://nextsteps.rigchurchlagos.org` on your phone and sign in with the director's email and password — that's the team app. Then visit `https://nextsteps.rigchurchlagos.org/checkin` — the check-in form should load.

---

## Part 4 — First Sunday test run (~10 min, do this midweek)

1. In the team app, go to **Check-in**, pick a step, press **Open today's session**. A live QR code appears — this exact screen is what you'll show on the TV.
2. Scan the QR with your own phone and check yourself in as a test visitor.
3. Watch yourself appear in **Arriving now** within a few seconds, and in **Today**.
4. Check **Follow-Up**, tab **To send** — your test check-in is queued with a pre-written WhatsApp message. Tap **Send on WhatsApp** to open it with the message ready (this also moves it to **Awaiting outcome** automatically).
5. Press **End session & go to report** — the weekly report is filled in. Try **Download PDF** and **Download attendance CSV**.
6. Clean up the test: in Supabase → **Table Editor → people**, delete your test row (everything connected to it is removed automatically).

---

## Running it on Sundays

- **Before service:** open the team app on the TV/laptop, go to Check-in, open today's step. The QR stays on screen.
- **During:** people scan and check in on their own phones. Returning visitors are recognised by phone number and only pick the step — under 20 seconds.
- **Sunday night / Monday:** open **Follow-Up** on your phone. Send each WhatsApp message with one tap from the **To send** tab, then log what happened from **Awaiting outcome**. Check the **No-shows — Monday protocol** tab and work the call-first protocol.
- **Reporting:** the weekly report is ready the moment you end the session. Add your notes, download the PDF, send it to your leader.

---

## House rules built into the system (matching the SOP)

- Leadership accounts can see everything but **cannot edit** — the database enforces it, not just the screen.
- The app flags house church **interest**; placement stays with the overseer.
- The app tracks the one-month membership window after Step 4; the **public welcome remains a leadership decision**.
- Visitors never see anyone's data. The check-in form can only recognise a first name from a phone number — nothing else comes back.

## If something goes wrong

- **Form loads but check-in fails:** almost always a typo in the `SUPABASE_URL`/`SUPABASE_ANON_KEY` GitHub secrets — re-copy both values from Supabase → Project Settings → API, then re-run the deploy from the Actions tab.
- **Can't sign in to admin:** reset the password in Supabase → Authentication → Users → (user) → Reset password.
- **QR works on wifi but not on data:** the SSL certificate may still be provisioning — give it an hour after creating the subdomain.
- **A visitor typed the wrong number:** director can fix it directly in the People page (tap the person, edit their check-in).

## What's next

Automated WhatsApp sending via the Meta Cloud API and auto-emailing the weekly report both have
the server-side pieces already built (see `supabase/functions/`) but need one-time setup with
those services — see `CLAUDE.md`'s Roadmap section for the current list of what's built vs.
what's still a candidate.
