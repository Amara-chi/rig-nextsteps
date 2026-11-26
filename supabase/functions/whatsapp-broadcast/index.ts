// ============================================================
// whatsapp-broadcast · one approved announcement to every Next Steps person
// Sends a single Meta-approved MARKETING template (an event invitation,
// say) from the church's WhatsApp number to everyone who came through Next
// Steps and has a phone on file, and records each one in whatsapp_messages
// so the chat and Messaging show it. Added 25 Nov 2026 for the WhatsApp
// Business training; meant to be reused for later announcements.
//
// Who may call it: a signed-in DIRECTOR only, same rule as whatsapp-send
// (the line belongs to Next Steps; leaders are read-only and the Follow Up
// team has no WhatsApp access at all). The service role key is accepted
// too, for running it by hand.
//
// Why a template: people outside the 24-hour customer service window can
// only be sent a pre-approved template, and an announcement goes to
// everyone, so it is always a template. Meta approves the words, so the
// caller passes the template's NAME plus the same words as display text
// (with [Name] where the template has {{1}}), so the chat shows what each
// person actually received.
//
// What it will NOT do:
//   - message anyone outside source = 'next_steps' (Follow Up contacts,
//     members and workers added by hand are not on this list).
//   - message anyone twice: whoever already has a non-failed outbound
//     message with this template name is skipped, so it is safe to run
//     again after a time-out or a partial failure. A failed send is
//     retried on the next run.
//   - send more than `limit` (default 40) per call, so one call always
//     finishes inside the function time limit. The app calls it again
//     until `remaining` is 0.
//
// Deploy with JWT verification ON (the default):
//   supabase functions deploy whatsapp-broadcast
//
// One number by hand: pass `phone` (and optionally `name` for someone not on
// file). That sends to that number alone, from any source, even if they
// already have it: the admin asked for it.
//
// POST { template, display_text, image_url?, language?, dry?, limit?, phone?, name? }
//   template      - the approved template's name, exactly as in WhatsApp Manager
//   display_text  - the approved body words, [Name] where {{1}} is
//   image_url     - public link to the header image, if the template has one
//   language      - the template's language code (default "en")
//   dry           - true: report who would be messaged, send nothing
//
// Secrets (same as whatsapp-send): WHATSAPP_TOKEN, WHATSAPP_PHONE_ID.
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

  // --- Authorisation: a director, decided from the caller's own identity,
  // or the service role key when run by hand. ---
  const bearer = authHeader.replace(/^Bearer\s+/i, "");
  if (bearer !== serviceKey) {
    const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ ok: false, error: "not signed in" }, 401);
    const { data: profile } = await caller.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "director") return json({ ok: false, error: "Only the admin can send an announcement." }, 403);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad request" }, 400); }
  const template = String(body?.template ?? "").trim();
  const displayText = String(body?.display_text ?? "").trim();
  const imageUrl = String(body?.image_url ?? "").trim();
  const language = String(body?.language ?? "en").trim() || "en";
  const dry = body?.dry === true;
  const limit = Math.min(Math.max(Number(body?.limit) || 40, 1), 100);
  if (!/^[a-z0-9_]+$/.test(template)) {
    return json({ ok: false, error: "Give the template's name exactly as WhatsApp Manager shows it (lower case, numbers and underscores)." }, 400);
  }
  if (!displayText) return json({ ok: false, error: "Paste the template's words so the chat can show what was sent." }, 400);
  if (imageUrl && !/^https:\/\//.test(imageUrl)) return json({ ok: false, error: "The image link must start with https://" }, 400);

  // One number only: the admin asked for this person by hand, so it goes
  // whether or not they are from Next Steps or already have it. Same
  // normalising as norm_phone() / normPhoneJS().
  const oneDigits = String(body?.phone ?? "").replace(/\D/g, "");
  const one = /^0\d{10}$/.test(oneDigits) ? "234" + oneDigits.slice(1) : oneDigits;
  if (body?.phone && one.length < 10) return json({ ok: false, error: "That phone number looks too short." }, 400);

  let people: { id: string | null; full_name: string | null; phone: string }[] = [];
  let todo: typeof people = [];
  let alreadyCount = 0;
  if (one) {
    const { data: p } = await admin.from("people").select("id, full_name, phone").eq("phone", one).maybeSingle();
    const name = String(body?.name ?? "").trim();
    people = [p ?? { id: null, full_name: name || null, phone: one }];
    const { count } = await admin.from("whatsapp_messages").select("id", { count: "exact", head: true })
      .eq("direction", "out").eq("template_name", template).eq("phone", one).neq("status", "failed");
    alreadyCount = count ?? 0;
    todo = people;
  } else {
    // Everyone from Next Steps with a phone.
    const { data, error } = await admin
      .from("people").select("id, full_name, phone")
      .eq("source", "next_steps").not("phone", "is", null)
      .order("full_name");
    if (error) return json({ ok: false, error: error.message }, 500);
    people = data ?? [];

    // Who already has this announcement (anything but a failure counts).
    const { data: done } = await admin
      .from("whatsapp_messages").select("person_id")
      .eq("direction", "out").eq("template_name", template).neq("status", "failed");
    const already = new Set((done ?? []).map((r) => r.person_id));
    alreadyCount = already.size;
    todo = people.filter((p) => !already.has(p.id));
  }

  const report = {
    dry, template, total: people.length, already: alreadyCount, one: one || undefined,
    sent: 0, failed: 0, errors: [] as string[], remaining: todo.length,
    names: dry ? todo.map((p) => p.full_name ?? "Not on file") : undefined,
  };
  if (dry) return json({ ok: true, ...report });

  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_ID");
  if (!token || !phoneId) return json({ ok: false, error: "WHATSAPP_TOKEN / WHATSAPP_PHONE_ID not set" }, 500);

  for (const person of todo.slice(0, limit)) {
    const first = (person.full_name ?? "").split(" ")[0] || "friend";
    const components: unknown[] = [];
    if (imageUrl) components.push({ type: "header", parameters: [{ type: "image", image: { link: imageUrl } }] });
    if (displayText.includes("[Name]")) components.push({ type: "body", parameters: [{ type: "text", text: first }] });

    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp", to: person.phone, type: "template",
        template: { name: template, language: { code: language }, components },
      }),
    });
    const result = await res.json().catch(() => ({}));
    const text = displayText.replace(/\[Name\]/g, first);

    if (!res.ok) {
      const msg = result?.error?.message ?? `HTTP ${res.status}`;
      await admin.from("whatsapp_messages").insert({
        person_id: person.id, phone: person.phone, direction: "out",
        body: text, template_name: template, status: "failed", error: msg,
      });
      report.failed++;
      if (report.errors.length < 5 && !report.errors.includes(msg)) report.errors.push(msg);
      // A template Meta does not know (not approved yet, wrong name or
      // language) fails the same way for everyone: stop rather than log a
      // failure against every person on the list.
      if (result?.error?.code === 132001) break;
      continue;
    }
    await admin.from("whatsapp_messages").insert({
      person_id: person.id, phone: person.phone, direction: "out",
      wa_message_id: result?.messages?.[0]?.id ?? null,
      body: text, template_name: template, status: "sent",
    });
    report.sent++;
  }

  report.remaining = Math.max(todo.length - report.sent - report.failed, 0);
  console.log("whatsapp-broadcast:", JSON.stringify({ ...report, names: undefined }));
  return json({ ok: true, ...report });
});
