# Next Steps Platform — Setup Guide
### Rig Church Lagos · from zero to live in about 45 minutes

This guide takes you from the files in this folder to a live check-in system at **nextsteps.rigchurchlagos.org**. No coding needed — just careful copy-and-paste. Do the parts in order.

---

## What's in this folder

| File | What it is |
|---|---|
| `index.html` | The team app — director and leadership sign in here (served at the domain root) |
| `checkin/index.html` | The visitor check-in form (what the QR code opens) |
| `config.js` | The one file you edit — your keys and settings live here |
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

## Part 2 — Configure the app (~2 min)

Open `config.js` in any text editor (Notepad is fine) and fill in:

- `SUPABASE_URL` — the Project URL from Part 1, step 7
- `SUPABASE_ANON_KEY` — the anon public key
- `CHECKIN_URL` — leave as `https://nextsteps.rigchurchlagos.org/checkin` (or change if you choose a different subdomain)

You can also edit the follow-up message wording in the same file at any time. Save the file.

---

## Part 3 — Put it on Hostinger (~15 min)

1. Log in to **hPanel** → your hosting → **Domains → Subdomains**. Create the subdomain `nextsteps` under `rigchurchlagos.org`. Hostinger creates a folder for it (usually `public_html/nextsteps` or a separate directory it shows you) and issues a **free SSL certificate** automatically — this can take up to an hour, usually much less.
2. Open **Files → File Manager**, go into the subdomain's folder, and upload the contents of this folder keeping the structure:

```
(subdomain folder)/
   index.html
   config.js
   checkin/
      index.html
```

   Tip: zip the folder contents on your computer, upload the zip, then use File Manager's **Extract**.
3. Visit `https://nextsteps.rigchurchlagos.org` on your phone and sign in with the director's email and password — that's the team app. Then visit `https://nextsteps.rigchurchlagos.org/checkin` — the check-in form should load.

---

## Part 4 — First Sunday test run (~10 min, do this midweek)

1. In the team app, go to **Registration**, pick a step, press **Open today's session**. A live QR code appears — this exact screen is what you'll show on the TV.
2. Scan the QR with your own phone and check yourself in as a test visitor.
3. Watch yourself appear in **Arriving now** within a few seconds, and in **Today**.
4. Check **Follow-Up** — your test check-in is queued with a pre-written WhatsApp message. Tap **Send on WhatsApp** to see it open with the message ready, then **Mark sent**.
5. Press **End session & go to report** — the five-point weekly report is filled in. Try **Download PDF** and **Download attendance CSV**.
6. Clean up the test: in Supabase → **Table Editor → people**, delete your test row (everything connected to it is removed automatically).

---

## Running it on Sundays

- **Before service:** open the team app on the TV/laptop, go to Registration, open today's step. The QR stays on screen.
- **During:** people scan and check in on their own phones. Returning visitors are recognised by phone number and only pick the step — under 20 seconds.
- **Sunday night / Monday:** open **Follow-Up** on your phone. Send each WhatsApp message with one tap and mark it sent. Check the **No-shows** tab on Monday and work the call-first protocol.
- **Reporting:** the weekly report is ready the moment you end the session. Add your notes, download the PDF, send it to your leader.

---

## House rules built into the system (matching the SOP)

- Leadership accounts can see everything but **cannot edit** — the database enforces it, not just the screen.
- The app flags house church **interest**; placement stays with the overseer.
- The app tracks the one-month membership window after Step 4; the **public welcome remains a leadership decision**.
- Visitors never see anyone's data. The check-in form can only recognise a first name from a phone number — nothing else comes back.

## If something goes wrong

- **Form loads but check-in fails:** almost always a typo in `config.js` — re-copy both values from Supabase → Project Settings → API.
- **Can't sign in to admin:** reset the password in Supabase → Authentication → Users → (user) → Reset password.
- **QR works on wifi but not on data:** the SSL certificate may still be provisioning — give it an hour after creating the subdomain.
- **A visitor typed the wrong number:** director can fix it in Supabase → Table Editor → people (a proper edit screen in the app is on the Phase 2 list).

## What's next (Phase 2)

Automated WhatsApp sending, in-app editing of people records, embedded session videos in Registration, the one-month membership countdown notification, and email of the weekly report to leadership on session close.
