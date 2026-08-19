-- ============================================================
-- UPGRADE v12 — run ONCE on your existing Supabase project
-- 1) Fixes attendance under-counting in v_session_report: it only
--    counted check-ins already linked to a session's session_id.
--    A checkin only gets session_id set if an open session already
--    existed at that moment, so kiosk check-ins before Session Mode
--    was opened, and check-ins added via People's "Record a check-in"
--    (which never sets session_id at all), silently vanished from
--    every report and CSV export. Now matches by session date + step
--    instead, via a new v_session_attendees view.
-- 2) Adds an optional "facilitator" field to sessions.
-- 3) Adds first-timer/HC-interest/serving-interest name lists (not
--    just counts) to the report, using v_session_attendees.
-- ============================================================

alter table public.sessions add column if not exists facilitator text;

create or replace view public.v_session_attendees
with (security_invoker = true) as
select
  c.checkin_date as session_date,
  c.step,
  p.id as person_id,
  p.full_name,
  p.phone,
  p.email,
  (p.created_at::date = c.checkin_date) as is_first_timer_today,
  p.hc_interest,
  p.serving_interest,
  c.created_at as checkin_time
from public.checkins c
join public.people p on p.id = c.person_id;
grant select on public.v_session_attendees to authenticated, service_role;

-- Appended at the END of the column list on purpose (see upgrade-v11.sql):
-- CREATE OR REPLACE VIEW can only add new trailing columns on an existing
-- database, not reorder/insert them.
create or replace view public.v_session_report
with (security_invoker = true) as
select
  s.id, s.session_date, s.step, s.notes, s.is_open,
  count(a.person_id) as attendance,
  count(a.person_id) filter (where a.is_first_timer_today) as first_timers,
  count(a.person_id) filter (where a.hc_interest) as hc_interest,
  count(a.person_id) filter (where a.serving_interest) as serving_interest,
  s.custom_fields,
  s.facilitator,
  coalesce(string_agg(distinct a.full_name, ', ') filter (where a.is_first_timer_today), '') as first_timer_names,
  coalesce(string_agg(distinct a.full_name, ', ') filter (where a.hc_interest), '') as hc_interest_names,
  coalesce(string_agg(distinct a.full_name, ', ') filter (where a.serving_interest), '') as serving_interest_names
from public.sessions s
left join public.v_session_attendees a
  on a.session_date = s.session_date and a.step = s.step
group by s.id;
grant select on public.v_session_report to authenticated, service_role;
