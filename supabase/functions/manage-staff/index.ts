// ============================================================
// manage-staff
// Lets a director invite, remove, or re-role other staff accounts
// straight from the Team pane, instead of hand-running SQL in the
// Supabase dashboard for every change.
//
// Deploy:
//   supabase functions deploy manage-staff
// No extra secrets needed — just the ones Supabase sets automatically
// (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).
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

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ROLES = ["director", "leader", "support"];
// The one account allowed to remove/re-role other directors. Case-
// insensitive compare against the caller's verified auth email below.
const SUPER_ADMIN_EMAIL = "adewale.jody@gmail.com";

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
      const email = String(body.email || "").trim();
      const full_name = String(body.full_name || "").trim();
      const role = body.role;
      // Sent by the frontend as window.location.origin — belt-and-braces so
      // the invite link works regardless of the project's Auth "Site URL"
      // dashboard setting (which defaults to localhost and is easy to miss).
      const redirectTo = String(body.redirect_to || "").trim() || undefined;
      if (!email || !ROLES.includes(role)) return fail("invalid_input");

      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name },
        redirectTo,
      });
      if (error) return fail(error.message);

      const { error: roleErr } = await admin.from("profiles")
        .update({ role }).eq("id", data.user.id);
      if (roleErr) return fail(roleErr.message);

      return ok();
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
