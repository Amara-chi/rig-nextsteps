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

    // Same field set, order, and grouping as the Reports pane's "Customize
    // fields" — read the director's saved choice so the email always
    // matches what's shown on screen. Falls back to all seven if nothing's
    // been set. "stat" fields render as number cards; "detail"/"notes"
    // render as plain rows — same split as the on-screen redesign.
    const FIELD_DEFS: Record<string, { label: string; kind: "detail" | "stat" | "notes"; value: () => string }> = {
      session_date: { label: "Session date", kind: "detail", value: () => date },
      step: { label: "Step facilitated", kind: "detail", value: () => `Step ${r.step} — ${STEP_TITLES[r.step] ?? ""}` },
      attendance: { label: "Attendance", kind: "stat", value: () => String(r.attendance) },
      first_timers: { label: "First-timers", kind: "stat", value: () => String(r.first_timers) },
      hc_interest: { label: "House church interest", kind: "stat", value: () => String(r.hc_interest) },
      serving_interest: { label: "Serving interest", kind: "stat", value: () => String(r.serving_interest) },
      notes: { label: "Notes", kind: "notes", value: () => (r.notes ?? "—").replace(/</g, "&lt;") },
    };
    const ALL_KEYS = Object.keys(FIELD_DEFS);
    const { data: setting } = await admin.from("app_settings").select("value").eq("key", "report_fields").maybeSingle();
    const savedKeys = Array.isArray(setting?.value) ? setting!.value.filter((k: string) => ALL_KEYS.includes(k)) : [];
    const activeKeys = savedKeys.length ? savedKeys : ALL_KEYS;
    const details = activeKeys.filter((k: string) => FIELD_DEFS[k].kind === "detail");
    const stats = activeKeys.filter((k: string) => FIELD_DEFS[k].kind === "stat");
    const notesKey = activeKeys.find((k: string) => FIELD_DEFS[k].kind === "notes");

    const detailRows = details.map((k: string) =>
      `<tr><td style="padding:7px 0;color:#8A90A0;width:180px;vertical-align:top">${FIELD_DEFS[k].label}</td><td style="padding:7px 0;font-weight:bold">${FIELD_DEFS[k].value()}</td></tr>`
    ).join("");
    // Two stat cards per table row, email-client-safe (plain table, no CSS grid).
    let statTable = "";
    for (let i = 0; i < stats.length; i += 2) {
      const pair = stats.slice(i, i + 2);
      const cells = pair.map((k: string) => `
        <td style="width:50%;padding:6px" valign="top">
          <div style="border:1px solid #DBD4C4;border-radius:10px;padding:12px 14px">
            <div style="font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#8A90A0">${FIELD_DEFS[k].label}</div>
            <div style="font-size:22px;font-weight:900;color:#313743;margin-top:2px">${FIELD_DEFS[k].value()}</div>
          </div>
        </td>`).join("");
      statTable += `<tr>${cells}${pair.length === 1 ? '<td style="width:50%"></td>' : ""}</tr>`;
    }

    // Ad-hoc fields the director added just for this session (sessions.custom_fields).
    const customList: { label: string; value: string }[] = Array.isArray(r.custom_fields) ? r.custom_fields : [];
    const customRows = customList.map((cf) =>
      `<tr><td style="padding:7px 0;color:#8A90A0;width:180px;vertical-align:top">${String(cf.label).replace(/</g, "&lt;")}</td><td style="padding:7px 0;font-weight:bold">${String(cf.value).replace(/</g, "&lt;")}</td></tr>`
    ).join("");

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#454B59">
        <div style="text-align:center;padding:22px 0;background:#EFEBE2;border-radius:14px 14px 0 0">
          <img src="https://nextsteps.rigchurchlagos.org/images/logo.png" alt="Rig Church Lagos" style="height:42px">
        </div>
        <div style="padding:22px 4px 4px">
          <h2 style="margin:0 0 18px;color:#313743">Next Steps — Session Report</h2>
          ${detailRows ? `<table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:${stats.length ? 14 : 0}px">${detailRows}</table>` : ""}
          ${statTable ? `<table style="width:100%;border-collapse:collapse;margin-bottom:${customRows ? 14 : (notesKey ? 14 : 0)}px">${statTable}</table>` : ""}
          ${customRows ? `<table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:${notesKey ? 14 : 0}px">${customRows}</table>` : ""}
          ${notesKey ? `<div style="font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#8A90A0;margin-bottom:4px">${FIELD_DEFS[notesKey].label}</div><div style="font-size:14px">${FIELD_DEFS[notesKey].value()}</div>` : ""}
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
