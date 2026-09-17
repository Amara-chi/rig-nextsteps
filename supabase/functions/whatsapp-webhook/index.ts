// ============================================================
// OPTIONAL ADD-ON · whatsapp-webhook
// Receives everything Meta sends about the church's WhatsApp number:
// messages people send in, and delivery receipts for messages sent out.
// Both land in public.whatsapp_messages, which is what the in-app chat
// reads. Staff never write to that table directly.
//
// Deploy WITHOUT jwt verification — Meta calls this with no Supabase
// session, so requiring one would reject every delivery:
//   supabase functions deploy whatsapp-webhook --no-verify-jwt
// Then register the URL in the Meta app under WhatsApp > Configuration:
//   Callback URL: https://<project>.supabase.co/functions/v1/whatsapp-webhook
//   Verify token: whatever you set as WHATSAPP_VERIFY_TOKEN
//
// Secrets to set in Supabase > Edge Functions > Secrets:
//   WHATSAPP_VERIFY_TOKEN - any random string; must match what you type
//                           into Meta's Callback URL form
//   WHATSAPP_APP_SECRET   - the app secret from Meta > App settings > Basic
// Optional, for email alerts (the church's own SMTP, no third party):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
//   NOTIFY_EMAILS - comma-separated recipients
//   APP_URL       - defaults to the live admin app
// With SMTP_HOST unset, email is skipped silently and the in-app badge is
// still the source of truth. Email is a convenience, never the record.
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Meta signs every POST with the app secret. Without this check the URL is
// a public endpoint anyone could post fabricated messages to, and they would
// appear to staff as things a newcomer actually said.
async function signatureValid(raw: string, header: string | null) {
  const secret = Deno.env.get("WHATSAPP_APP_SECRET");
  if (!secret) return false;              // fail closed, never open
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const expected = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  const given = header.slice("sha256=".length);
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

// One email per conversation that needs attention, not one per message: a
// newcomer sending four lines in a row is still one thing for staff to deal
// with. Only the message that takes a conversation from "nothing unread" to
// "something unread" triggers it, so an ongoing back-and-forth stays quiet
// until someone reads it in the app.
async function notify(items: { name: string; body: string }[]) {
  const host = Deno.env.get("SMTP_HOST");
  const to = (Deno.env.get("NOTIFY_EMAILS") ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (!host || to.length === 0 || items.length === 0) return;

  const appUrl = Deno.env.get("APP_URL") ?? "https://nextsteps.rigchurchlagos.org";
  const subject = items.length === 1
    ? `New WhatsApp reply from ${items[0].name}`
    : `${items.length} new WhatsApp replies`;
  const lines = items.map((i) => `${i.name}:\n${i.body}`).join("\n\n");

  console.log(`notify: sending to ${to.length} recipient(s) via ${host}:${Deno.env.get("SMTP_PORT") ?? 587}`);
  const client = new SMTPClient({
    connection: {
      hostname: host,
      port: Number(Deno.env.get("SMTP_PORT") ?? 587),
      tls: Number(Deno.env.get("SMTP_PORT") ?? 587) === 465,
      auth: {
        username: Deno.env.get("SMTP_USER") ?? "",
        password: Deno.env.get("SMTP_PASS") ?? "",
      },
    },
  });
  try {
    await client.send({
      from: Deno.env.get("SMTP_FROM") ?? Deno.env.get("SMTP_USER") ?? "",
      to,
      subject,
      content: `${lines}\n\nReply in the app: ${appUrl}\n`,
    });
    console.log("notify: sent");
  } finally {
    await client.close();
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Meta's one-time subscription handshake.
  if (req.method === "GET") {
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (url.searchParams.get("hub.mode") === "subscribe" &&
        token && token === Deno.env.get("WHATSAPP_VERIFY_TOKEN")) {
      return new Response(challenge ?? "", { status: 200 });
    }
    return new Response("forbidden", { status: 403 });
  }

  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const raw = await req.text();
  if (!await signatureValid(raw, req.headers.get("x-hub-signature-256"))) {
    return new Response("bad signature", { status: 401 });
  }

  let payload: any;
  try { payload = JSON.parse(raw); } catch { return new Response("ok", { status: 200 }); }

  const pending: { name: string; body: string }[] = [];

  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value ?? {};

      // --- Messages people send to the church number ---
      for (const m of value.messages ?? []) {
        const phone = String(m.from ?? "");
        // people.phone is already stored normalised by norm_phone(), and
        // Meta gives us the same shape (country code, digits only), so this
        // matches directly. An unknown number still gets stored, with a null
        // person_id, rather than being dropped.
        const { data: person } = await admin
          .from("people").select("id").eq("phone", phone).maybeSingle();

        const body = m.text?.body
          ?? m.button?.text
          ?? m.interactive?.list_reply?.title
          ?? m.interactive?.button_reply?.title
          ?? `[${m.type ?? "unsupported"} message]`;

        // onConflict on Meta's id: it retries until it gets a 200, so the
        // same message can legitimately arrive several times.
        await admin.from("whatsapp_messages").upsert({
          person_id: person?.id ?? null,
          phone,
          direction: "in",
          wa_message_id: m.id ?? null,
          body,
          created_at: m.timestamp
            ? new Date(Number(m.timestamp) * 1000).toISOString()
            : new Date().toISOString(),
        }, { onConflict: "wa_message_id", ignoreDuplicates: true });

        // Notify only when this is the one that made the conversation
        // unread. A retry of a message we already stored leaves the count
        // unchanged and so sends nothing, which is what we want.
        if (person?.id) {
          const { count } = await admin
            .from("whatsapp_messages")
            .select("id", { count: "exact", head: true })
            .eq("person_id", person.id).eq("direction", "in").is("read_at", null);
          if (count === 1) {
            const { data: p } = await admin
              .from("people").select("full_name").eq("id", person.id).maybeSingle();
            pending.push({ name: p?.full_name ?? phone, body });
          }
        } else {
          pending.push({ name: `Unknown number ${phone}`, body });
        }
      }

      // --- Delivery receipts for messages we sent ---
      for (const s of value.statuses ?? []) {
        if (!s.id) continue;
        await admin.from("whatsapp_messages").update({
          status: s.status ?? null,
          error: s.errors?.[0]?.title ?? null,
          updated_at: new Date().toISOString(),
        }).eq("wa_message_id", s.id);
      }
    }
  }

  // Email after the response where the runtime allows it. Meta wants a fast
  // 200 and retries the whole batch if it doesn't get one, so an SMTP server
  // having a slow morning must not turn into duplicate webhook deliveries.
  if (pending.length > 0) {
    const task = notify(pending).catch((e) => {
      console.error("notify failed:", e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    });
    const rt = (globalThis as any).EdgeRuntime;
    if (rt?.waitUntil) rt.waitUntil(task); else await task;
  }

  // Always 200 once the signature checks out. A non-200 makes Meta retry the
  // whole batch, and a permanently failing endpoint gets the subscription
  // disabled — better to swallow one bad row than lose the webhook.
  return new Response("ok", { status: 200 });
});
