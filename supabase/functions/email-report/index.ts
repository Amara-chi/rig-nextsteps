// ============================================================
// OPTIONAL ADD-ON · email-report
// Emails the weekly session report to leadership the moment the
// director ends a session. Fields shown match whatever's set in
// the Reports pane's "Customize fields" (app_settings.report_fields).
// Uses Resend (resend.com).
//
// Deploy (see PHASE2-GUIDE.md):
//   supabase functions deploy email-report
// Secrets to set in Supabase > Edge Functions > Secrets:
//   RESEND_API_KEY     - from resend.com
//   REPORT_FROM        - e.g. "Next Steps <nextsteps@rigchurchlagos.org>"
//   REPORT_RECIPIENTS  - comma-separated, e.g. "leader@rigchurchlagos.org"
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const STEP_TITLES: Record<number, string> = {
  1: "Why God Put You on the Earth",
  2: "The House You're Walking Into",
  3: "Find Your Place",
  4: "All In",
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { session_id } = await req.json();
    if (!session_id) throw new Error("session_id required");

    // Verify the caller is a signed-in director (their JWT rides along).
    const caller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: isDirector } = await caller.rpc("is_director");
    if (!isDirector) {
      return new Response(JSON.stringify({ ok: false, error: "not_director" }), {
        status: 403, headers: { ...cors, "content-type": "application/json" },
      });
    }

    // Read the report with elevated access.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: r, error } = await admin
      .from("v_session_report").select("*").eq("id", session_id).single();
    if (error || !r) throw new Error("report not found");

    const date = new Date(r.session_date + "T00:00:00")
      .toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    // Same field set and order as the Reports pane's "Customize fields" —
    // read the director's saved choice so the email always matches what's
    // shown on screen. Falls back to all seven if nothing's been set.
    const FIELD_DEFS: Record<string, { label: string; value: () => string }> = {
      session_date: { label: "Session date", value: () => date },
      step: { label: "Step facilitated", value: () => `Step ${r.step} — ${STEP_TITLES[r.step] ?? ""}` },
      attendance: { label: "Attendance", value: () => `${r.attendance} people` },
      first_timers: { label: "First-timers", value: () => `${r.first_timers} first-timer(s)` },
      hc_interest: { label: "House church interest", value: () => `${r.hc_interest} interested` },
      serving_interest: { label: "Serving interest", value: () => `${r.serving_interest} interested` },
      notes: { label: "Notes", value: () => (r.notes ?? "—").replace(/</g, "&lt;") },
    };
    const ALL_KEYS = Object.keys(FIELD_DEFS);
    const { data: setting } = await admin.from("app_settings").select("value").eq("key", "report_fields").maybeSingle();
    const savedKeys = Array.isArray(setting?.value) ? setting!.value.filter((k: string) => ALL_KEYS.includes(k)) : [];
    const activeKeys = savedKeys.length ? savedKeys : ALL_KEYS;

    const rows = activeKeys.map((k: string, i: number) => {
      const f = FIELD_DEFS[k];
      return `<tr><td style="padding:8px 0;color:#8A90A0;width:180px;vertical-align:top">${i + 1} · ${f.label}</td><td style="padding:8px 0;font-weight:bold">${f.value()}</td></tr>`;
    }).join("");

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#454B59">
        <div style="text-align:center;padding:22px 0;background:#EFEBE2;border-radius:14px 14px 0 0">
          <img src="https://nextsteps.rigchurchlagos.org/images/logo.png" alt="Rig Church Lagos" style="height:42px">
        </div>
        <div style="padding:22px 4px 4px">
          <h2 style="margin:0 0 18px;color:#313743">Next Steps — Session Report</h2>
          <table style="width:100%;font-size:14px;border-collapse:collapse">${rows}</table>
          <p style="font-size:11px;color:#A8ADB9;margin-top:24px">Sent automatically by the Next Steps platform when the session was closed.</p>
        </div>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("REPORT_FROM") ?? "Next Steps <onboarding@resend.dev>",
        to: (Deno.env.get("REPORT_RECIPIENTS") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
        subject: `Next Steps report — ${date} · Step ${r.step}`,
        html,
      }),
    });
    if (!res.ok) throw new Error(`resend: ${await res.text()}`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400, headers: { ...cors, "content-type": "application/json" },
    });
  }
});
