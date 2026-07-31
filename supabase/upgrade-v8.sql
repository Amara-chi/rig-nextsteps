-- ============================================================
-- UPGRADE v8 — run ONCE on your existing Supabase project
-- Belt-and-braces table grants. Found while testing this project's
-- schema against a fresh local `supabase start` instance: a plain
-- Postgres + Supabase CLI setup doesn't automatically grant the
-- `authenticated`/`service_role` roles SELECT/INSERT/UPDATE/DELETE on
-- new tables the way a hosted Supabase project does — RLS was always
-- the real gatekeeper, and service_role bypasses RLS by design, but
-- Postgres checks GRANTs independently of both, so without these the
-- tables (and, for service_role, the Edge Functions that use it —
-- email-report, send-followups, manage-staff) aren't reachable at
-- all. Harmless to run even if your project already works today.
-- ============================================================

grant select, insert, update, delete on public.people       to authenticated, service_role;
grant select, insert, update, delete on public.sessions     to authenticated, service_role;
grant select, insert, update, delete on public.checkins     to authenticated, service_role;
grant select, insert, update, delete on public.followups    to authenticated, service_role;
grant select, insert, update, delete on public.person_notes to service_role;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;
grant select on public.v_people_progress to authenticated, service_role;
grant select on public.v_session_report  to authenticated, service_role;
grant select on public.v_support_people  to authenticated, service_role;
