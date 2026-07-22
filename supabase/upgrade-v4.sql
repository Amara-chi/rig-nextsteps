-- ============================================================
-- UPGRADE v4 — run ONCE on your existing Supabase project
-- Adds the follow-up outcome field (what happened when you
-- messaged/called someone, logged after the fact).
-- ============================================================
alter table public.followups add column if not exists outcome text;
