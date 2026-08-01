-- ============================================================
-- UPGRADE v10 — run ONCE on your existing Supabase project
-- Fixes a real bug: v_support_people used to assign each person a
-- single priority-ordered `reason` (member > membership pipeline >
-- follow-up > no-show > house church). That silently hid the
-- house-church flag on anyone who ALSO happened to have completed
-- all 4 steps — they'd only show up under Membership, never under
-- House Church, even with hc_interest = true.
--
-- Fix: independent, non-exclusive flags. A person can be house-church
-- interested AND in the membership pipeline AND awaiting a follow-up,
-- all at once, and now shows up everywhere that applies.
-- ============================================================

-- CREATE OR REPLACE can't rename/drop columns on an existing view (the old
-- one has a `reason` column this version doesn't) — drop and recreate.
drop view if exists public.v_support_people;
create view public.v_support_people as
select
  p.id, p.full_name, p.phone, p.email,
  p.hc_interest, p.serving_interest, p.member_since,
  coalesce(cs.steps_done, 0) as steps_done,
  cs.last_seen,
  fo.id as open_followup_id,
  fo.status as open_followup_status,
  fo.step as open_followup_step,
  p.hc_interest as is_house_church,
  (p.member_since is not null or coalesce(cs.steps_done, 0) = 4) as is_membership,
  (fo.id is not null) as is_awaiting_followup,
  (
    coalesce(cs.steps_done, 0) between 1 and 3
    and cs.last_seen is not null
    and cs.last_seen < (current_date - (extract(dow from current_date)::int))
  ) as is_noshow
from public.people p
left join (
  select person_id, count(distinct step) as steps_done, max(checkin_date) as last_seen
  from public.checkins group by person_id
) cs on cs.person_id = p.id
left join lateral (
  select f.id, f.status, c.step from public.followups f
  left join public.checkins c on c.id = f.checkin_id
  where f.person_id = p.id and f.type = 'attended'
  and (f.status = 'pending' or (f.status in ('sent','called','texted') and f.outcome is null))
  order by f.created_at desc limit 1
) fo on true
where public.support_visible_person(p.id);
grant select on public.v_support_people to authenticated, service_role;
