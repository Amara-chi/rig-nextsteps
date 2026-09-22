// ============================================================
// OPTIONAL ADD-ON · weekly-digest
// The Monday morning picture: what needs doing this week, in one email,
// to whoever is in NOTIFY_EMAILS.
//
// It exists because the milestones in the SOP are time-based and nothing
// surfaces them. Someone finishing their fourth step opens a 30-day
// membership window; that window elapsing makes them membership_ready;
// house church interest plus four steps means the overseer should hear
// about them. All three currently depend on a staff member remembering to
// open the Support pages and look. This tells them instead.
//
// It only ever REPORTS. Nothing here decides anything: recording
// membership stays a human decision (see the SOP), and house church
// placement belongs to the overseer. The email says who is waiting, never
// that anyone has been moved.
//
// Deploy without JWT verification, since the scheduler calls it with no
// session:
//   supabase functions deploy weekly-digest --no-verify-jwt
// Then schedule it for Monday 06:00 Lagos: 0 5 * * 1
// Secrets: the SMTP_* set, DIGEST_EMAILS (leadership; falls back to
//          NOTIFY_EMAILS if unset), APP_URL (optional)
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { section, shell, stats } from "../_shared/email.ts";
import { recipients, sendMail } from "../_shared/mailer.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// How far back someone can have last attended and still count as this
// week's no-show. Without a floor the rule ("1-3 steps, not seen since last
// Sunday") never lets anyone go: someone who came once in March is still on
// the list every Monday forever, and 42 names is a list nobody reads.
// Pastoral call, not a technical one — change it if leadership wants to.
const NOSHOW_WEEKS = 4;

const dmy = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

Deno.serve(async () => {
  const appUrl = Deno.env.get("APP_URL") ?? "https://nextsteps.rigchurchlagos.org";
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);

  const { data: people } = await admin
    .from("v_people_progress")
    .select("id, full_name, steps_done, milestone, hc_interest, hc_eligible, completed_on, last_seen")
    .limit(2000);
  const all = people ?? [];

  // Finished all four in the last week. Their 30-day membership window is
  // now open, which is the thing leadership acts on.
  const completed = all
    .filter((p) => p.steps_done === 4 && p.completed_on && p.completed_on >= weekAgo)
    .map((p) => `${p.full_name} — finished ${dmy(p.completed_on)}`);

  // Window elapsed and still not recorded as a member. The app must never
  // decide this, only point at it.
  const ready = all
    .filter((p) => p.milestone === "membership_ready")
    .map((p) => `${p.full_name} — eligible since ${dmy(p.completed_on)}`);

  // Interested in a house church and through all four steps. Placement is
  // the overseer's call; this is only the waiting list.
  const houseChurch = all
    .filter((p) => p.hc_interest && p.hc_eligible)
    .map((p) => p.full_name);

  // Same no-show rule as support_visible_person() and useFollowUp: 1-3
  // steps done, not seen since last Sunday.
  const now = new Date();
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - now.getDay());
  const floor = new Date(now.getTime() - NOSHOW_WEEKS * 7 * 864e5);
  const noshows = all
    .filter((p) => p.steps_done > 0 && p.steps_done < 4 && p.last_seen)
    .filter((p) => new Date(p.last_seen) < lastSunday && new Date(p.last_seen) >= floor)
    .sort((a, b) => (a.last_seen < b.last_seen ? 1 : -1))
    .map((p) => `${p.full_name} — ${p.steps_done} of 4, last seen ${dmy(p.last_seen)}`);

  const { count: toSend } = await admin
    .from("followups").select("id", { count: "exact", head: true })
    .eq("type", "attended").eq("status", "pending");

  const { data: convos } = await admin
    .from("v_wa_conversations").select("full_name, phone, unread").gt("unread", 0);
  const unanswered = (convos ?? []).map((c) => `${c.full_name || c.phone} — ${c.unread} unread`);

  const counts = [unanswered.length, toSend ?? 0, completed.length, ready.length, houseChurch.length, noshows.length];
  if (counts.every((n) => n === 0)) {
    return json({ ok: true, skipped: "nothing to report" });
  }

  // Numbers first, names second. The strip answers "is there anything for
  // me this week" without scrolling; the lists below are capped so the
  // email stays glanceable and the app stays the place you go for the rest.
  const body = stats([
    { label: "Waiting on a reply", n: unanswered.length },
    { label: "Follow-ups to send", n: toSend ?? 0 },
    { label: "Completed Next Steps", n: completed.length },
    { label: "Membership window passed", n: ready.length },
    { label: "House church, awaiting placement", n: houseChurch.length },
    { label: `No-shows (last ${NOSHOW_WEEKS} weeks)`, n: noshows.length },
  ]) + [
    section("Waiting on a reply", unanswered),
    section("Completed Next Steps", completed),
    section("Membership window has passed", ready),
    section("House church, awaiting placement", houseChurch),
    section("No-shows, Monday protocol", noshows, 3),
  ].join("");

  const text = [
    unanswered.length ? `Waiting on a reply:\n${unanswered.join("\n")}` : "",
    toSend ? `Follow-ups still to send: ${toSend}` : "",
    completed.length ? `Completed Next Steps this week:\n${completed.join("\n")}` : "",
    ready.length ? `Membership window has passed:\n${ready.join("\n")}` : "",
    houseChurch.length ? `House church, waiting on placement:\n${houseChurch.join("\n")}` : "",
    noshows.length ? `No-shows:\n${noshows.join("\n")}` : "",
  ].filter(Boolean).join("\n\n") + `\n\nOpen the app: ${appUrl}\n`;

  const to = recipients("DIGEST_EMAILS", "NOTIFY_EMAILS");
  if (to.length === 0) return json({ ok: false, error: "neither DIGEST_EMAILS nor NOTIFY_EMAILS is set" }, 400);

  await sendMail({
    to,
    subject: `Next Steps — this week's follow-up`,
    text,
    html: shell({
      title: "This week's follow-up",
      preview: unanswered.length
        ? `${unanswered.length} conversation(s) waiting on a reply`
        : "This week's Next Steps follow-up",
      heading: "This week.",
      lead: "Where things stand on Monday morning. Full lists are in the app.",
      body,
      ctaHref: appUrl,
      ctaLabel: "Open the app",
      footnote: "Recording membership and placing someone in a house church stay human decisions. This only says who is waiting.",
    }),
  });

  return json({ ok: true, sections: counts });
});
