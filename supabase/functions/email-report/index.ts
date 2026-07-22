// ============================================================
// OPTIONAL ADD-ON · email-report
// Emails the five-point weekly report to leadership the moment
// the director ends a session. Uses Resend (resend.com).
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

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#454B59">
        <div style="border-bottom:3px solid #F25125;padding-bottom:12px;margin-bottom:18px">
          <h2 style="margin:0;color:#313743">Next Steps — Session Report</h2>
          <p style="margin:4px 0 0;font-size:12px;color:#8A90A0;letter-spacing:1px">RIG CHURCH LAGOS</p>
        </div>
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#8A90A0;width:180px">1 · Session date</td><td style="padding:8px 0;font-weight:bold">${date}</td></tr>
          <tr><td style="padding:8px 0;color:#8A90A0">2 · Step facilitated</td><td style="padding:8px 0;font-weight:bold">Step ${r.step} — ${STEP_TITLES[r.step] ?? ""}</td></tr>
          <tr><td style="padding:8px 0;color:#8A90A0">3 · Attendance</td><td style="padding:8px 0;font-weight:bold">${r.attendance} people · ${r.first_timers} first-timer(s)</td></tr>
          <tr><td style="padding:8px 0;color:#8A90A0">4 · Interest expressed</td><td style="padding:8px 0;font-weight:bold">${r.hc_interest} house church · ${r.serving_interest} serving</td></tr>
          <tr><td style="padding:8px 0;color:#8A90A0;vertical-align:top">5 · Notes</td><td style="padding:8px 0">${(r.notes ?? "—").replace(/</g, "&lt;")}</td></tr>
        </table>
        <p style="font-size:11px;color:#A8ADB9;margin-top:24px">Sent automatically by the Next Steps platform when the session was closed.</p>
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
