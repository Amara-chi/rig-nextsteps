# Next Steps Platform — v3 Update
### Rig Church Lagos · policy change + staff notes + kiosk mode

Three changes in this update. One small database script to run, two files to re-upload. All existing data is untouched.

---

## What changed

**1. House church eligibility now requires ALL 4 steps.**
Previously, completing Step 1 made someone house church eligible. Now the "HC eligible" flag only appears once a person has completed all four steps/videos. The dashboard stat, the person badges, and the database rule have all been updated together. (Recommended: update the same rule in your Next Steps Director SOP document so the paper and the platform agree.)

**2. Staff notes on every person.**
Open anyone in People and you'll find a notes thread: action points, prayer points, notes for the house church leader — anything worth other staff seeing. **Everyone signed in can read and add notes, including read-only leadership** (this is their one deliberate write permission — they still cannot edit records). Each note shows who wrote it and when. You can delete your own notes; the director can delete any. The database enforces all of this, including preventing anyone from posting a note under someone else's name.

**3. Kiosk mode for the dedicated laptop/tablet.**
For guests without a smartphone (the form already works on iPhone, Android, and any browser — nothing to install), set up your church device like this: open
`https://nextsteps.rigchurchlagos.org/?kiosk=1`
and leave it on the welcome screen. After each check-in, the confirmation screen automatically resets after a few seconds, ready for the next person — nobody has to touch it between guests. Tip: add it to the tablet's home screen and turn on the browser's fullscreen mode for a clean look.

---

## How to apply the update (10 minutes)

1. **Database:** Supabase → SQL Editor → paste the whole of `supabase/upgrade-v3.sql` → Run. ("Success. No rows returned.") This adds the notes table and switches the eligibility rule. Run it once.
2. **Files:** upload the new `admin/index.html` and `index.html` to your Hostinger subdomain folder, overwriting the old ones. `config.js` is unchanged in this update — leave yours as is.
3. **Check:** open the admin app → People → tap a row. You should see the notes section. Someone with fewer than 4 steps should no longer show an eligibility badge.

*Fresh installs don't need the upgrade script — the main `schema.sql` already includes everything.*
