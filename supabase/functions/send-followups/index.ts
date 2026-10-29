// ============================================================
// send-followups · the Sunday 4pm message
// Sends the follow-up message to everyone who came to Next Steps TODAY
// and has not been messaged yet, from the church's WhatsApp number, and
// records each one in whatsapp_messages so the chat shows it. Meant to
// run on a schedule every Sunday at 16:00 Lagos (org decision, 12 Oct
// 2026); nobody has to tap through the To send queue by hand any more,
// though the queue still works for anything this run leaves behind.
//
// What it will NOT do:
//   - message anyone who did not check in today (Lagos date). Older
//     pending rows stay in To send for a person to decide about.
//   - message the same person twice. A person already sent today's
//     template (by this run or by a staff member tapping Send) is marked
//     sent and skipped, so a second run, or a retry, is harmless.
//   - send the completion message unless its own approved template
//     exists (WHATSAPP_TEMPLATE_COMPLETED). Someone who has just finished
//     all four steps gets different words, and without that template
//     they stay in To send for a human rather than getting the wrong ones.
//
// Deploy with JWT verification ON (the default):
//   supabase functions deploy send-followups
// and call it with the service role key as the bearer token, which is
// what supabase/schedule-sunday-followups.sql sets up. The anon key is
// public and is NOT accepted: this function messages newcomers, so only
// the scheduler (or a director using the service key) may trigger it.
// CRON_SECRET is an optional second door for schedulers that cannot hold
// the service key: send it as the x-cron-secret header.
//
// GET or POST. ?dry=1 reports who would be messaged without sending.
//
// Secrets (same as whatsapp-send): WHATSAPP_TOKEN, WHATSAPP_PHONE_ID,
// WHATSAPP_TEMPLATE (optional, defaults to next_steps_followup),
// WHATSAPP_TEMPLATE_COMPLETED (optional), CRON_SECRET (optional).
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { fillMsg, MSG_ATTENDED, MSG_COMPLETED } from "../_shared/messages.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// Today's date in Lagos, as YYYY-MM-DD. Lagos has no daylight saving, so
// "today" is simply UTC+1 and a 16:00 run never straddles midnight.
const lagosToday = () => new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 10);

// Is this bearer a service-level key? A string compare against the env var
// is not enough on its own: a project that has opted into Supabase's newer
// API keys gets the sb_secret_ form injected as SUPABASE_SERVICE_ROLE_KEY,
// while the scheduler has to send the legacy JWT (the gateway's JWT check
// rejects anything else). So after the cheap compare, ask Auth's admin
// endpoint, which only a service-level credential can open.
async function isServiceKey(bearer: string, serviceKey: string) {
  if (!bearer) return false;
  if (bearer === serviceKey) return true;
  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users?per_page=1`, {
    headers: { apikey: bearer, Authorization: `Bearer ${bearer}` },
  });
  return r.ok;
}

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authorised = (!!cronSecret && req.headers.get("x-cron-secret") === cronSecret) ||
    await isServiceKey(bearer, serviceKey);
  if (!authorised) return json({ ok: false, error: "not allowed" }, 403);

  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const today = lagosToday();

  // Everyone who checked in today and still has their follow-up pending.
  const { data: pending, error } = await admin
    .from("followups")
    .select("id, person_id, checkins!inner(checkin_date, step), people!inner(id, full_name, phone)")
    .eq("type", "attended").eq("status", "pending")
    .eq("checkins.checkin_date", today)
    .limit(200);
  if (error) return json({ ok: false, error: error.message }, 500);

  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_ID");
  const attendedTemplate = Deno.env.get("WHATSAPP_TEMPLATE") ?? "next_steps_followup";
  const completedTemplate = Deno.env.get("WHATSAPP_TEMPLATE_COMPLETED") || null;
  if (!dry && (!token || !phoneId)) {
    return json({ ok: false, error: "WHATSAPP_TOKEN / WHATSAPP_PHONE_ID not set" }, 500);
  }

  const report = { date: today, dry, pending: (pending ?? []).length, sent: 0, already: 0, skipped: 0, failed: 0, would_send: [] as string[], left_for_a_person: [] as string[] };

  for (const f of pending ?? []) {
    const person = f.people as unknown as { id: string; full_name: string; phone: string };
    const first = (person.full_name ?? "").split(" ")[0];
    if (!person.phone) { report.skipped++; continue; }

    // Finished all four today? Then the completion words, if we have them.
    const { data: steps } = await admin.from("checkins").select("step").eq("person_id", person.id);
    const stepsDone = new Set((steps ?? []).map((s) => s.step)).size;
    const completed = stepsDone >= 4;
    const template = completed ? completedTemplate : attendedTemplate;
    if (!template) {
      // Nothing approved to send; a person decides from the To send queue.
      report.left_for_a_person.push(person.full_name);
      continue;
    }
    const body = fillMsg(completed ? MSG_COMPLETED : MSG_ATTENDED, first);

    // Already messaged today (a staff member tapped Send, or this ran
    // before and the status update didn't land)? Mark sent, don't resend.
    const { data: dup } = await admin
      .from("whatsapp_messages").select("id")
      .eq("person_id", person.id).eq("direction", "out").eq("template_name", template)
      .gte("created_at", `${today}T00:00:00+01:00`).limit(1);
    if (dup && dup.length > 0) {
      if (!dry) await admin.from("followups").update({ status: "sent", updated_at: new Date().toISOString() }).eq("id", f.id);
      report.already++;
      continue;
    }

    if (dry) { report.would_send.push(person.full_name); continue; }

    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: person.phone,
        type: "template",
        template: {
          name: template,
          language: { code: "en" },
          components: [{ type: "body", parameters: [{ type: "text", text: first }] }],
        },
      }),
    });
    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Recorded as a failed row, same as whatsapp-send, so the chat shows
      // that it never arrived; the followup stays pending for a person.
      await admin.from("whatsapp_messages").insert({
        person_id: person.id, phone: person.phone, direction: "out",
        body, template_name: template, status: "failed",
        error: result?.error?.message ?? `HTTP ${res.status}`,
      });
      report.failed++;
      continue;
    }

    await admin.from("whatsapp_messages").insert({
      person_id: person.id, phone: person.phone, direction: "out",
      wa_message_id: result?.messages?.[0]?.id ?? null,
      body, template_name: template, status: "sent",
    });
    await admin.from("followups").update({ status: "sent", updated_at: new Date().toISOString() }).eq("id", f.id);
    report.sent++;
  }

  console.log("send-followups:", JSON.stringify(report));
  return json({ ok: true, ...report });
});
