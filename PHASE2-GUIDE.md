# Next Steps Platform — Phase 2 Upgrade
### Rig Church Lagos · what's new and how to switch on

Phase 2 is a **file replacement, not a rebuild**. Your database, your logins, and every record from Phase 1 stay exactly as they are. No SQL to run.

---

## What's new

**In the app the moment you upload (no setup):**

1. **Edit records in the app** — In People, the director now sees Edit details, Record a check-in (backfill a Sunday someone's phone missed), and Delete (for test entries and duplicates). No more going into Supabase to fix a typo'd phone number.
2. **Membership countdown** — People who complete all 4 steps show a live "Membership window · Xd left" badge. When the 30 days pass, the badge turns green ("Ready ✓") and a **Welcome as member** button appears — with a reminder on screen that the public welcome is a leadership decision, per the SOP. Recording it stamps their "Member since" date.
3. **Session videos on the TV** — Paste each step's YouTube or Vimeo link into `config.js` and the video plays inside Session Mode, right above the QR code. One screen runs the whole session.
4. **One-tap follow-up** — "Send on WhatsApp" now opens the chat *and* logs it as sent in a single tap. Sunday-night follow-up for 10 people is now 10 taps.
5. **Send the weekly report on WhatsApp** — A new button in Reports composes the five-point report as a WhatsApp message to your leader. Put your leader's number in `config.js` (`LEADER_WHATSAPP`) and it goes straight to their chat.

**Optional automation add-ons (need one-time setup, instructions below):**

6. **Auto-emailed weekly report** — the report emails itself to leadership the moment you end a session.
7. **Fully automated WhatsApp follow-ups** — messages send themselves on a schedule through the official WhatsApp Business (Cloud) API, no tapping at all.

---

## Upgrading (10 minutes)

1. **Update `config.js` — carefully.** Open the *new* `config.js` and paste in your two keys (`SUPABASE_URL` and `SUPABASE_ANON_KEY`) **from your current live `config.js`**. Then fill the new settings:
   - `STEPS[..].url` — the video link for each step (YouTube unlisted links work well).
   - `LEADER_WHATSAPP` — your leader's number, e.g. `"0803 000 0000"`.
   - Leave `EMAIL_REPORTS: false` for now.
2. **Upload** the new `admin/index.html` and your merged `config.js` to the subdomain folder in Hostinger File Manager, overwriting the old ones. `index.html` (the visitor form) is unchanged — no need to touch it.
3. **Test:** open the admin app, go to People, tap a row — you should see the new edit buttons. Open Session Mode — if you added a video link, it plays.

That's the whole upgrade. The add-ons below are optional and can be done any time.

---

## Add-on A — Auto-email the weekly report (~20 min)

Uses **Resend** (resend.com), a simple email service with a free tier (100 emails/day — you need 1 a week).

1. Create a free account at **resend.com** and get an **API key**. For the most professional result, verify your `rigchurchlagos.org` domain in Resend (they show you the DNS records to add in Hostinger → Domains → DNS); otherwise you can start immediately with their built-in sending address.
2. Install the Supabase CLI on any computer (one-time): instructions at supabase.com/docs/guides/cli. Then in this project folder run:
   ```
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   supabase functions deploy email-report
   ```
3. In Supabase → **Edge Functions → Secrets**, add:
   - `RESEND_API_KEY` — from step 1
   - `REPORT_FROM` — e.g. `Next Steps <nextsteps@rigchurchlagos.org>` (or Resend's default address)
   - `REPORT_RECIPIENTS` — comma-separated leadership emails
4. In `config.js`, set `EMAIL_REPORTS: true` and re-upload it.

From then on, ending a session emails the report automatically. If the email ever fails, the app tells you and the report is still there to send manually.

---

## Add-on B — Fully automated WhatsApp follow-ups (~1–2 hrs, one-time)

This is the "messages send themselves" upgrade. It uses Meta's **official WhatsApp Business (Cloud) API** — the compliant route; unofficial auto-senders risk the church's number being banned. It's more setup than Add-on A, so many churches happily stay with the one-tap flow. Honest picture of what's involved:

1. **Meta setup:** create a Meta developer account (developers.facebook.com), create an app, add the **WhatsApp** product, and connect a phone number for the church (this number becomes API-only — use a dedicated number, not the director's personal one). Generate a **permanent access token** via a system user, and note the **Phone Number ID**.
2. **Template approval:** business-initiated WhatsApp messages must use pre-approved templates. In WhatsApp Manager, create a template named `next_steps_followup`, language **English** (plain `en`, not English (US) — the function sends `en` and a mismatch fails with error 132001), category **Marketing**, body (must match `MSG_ATTENDED` in `src/config/site.js` word for word):
   > *Hi {{1}}, this is Rig Church Lagos. We are glad you joined us at Next Steps today. We really hope you enjoyed your time with us, and we would love to see you again soon. Have a wonderful week!*
   
   Meta's classifier rejects this copy as Utility: Utility means transactional, about an existing order or account, and a warm "glad you joined us" note is not that. Marketing is the honest category. It costs more per message and expects people to have been told they'll be messaged, which is why the check-in form now says so above the phone field. Keep that line if the copy stays Marketing.

   Approval usually takes minutes to a day.
3. **Deploy the function:**
   ```
   supabase functions deploy send-followups --no-verify-jwt
   ```
4. **Secrets** (Supabase → Edge Functions → Secrets): `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`.
5. **Schedule it:** in Supabase → **Edge Functions → send-followups → Schedules** (or Integrations → Cron), add a schedule of `0 17 * * 0` — that's every Sunday at 17:00 UTC = **6pm Lagos time**, after the service. Add a second run `0 8 * * 1` (Monday 9am Lagos) as a safety sweep.

The function only auto-sends follow-ups created in the last 48 hours; anything it can't deliver stays visible in the app's Follow-Up queue for the human touch. Meta's free tier comfortably covers this volume (service conversations at this scale are effectively free; check current Meta pricing).

**Costs:** Resend free tier — ₦0. Supabase — still free tier. WhatsApp Cloud API is billed per message in USD, by category and country: check Meta's current **Marketing** rate for **Nigeria** and multiply by roughly 87 (20 a week). Small at this volume, but not the near-zero a Utility template would have cost, and it's a recurring charge on a card, so it needs the director's sign-off.

---

## Add-on C — WhatsApp conversations inside the app (~1 hr, one-time)

Everything the church sends a newcomer now goes **from the church's own WhatsApp number**, and
their replies come back into the app, so nobody has to use a personal phone. Needs Add-on B's
Meta setup done first.

1. **Run the SQL.** Paste `supabase/upgrade-v13.sql` into Supabase → SQL Editor → Run. It adds
   `whatsapp_messages` and `wa_window_open()`.
2. **Deploy both functions:**
   ```
   supabase functions deploy whatsapp-webhook --no-verify-jwt
   supabase functions deploy whatsapp-send
   ```
   The webhook takes no JWT because Meta calls it with no session; it authenticates by checking
   Meta's signature instead. `whatsapp-send` keeps JWT verification precisely because it is
   called from the browser.
3. **Two more secrets** (Supabase → Edge Functions → Secrets):
   - `WHATSAPP_VERIFY_TOKEN` — any random string you invent; you type the same one into Meta.
   - `WHATSAPP_APP_SECRET` — Meta → App settings → Basic → App secret.
4. **Register the webhook.** Meta app → WhatsApp → Configuration:
   - Callback URL: `https://<project-ref>.supabase.co/functions/v1/whatsapp-webhook`
   - Verify token: the string from step 3
   - Click **Verify and save**, then **Manage** and subscribe to the **messages** field. Without
     that subscription Meta accepts the URL and then never sends anything to it.
5. **Flip the app to Live** (toggle at the top of the Meta app dashboard). Production webhooks
   are not delivered while the app is in Development mode.

**The 24-hour rule, which shapes the whole feature:** WhatsApp only allows free-form messages
within 24 hours of the person's last inbound message. Outside that window, only approved
templates. So the chat's compose box is live once someone has replied, and until then the only
thing staff can send is the approved template. This is enforced in `whatsapp-send`, not just in
the UI.

**Only the attended message has an approved template.** The completion and no-show messages say
different things, and Meta approves each wording separately. Get each one approved in WhatsApp
Manager and set `WHATSAPP_TEMPLATE_COMPLETED` / `WHATSAPP_TEMPLATE_NOSHOW`. Until then those
buttons refuse with an on-screen explanation rather than sending the wrong words.

**What this changes for leadership accounts:** they used to be able to send a follow-up from
their own phone. Sending now happens from the church number through the database's rules, and
leaders are read-only, so they can read a conversation but not reply. Directors send; support
accounts send to the people they can already see.

---

## A note on the SOP boundaries (unchanged)

Even with Phase 2's new powers, the guardrails hold: leadership accounts still cannot edit anything (the database enforces it), house church *placement* still lives with the overseer, and "Welcome as member" only records what leadership has already decided — the button literally says so on screen.
