-- ============================================================
-- UPGRADE v18 - run ONCE on your existing Supabase project
-- Adds the Worker tag and optional title to people, and keeps members with
-- no Next Steps history out of Follow Up's "waiting on a call" list.
-- Requires upgrade-v17.sql first. Safe to run twice.
-- Same content as supabase/migrations/20261105000001_workers.sql.
-- ============================================================
-- ---------- Workers ----------
-- A worker is a member who serves; the title (e.g. 'Prophetic Lead') is
-- optional. Recorded by the admin only, like membership: the people table
-- is director-write already, so no new policy is needed.
alter table public.people
  add column if not exists is_worker boolean not null default false,
  add column if not exists worker_title text;

-- v_contacts carries both, and stops treating a member with no Next Steps
-- history as a contact waiting on a first call.
create or replace view public.v_contacts as
select
  p.id, p.full_name, p.phone, p.email, p.source, p.group_name,
  p.gender, p.birth_day, p.birth_month, p.birth_year, p.age_range,
  p.address, p.occupation, p.referral, p.prayer_request, p.first_visit,
  p.needs_check, p.assigned_to, ap.full_name as assigned_name,
  p.handed_over_at, p.handover_reason,
  p.hc_interest, p.hc_placed_in, p.hc_placed_on, p.member_since, p.created_at,
  coalesce(cs.steps_done, 0) as steps_done, cs.last_seen, cs.completed_on,
  fo.id as open_followup_id, fo.status as open_followup_status,
  lo.action as last_action, lo.note as last_note, lo.created_at as last_outcome_at, lb.full_name as last_outcome_by,
  wf.failed_at,
  -- WhatsApp's own failure text is the line's business, not Follow Up's (v16).
  case when public.is_support() then null else wf.failed_error end as failed_error,
  case
    when wf.failed_at is not null and (lo.created_at is null or lo.created_at < wf.failed_at) then 'failed'
    when p.handed_over_at is not null then 'reply'
    when coalesce(cs.steps_done, 0) between 1 and 3 and cs.last_seen < (current_date - (extract(dow from current_date)::int)) then 'noshow'
    when coalesce(cs.steps_done, 0) = 4 and p.member_since is null then 'completed'
    -- A member who never came through Next Steps (e.g. the workers list) is
    -- a member, not a cold group or card contact (v18).
    when p.member_since is not null and coalesce(cs.steps_done, 0) = 0 then 'member'
    when p.source = 'group' then 'group'
    when p.source <> 'next_steps' then 'card'
    when fo.id is not null then 'attended'
    when p.hc_interest then 'hc'
    else 'member'
  end as reason,
  -- Waiting on a human: the reason needs a call, and nothing has been
  -- logged since that reason arose. 'attended' is the automatic line's job
  -- (Messaging), not Follow Up's, unless it failed.
  (
    (wf.failed_at is not null and (lo.created_at is null or lo.created_at < wf.failed_at))
    or (p.handed_over_at is not null and (lo.created_at is null or lo.created_at < p.handed_over_at))
    or (coalesce(cs.steps_done, 0) between 1 and 3 and cs.last_seen < (current_date - (extract(dow from current_date)::int))
        and (lo.created_at is null or lo.created_at::date < cs.last_seen))
    or (coalesce(cs.steps_done, 0) = 4 and p.member_since is null and (lo.created_at is null or lo.created_at::date < cs.completed_on))
    or (p.source <> 'next_steps' and coalesce(cs.steps_done, 0) = 0 and p.member_since is null and lo.created_at is null)
  ) as waiting,
  -- Appended at the end: CREATE OR REPLACE VIEW can only add columns there.
  p.is_worker, p.worker_title
from public.people p
left join public.profiles ap on ap.id = p.assigned_to
left join (
  select person_id, count(distinct step) as steps_done, max(checkin_date) as last_seen,
         max(checkin_date) as completed_on
  from public.checkins group by person_id
) cs on cs.person_id = p.id
left join lateral (
  select f.id, f.status from public.followups f
  where f.person_id = p.id and f.type = 'attended'
  and (f.status = 'pending' or (f.status in ('sent','called','texted') and f.outcome is null))
  order by f.created_at desc limit 1
) fo on true
left join lateral (
  select o.action, o.note, o.created_at, o.logged_by from public.outcomes o
  where o.person_id = p.id order by o.created_at desc limit 1
) lo on true
left join public.profiles lb on lb.id = lo.logged_by
left join lateral (
  select m.created_at as failed_at, m.error as failed_error from public.whatsapp_messages m
  where m.person_id = p.id and m.direction = 'out' and m.status = 'failed'
  order by m.created_at desc limit 1
) wf on true
where (public.is_director() or public.is_leader() or public.is_support())
  and public.support_visible_person(p.id);
grant select on public.v_contacts to authenticated, service_role;
