-- ============================================================
-- v23 · Newcomer details on the check-in form (22 Nov 2026)
-- Idempotent: safe to run twice. Run after v22.
-- ============================================================
-- ---------- Newcomer details on the check-in form ----------
-- The check-in form now asks a newcomer for their full address, state of
-- residence, profession and date of birth. Address, profession
-- (occupation) and date of birth (birth_day/_month/_year) reuse the
-- columns the welcome cards already fill (v15), so Follow Up reads them
-- the same way whichever door someone came in by. State is new.
alter table public.people add column if not exists state text;

-- check_in gains the four details. The old six-argument version is
-- dropped rather than overloaded: an overload would make PostgREST's
-- choice ambiguous, and every new argument has a default, so a check-in
-- queued offline on a phone before this change still lands. Details are
-- only written when the person is new; a returning visitor skips the
-- details screen. A date of birth that cannot be right (in the future,
-- before 1900) is dropped rather than refusing the check-in.
drop function if exists public.check_in(text, int, text, text, boolean, text);
create or replace function public.check_in(
  p_phone text,
  p_step int,
  p_name text default null,
  p_email text default null,
  p_first_time boolean default false,
  p_heard text default null,
  p_address text default null,
  p_state text default null,
  p_occupation text default null,
  p_birth_date date default null
) returns json language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_first text; v_session uuid; v_checkin uuid; v_dob date;
begin
  if p_step is null or p_step not between 1 and 4 then
    return json_build_object('ok', false, 'error', 'invalid_step');
  end if;
  if length(public.norm_phone(p_phone)) < 10 then
    return json_build_object('ok', false, 'error', 'invalid_phone');
  end if;

  select id, split_part(full_name, ' ', 1) into v_id, v_first
  from public.people where phone = public.norm_phone(p_phone);

  if v_id is null then
    if coalesce(trim(p_name), '') = '' then
      return json_build_object('ok', false, 'error', 'name_required');
    end if;
    v_dob := case when p_birth_date between date '1900-01-01' and current_date then p_birth_date end;
    insert into public.people (full_name, phone, email, first_time, heard_about,
      address, state, occupation, birth_day, birth_month, birth_year)
    values (trim(p_name), public.norm_phone(p_phone), nullif(trim(coalesce(p_email,'')), ''),
            coalesce(p_first_time, false), nullif(trim(coalesce(p_heard,'')), ''),
            nullif(trim(coalesce(p_address,'')), ''), nullif(trim(coalesce(p_state,'')), ''),
            nullif(trim(coalesce(p_occupation,'')), ''),
            extract(day from v_dob)::smallint, extract(month from v_dob)::smallint, extract(year from v_dob)::smallint)
    returning id, split_part(full_name, ' ', 1) into v_id, v_first;
  end if;

  select id into v_session
  from public.sessions
  where session_date = current_date and is_open
  order by created_at desc limit 1;

  insert into public.checkins (person_id, session_id, step)
  values (v_id, v_session, p_step)
  on conflict (person_id, checkin_date) do nothing
  returning id into v_checkin;

  if v_checkin is null then
    return json_build_object('ok', true, 'already', true, 'first_name', v_first);
  end if;

  insert into public.followups (person_id, checkin_id, type)
  values (v_id, v_checkin, 'attended');

  return json_build_object('ok', true, 'already', false, 'first_name', v_first);
end $$;
grant execute on function public.check_in(text, int, text, text, boolean, text, text, text, text, date) to anon, authenticated;

-- People shows the new details, so v_people_progress gains them at the END
-- (CREATE OR REPLACE VIEW can only add columns there).
create or replace view public.v_people_progress
with (security_invoker = true) as
select
  p.id, p.full_name, p.phone, p.email, p.first_time, p.heard_about,
  p.hc_interest, p.serving_interest, p.member_since, p.created_at,
  coalesce(c.steps, '{}') as steps,
  coalesce(array_length(c.steps, 1), 0) as steps_done,
  c.last_seen,
  c.completed_on,
  (coalesce(array_length(c.steps, 1), 0) = 4) as hc_eligible,
  case
    when p.member_since is not null then 'member'
    when coalesce(array_length(c.steps,1),0) = 4
         and c.completed_on <= current_date - interval '30 days' then 'membership_ready'
    when coalesce(array_length(c.steps,1),0) = 4 then 'membership_window'
    when coalesce(array_length(c.steps,1),0) > 0 then 'in_journey'
    else 'new'
  end as milestone,
  p.source,
  p.address, p.state, p.occupation, p.birth_day, p.birth_month, p.birth_year
from public.people p
left join (
  select person_id,
         array_agg(distinct step order by step) as steps,
         max(created_at) as last_seen,
         max(checkin_date) as completed_on
  from public.checkins
  group by person_id
) c on c.person_id = p.id;
grant select on public.v_people_progress to authenticated, service_role;

-- Follow Up can add and correct the state too, like the other card fields.
create or replace function public.add_contact(p jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_phone text; v_email text; v_source text;
begin
  if not (public.is_director() or public.is_support()) then
    return json_build_object('ok', false, 'error', 'not_allowed');
  end if;
  if coalesce(trim(p->>'full_name'), '') = '' then
    return json_build_object('ok', false, 'error', 'name_required');
  end if;
  v_phone := nullif(public.norm_phone(coalesce(p->>'phone', '')), '');
  v_email := nullif(lower(trim(coalesce(p->>'email', ''))), '');
  if v_phone is null and v_email is null then
    return json_build_object('ok', false, 'error', 'contact_required');
  end if;
  v_source := coalesce(nullif(p->>'source', ''), 'welcome_card');
  if v_source not in ('welcome_card', 'group', 'referral') then v_source := 'welcome_card'; end if;

  if v_phone is not null then
    select id into v_id from public.people where phone = v_phone;
    if v_id is not null then
      return json_build_object('ok', true, 'id', v_id, 'existing', true);
    end if;
  end if;

  insert into public.people (full_name, phone, email, source, group_name, gender, birth_day, birth_month, birth_year,
    age_range, address, state, occupation, referral, prayer_request, first_visit, needs_check, assigned_to)
  values (
    trim(p->>'full_name'), v_phone, v_email, v_source, nullif(trim(coalesce(p->>'group_name', '')), ''),
    nullif(p->>'gender', ''), nullif(p->>'birth_day', '')::smallint, nullif(p->>'birth_month', '')::smallint,
    nullif(p->>'birth_year', '')::smallint, nullif(trim(coalesce(p->>'age_range', '')), ''),
    nullif(trim(coalesce(p->>'address', '')), ''), nullif(trim(coalesce(p->>'state', '')), ''),
    nullif(trim(coalesce(p->>'occupation', '')), ''),
    nullif(trim(coalesce(p->>'referral', '')), ''), nullif(trim(coalesce(p->>'prayer_request', '')), ''),
    nullif(p->>'first_visit', '')::date, nullif(trim(coalesce(p->>'needs_check', '')), ''),
    case when public.is_director() then nullif(p->>'assigned_to', '')::uuid else null end
  ) returning id into v_id;
  return json_build_object('ok', true, 'id', v_id, 'existing', false);
end $$;
grant execute on function public.add_contact(jsonb) to authenticated;

create or replace function public.update_contact(p_id uuid, p jsonb)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_director() or (public.is_support() and public.support_visible_person(p_id))) then
    return json_build_object('ok', false, 'error', 'not_allowed');
  end if;
  update public.people set
    full_name      = coalesce(nullif(trim(p->>'full_name'), ''), full_name),
    phone          = case when p ? 'phone' then nullif(public.norm_phone(coalesce(p->>'phone', '')), '') else phone end,
    email          = case when p ? 'email' then nullif(lower(trim(coalesce(p->>'email', ''))), '') else email end,
    gender         = case when p ? 'gender' then nullif(p->>'gender', '') else gender end,
    birth_day      = case when p ? 'birth_day' then nullif(p->>'birth_day', '')::smallint else birth_day end,
    birth_month    = case when p ? 'birth_month' then nullif(p->>'birth_month', '')::smallint else birth_month end,
    birth_year     = case when p ? 'birth_year' then nullif(p->>'birth_year', '')::smallint else birth_year end,
    age_range      = case when p ? 'age_range' then nullif(trim(p->>'age_range'), '') else age_range end,
    address        = case when p ? 'address' then nullif(trim(p->>'address'), '') else address end,
    state          = case when p ? 'state' then nullif(trim(p->>'state'), '') else state end,
    occupation     = case when p ? 'occupation' then nullif(trim(p->>'occupation'), '') else occupation end,
    referral       = case when p ? 'referral' then nullif(trim(p->>'referral'), '') else referral end,
    prayer_request = case when p ? 'prayer_request' then nullif(trim(p->>'prayer_request'), '') else prayer_request end,
    needs_check    = case when p ? 'needs_check' then nullif(trim(p->>'needs_check'), '') else needs_check end
  where id = p_id;
  return json_build_object('ok', true);
exception when unique_violation then
  return json_build_object('ok', false, 'error', 'phone_taken');
end $$;
grant execute on function public.update_contact(uuid, jsonb) to authenticated;

-- v_contacts gains state at the END, for the same reason.
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
    -- A paid worker who is not a member (v21): staff, not a contact to call.
    when p.is_worker and p.member_since is null and coalesce(cs.steps_done, 0) < 4 then 'worker'
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
    or (p.source <> 'next_steps' and coalesce(cs.steps_done, 0) = 0 and p.member_since is null and not p.is_worker and lo.created_at is null)
  ) as waiting,
  -- Appended at the end: CREATE OR REPLACE VIEW can only add columns there.
  p.is_worker, p.worker_title, p.worker_department, p.worker_departments, p.worker_titles,
  p.state
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
