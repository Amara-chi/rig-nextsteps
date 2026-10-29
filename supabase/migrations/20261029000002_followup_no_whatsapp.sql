-- ============================================================
-- v16 · Follow Up has no access to the automated WhatsApp line (29 Oct 2026)
-- Idempotent: safe to run twice. Run after v15.
-- ============================================================
-- ---------- Follow Up has no access to the automated WhatsApp line ----------
-- Org decision, 29 Oct 2026, replacing the 12 Oct one that gave support its
-- own Messages page: the WhatsApp line belongs to Next Steps (Messaging).
-- The Follow Up team (technical role: support) neither reads, marks read
-- nor sends, for any reason. Follow Up still sees that a message FAILED,
-- because that is how Next Steps hands someone over for a call, but not
-- WhatsApp's error text. The whatsapp-send function refuses support too.

drop policy if exists "staff read whatsapp" on public.whatsapp_messages;
create policy "staff read whatsapp" on public.whatsapp_messages for select to authenticated
  using (public.is_director() or public.is_leader());

create or replace function public.wa_mark_read(p_person_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not (public.is_director() or public.is_leader()) then
    return 0;
  end if;
  update public.whatsapp_messages
    set read_at = now(), updated_at = now()
    where person_id = p_person_id and direction = 'in' and read_at is null;
  get diagnostics n = row_count;
  return n;
end;
$$;
grant execute on function public.wa_mark_read(uuid) to authenticated, service_role;

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
    or (p.source <> 'next_steps' and coalesce(cs.steps_done, 0) = 0 and lo.created_at is null)
  ) as waiting
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
