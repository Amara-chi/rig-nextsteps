# Historical Import + Follow-Up Outcomes
### Rig Church Lagos · applying this update (~15 minutes)

## 1 · One-time database bits (Supabase → SQL Editor)

Run these two scripts, in this order, each once:

1. **`supabase/upgrade-v4.sql`** — adds the follow-up "outcome" field. (One line; instant.)
2. **`supabase/import-history.sql`** — loads your history: **27 people, their step progress (31 dated check-ins), and 36 notes** including every follow-up feedback entry from the March–April consolidated report, attributed and dated (e.g. "Follow-up by Jody, 12 Apr 2026: Messaged (WA); no response."). Safe to run twice — nothing duplicates. It ends with a verification query; you should see Christopher Mbukanma (membership READY), Victoria Onafeso (membership window), and Adeola & Fejiro on 3 of 4 steps.

Data-quality flags from the merge were imported as notes on the relevant people (the suspect nelsonmonday@17gmail.com email, the two staff-entered emails, the diaspora numbers), so they surface exactly where you'll act on them.

## 2 · Upload the new app file

Replace `admin/index.html` on your Hostinger subdomain. Nothing else changes.

## 3 · How follow-up updates now work

The Follow-Up Centre now runs in three stages, built for the reality that outcomes arrive Monday or later:

- **To send** — Sunday night's queue. One tap opens WhatsApp with the message ready and moves the person to…
- **Awaiting outcome** — they stay here for days if needed. When you hear back (or don't), tap **Log outcome**: choose what you did (message / called / texted / no response, door open) and write what happened. That text is saved on the follow-up record **and** as a note on the person — so "Prayed together, coming back for Step 4" is visible to every staff member, forever, with your name and the date on it.
- **No-shows** — the Monday protocol list, with the same Log outcome button.

Leadership accounts see all three tabs and can add notes on people; only the director moves items through the stages.

## Your imported history at a glance

| | |
|---|---|
| People | 27 |
| Check-ins with dates | 31 (Mar–Jul 2026) |
| Notes (incl. all old follow-up feedback) | 36 |
| Completed all 4 / HC eligible | Victoria Onafeso · Christopher Mbukanma |
| Membership READY (window passed) | Christopher Mbukanma |
| One step from completing | Adeola Adekoya (Step 4) · Fejiro Brume (Step 1) |

A few historical session dates are marked as estimates in the import (where the old form only said "steps attended before" without dates) — each such person carries an [Import] note saying so.
