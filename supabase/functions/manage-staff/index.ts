// ============================================================
// manage-staff
// Lets a director invite, remove, or re-role other staff accounts
// straight from the Team pane, instead of hand-running SQL in the
// Supabase dashboard for every change.
//
// Deploy:
//   supabase functions deploy manage-staff
// Needs the secrets Supabase sets automatically (SUPABASE_URL,
// SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY) plus the church's SMTP
// settings (SMTP_HOST/PORT/USER/PASS/FROM, shared with the other
// functions) so the invite email can go out. Without SMTP configured the
// account is still created and the password is handed back to the
// director on screen to pass on, so an invite never silently stalls. The
// director sees the password on screen in every case, not only then.
//
// Invites create the account with a ready-to-use password and email it
// with the sign-in link (org decision, 12 Oct 2026). The earlier magic
// link invite ("click here to set a password") kept tripping people up:
// links expired, opened in the wrong browser, or landed in the wrong
// inbox. A password they can type is simpler for the people we invite.
// They can change it from Profile once in.
//
// Safety rules (enforced here, not just in the UI, so they hold even
// if someone calls this function directly):
//   - A director can never remove or re-role themselves. No exceptions —
//     including SUPER_ADMIN_EMAIL below — so nobody can lock themselves out.
//   - A director can never remove or re-role another director either,
//     UNLESS they're signed in as SUPER_ADMIN_EMAIL (org's decision,
//     2026-08-01: exactly one account may manage other admins). Everyone
//     else changes director accounts by hand in Supabase (Authentication >
//     Users + a SQL update), on purpose.
//   - A director can freely invite, remove, or re-role leader/support
//     accounts, and can promote any non-director account up to director.
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { esc, shell } from "../_shared/email.ts";
import { sendMail } from "../_shared/mailer.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ROLES = ["director", "leader", "support"];
// The one account allowed to remove/re-role other directors. Case-
// insensitive compare against the caller's verified auth email below.
const SUPER_ADMIN_EMAIL = "adewale.jody@gmail.com";

const ROLE_LABEL: Record<string, string> = {
  director: "Admin",
  leader: "Leader",
  support: "Support",
};

// 12 characters in three groups, from an alphabet with no 0/O, 1/l/I or
// other look-alikes, so it survives being read out over the phone or typed
// from a screenshot. Crypto-random, not Math.random.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function makePassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8).join("")}`;
}

function inviteEmail(opts: { name: string; email: string; password: string; role: string; appUrl: string; invitedBy: string }) {
  const first = opts.name.split(" ")[0] || "there";
  const roleLabel = ROLE_LABEL[opts.role] ?? opts.role;
  const row = (label: string, value: string, mono = false) => `
            <tr>
              <td style="padding:9px 14px;font-size:12px;color:#7A8090;white-space:nowrap;border-top:1px solid #EFEBE2;">${esc(label)}</td>
              <td style="padding:9px 14px;font-size:${mono ? "16px" : "14px"};color:#313743;font-weight:bold;${mono ? "font-family:Consolas,Menlo,monospace;letter-spacing:1px;" : ""}border-top:1px solid #EFEBE2;">${esc(value)}</td>
            </tr>`;
  const body = `
      <tr>
        <td style="padding:0 28px 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E6E0D2;border-radius:12px;">
            <tr>
              <td style="padding:9px 14px;font-size:12px;color:#7A8090;white-space:nowrap;">Sign in at</td>
              <td style="padding:9px 14px;font-size:14px;color:#313743;font-weight:bold;"><a href="${esc(opts.appUrl)}" style="color:#F25125;text-decoration:none;">${esc(opts.appUrl)}</a></td>
            </tr>${row("Email", opts.email)}${row("Password", opts.password, true)}${row("Your role", roleLabel)}
          </table>
        </td>
      </tr>`;
  const text = [
    `Hi ${first},`,
    ``,
    `${opts.invitedBy} has added you to the Next Steps team app for Rig Church Lagos.`,
    ``,
    `Sign in at: ${opts.appUrl}`,
    `Email: ${opts.email}`,
    `Password: ${opts.password}`,
    `Your role: ${roleLabel}`,
    ``,
    `You can change the password any time from Profile once you are in.`,
  ].join("\n");
  const html = shell({
    title: "You're on the Next Steps team",
    preview: `Your sign-in details for the Next Steps app`,
    heading: `Welcome aboard, ${first}`,
    lead: `${opts.invitedBy} has added you to the Next Steps team app for Rig Church Lagos. Here is everything you need to sign in.`,
    body,
    ctaHref: opts.appUrl,
    ctaLabel: "Sign in",
    footnote: "You can change this password any time from Profile once you are in. If you weren't expecting this email, you can ignore it.",
  });
  return { text, html };
}

function fail(error: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error }), {
    status, headers: { ...cors, "content-type": "application/json" },
  });
}
function ok(body: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ ok: true, ...body }), {
    headers: { ...cors, "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json();
    const { action } = body;

    // Verify the caller is a signed-in director (their JWT rides along).
    const caller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: { user: callerUser }, error: callerErr } = await caller.auth.getUser();
    if (callerErr || !callerUser) return fail("not_authenticated", 401);
    const { data: isDirector } = await caller.rpc("is_director");
    if (!isDirector) return fail("not_director", 403);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "invite") {
      const email = String(body.email || "").trim().toLowerCase();
      const full_name = String(body.full_name || "").trim();
      const role = body.role;
      // Sent by the frontend as window.location.origin: the link that goes
      // in the email, so it points at wherever the app is actually served.
      const appUrl = String(body.redirect_to || "").trim() || "https://nextsteps.rigchurchlagos.org/";
      if (!email || !ROLES.includes(role)) return fail("invalid_input");

      const password = makePassword();
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });
      if (error) return fail(error.message);

      const { error: roleErr } = await admin.from("profiles")
        .update({ role }).eq("id", data.user.id);
      if (roleErr) return fail(roleErr.message);

      // The director's own name, so the email reads as from a person.
      const { data: me } = await admin.from("profiles").select("full_name").eq("id", callerUser.id).single();
      const invitedBy = (me?.full_name || "").trim() || "The Next Steps team";

      let emailed = false;
      try {
        const mail = inviteEmail({ name: full_name, email, password, role, appUrl, invitedBy });
        emailed = await sendMail({
          to: [email],
          subject: "Your sign-in details for the Next Steps app",
          text: mail.text,
          html: mail.html,
        });
      } catch (e) {
        console.error("invite email failed:", e);
      }

      // The director always gets the password back (org decision, 12 Oct
      // 2026): they can read it out on the phone, re-send it, or type it in
      // for someone, whether or not the email went through. The caller is
      // a verified director who just created this account, so this reveals
      // nothing they couldn't have set themselves.
      return ok({ emailed, password });
    }

    if (action === "remove" || action === "set_role") {
      const user_id = body.user_id;
      if (!user_id) return fail("invalid_input");
      if (user_id === callerUser.id) return fail("cannot_change_self");

      const { data: target, error: targetErr } = await admin
        .from("profiles").select("role").eq("id", user_id).single();
      if (targetErr || !target) return fail("not_found", 404);
      const isSuperAdmin = (callerUser.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL;
      if (target.role === "director" && !isSuperAdmin) return fail("cannot_change_another_director");

      if (action === "remove") {
        const { error } = await admin.auth.admin.deleteUser(user_id);
        if (error) return fail(error.message);
        return ok();
      }

      const role = body.role;
      if (!ROLES.includes(role)) return fail("invalid_input");
      const { error } = await admin.from("profiles").update({ role }).eq("id", user_id);
      if (error) return fail(error.message);
      return ok();
    }

    return fail("unknown_action");
  } catch (e) {
    return fail(String(e));
  }
});
