// ============================================================
// OPTIONAL ADD-ON · send-followups
// Sends the pending follow-up messages automatically through
// the official WhatsApp Cloud API (Meta), then marks them sent.
// Run it on a schedule — e.g. every Sunday 6pm Lagos time —
// so nobody has to tap through the queue by hand.
//
// Requirements (see PHASE2-GUIDE.md):
//   - Meta developer account with WhatsApp Cloud API enabled
//   - An APPROVED message template named "next_steps_followup"
//     with two variables: {{1}} = first name, {{2}} = step number
//     (business-initiated WhatsApp messages must use templates)
// Secrets to set in Supabase > Edge Functions > Secrets:
//   WHATSAPP_TOKEN     - permanent system-user access token
//   WHATSAPP_PHONE_ID  - the sender phone number ID
//   WHATSAPP_TEMPLATE  - optional, defaults to "next_steps_followup"
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (_req) => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Only auto-send fresh follow-ups (last 48h) still pending.
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const { data: pending, error } = await admin
    .from("followups")
    .select("id, people(full_name, phone), checkins(step)")
    .eq("type", "attended").eq("status", "pending")
    .gte("created_at", since)
    .limit(100);
  if (error) return json({ ok: false, error: error.message }, 500);

  const token = Deno.env.get("WHATSAPP_TOKEN")!;
  const phoneId = Deno.env.get("WHATSAPP_PHONE_ID")!;
  const template = Deno.env.get("WHATSAPP_TEMPLATE") ?? "next_steps_followup";
  let sent = 0, failed = 0;

  for (const f of pending ?? []) {
    const first = (f.people?.full_name ?? "").split(" ")[0];
    const step = String(f.checkins?.step ?? "");
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: f.people?.phone,
          type: "template",
          template: {
            name: template,
            language: { code: "en" },
            components: [{
              type: "body",
              parameters: [
                { type: "text", text: first },
                { type: "text", text: step },
              ],
            }],
          },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await admin.from("followups")
        .update({ status: "sent", updated_at: new Date().toISOString() })
        .eq("id", f.id);
      sent++;
    } catch (_e) {
      failed++; // stays pending; the director sees it in the app
    }
  }
  return json({ ok: true, sent, failed, pending: (pending ?? []).length });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { "content-type": "application/json" },
  });
}
