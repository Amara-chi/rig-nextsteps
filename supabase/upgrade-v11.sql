-- ============================================================
-- UPGRADE v11 — run ONCE on your existing Supabase project
-- Lets the director add ad-hoc custom fields (a label + a typed
-- value) to a single week's session report — for anything that
-- doesn't fit the built-in fields and isn't worth a permanent one.
-- ============================================================

alter table public.sessions add column if not exists custom_fields jsonb not null default '[]'::jsonb;

-- Appended at the END of the column list on purpose: CREATE OR REPLACE
-- VIEW can only add new trailing columns, not reorder/rename existing
-- ones, so custom_fields must come after serving_interest here.
create or replace view public.v_session_report
with (security_invoker = true) as
select
  s.id, s.session_date, s.step, s.notes, s.is_open,
  count(c.id) as attendance,
  count(c.id) filter (where p.created_at::date = s.session_date) as first_timers,
  count(distinct c.person_id) filter (where p.hc_interest) as hc_interest,
  count(distinct c.person_id) filter (where p.serving_interest) as serving_interest,
  s.custom_fields
from public.sessions s
left join public.checkins c on c.session_id = s.id
left join public.people  p on p.id = c.person_id
group by s.id;
grant select on public.v_session_report to authenticated, service_role;
