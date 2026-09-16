// ============================================================
// OPTIONAL ADD-ON · whatsapp-send
// Sends one WhatsApp message from the church's Cloud API number, on
// behalf of the signed-in staff member, and records it in
// public.whatsapp_messages so it shows in the in-app chat.
//
// Deploy normally (JWT verification ON — this is called from the admin
// app by a signed-in staff member, and the access token must never be
// reachable from the browser):
//   supabase functions deploy whatsapp-send
//
// Body: { person_id, mode: "text" | "template", text?, template_key?, display_text? }
//   text     - free-form reply. Only allowed while the 24-hour customer
//              service window is open (see below).
//   template_key - "attended" (default), "completed" or "noshow", picking
//              which approved template to send. The three say different
//              things, and Meta approves each wording separately, so each
//              needs its own template. Only "attended" has a default; the
//              other two are refused with a clear message until their
//              template exists, rather than quietly sending the wrong words.
//   template - the approved next_steps_followup, {{1}} = first name.
//              Always allowed. Pass display_text as well: the same words
//              with [Name] filled in, from MSG_ATTENDED in config/site.js,
//              so the chat shows what the person actually received rather
//              than a "[template]" marker. site.js is the single source of
//              that copy; duplicating it here would be one more place for
//              it to drift out of step with the approved template.
//
// THE 24-HOUR WINDOW: WhatsApp only permits free-form business messages
// within 24 hours of the person's last inbound message. Outside it, only
// approved templates. The UI greys out its compose box, but the rule is
// enforced here too — a client that has been tampered with, or one that
// is simply stale by a few minutes, must not be able to burn the number's
// quality rating on messages Meta will reject.
//
// Secrets: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_TEMPLATE (optional),
//          WHATSAPP_TEMPLATE_COMPLETED and WHATSAPP_TEMPLATE_NOSHOW (optional,
//          for the completion and Monday no-show messages)
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ ok: false, error: "not signed in" }, 401);

  // Two clients on purpose: "caller" runs as the staff member, so RLS and
  // the role helpers answer for THEM; "admin" does the privileged writes.
  // Authorization is decided with the caller's own identity, never trusted
  // from the request body.
  const caller = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: { user } } = await caller.auth.getUser();
  if (!user) return json({ ok: false, error: "not signed in" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad request" }, 400); }
  const { person_id, mode = "text", text, display_text, template_key = "attended" } = body ?? {};
  if (!person_id) return json({ ok: false, error: "person_id is required" }, 400);
  if (mode === "text" && !String(text ?? "").trim()) {
    return json({ ok: false, error: "nothing to send" }, 400);
  }

  // --- Authorisation: director sends to anyone; support only to the people
  // support_visible_person() already lets it see. Leaders are read-only and
  // send nothing, same as everywhere else in the app. ---
  const { data: profile } = await caller
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile?.role;
  if (role !== "director") {
    if (role !== "support") return json({ ok: false, error: "not allowed" }, 403);
    const { data: visible } = await caller.rpc("support_visible_person", { p_id: person_id });
    if (!visible) return json({ ok: false, error: "not allowed" }, 403);
  }

  const { data: person } = await admin
    .from("people").select("id, full_name, phone").eq("id", person_id).maybeSingle();
  if (!person?.phone) return json({ ok: false, error: "that person has no phone number" }, 404);

  // --- The 24-hour window ---
  if (mode === "text") {
    const { data: open } = await admin.rpc("wa_window_open", { p_id: person_id });
    if (!open) {
      return json({
        ok: false,
        code: "window_closed",
        error: "They haven't messaged in the last 24 hours, so WhatsApp only allows the approved template. Send that instead, and once they reply you can type freely for 24 hours.",
      }, 409);
    }
  }

  const first = (person.full_name ?? "").split(" ")[0];
  const TEMPLATE_ENV: Record<string, string> = {
    completed: "WHATSAPP_TEMPLATE_COMPLETED",
    noshow: "WHATSAPP_TEMPLATE_NOSHOW",
  };
  const template = template_key === "attended"
    ? (Deno.env.get("WHATSAPP_TEMPLATE") ?? "next_steps_followup")
    : Deno.env.get(TEMPLATE_ENV[template_key] ?? "");
  if (mode === "template" && !template) {
    return json({
      ok: false,
      code: "no_template",
      error: `This message has no approved WhatsApp template yet. Get one approved in WhatsApp Manager and set ${TEMPLATE_ENV[template_key] ?? "its template secret"}, or send it by hand for now.`,
    }, 409);
  }
  const payload = mode === "template"
    ? {
      messaging_product: "whatsapp",
      to: person.phone,
      type: "template",
      template: {
        name: template,
        language: { code: "en" },
        components: [{ type: "body", parameters: [{ type: "text", text: first }] }],
      },
    }
    : {
      messaging_product: "whatsapp",
      to: person.phone,
      type: "text",
      text: { body: String(text).trim() },
    };

  const recorded = mode === "template"
    ? (String(display_text ?? "").trim() || `[template: ${template}]`)
    : String(text).trim();

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${Deno.env.get("WHATSAPP_PHONE_ID")}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("WHATSAPP_TOKEN")}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  const result = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Recorded as a failed row rather than thrown away, so staff can see
    // that a message they thought they'd sent never arrived.
    await admin.from("whatsapp_messages").insert({
      person_id, phone: person.phone, direction: "out",
      body: recorded,
      template_name: mode === "template" ? template : null,
      status: "failed",
      error: result?.error?.message ?? `HTTP ${res.status}`,
      sent_by: user.id,
    });
    return json({ ok: false, error: result?.error?.message ?? "WhatsApp rejected the message" }, 502);
  }

  const waId = result?.messages?.[0]?.id ?? null;
  await admin.from("whatsapp_messages").insert({
    person_id, phone: person.phone, direction: "out",
    wa_message_id: waId,
    body: recorded,
    template_name: mode === "template" ? template : null,
    status: "sent",
    sent_by: user.id,
  });

  return json({ ok: true, wa_message_id: waId });
});
