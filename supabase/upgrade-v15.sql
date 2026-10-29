-- ============================================================
-- UPGRADE v15 - run ONCE on your existing Supabase project
-- The redesign: Follow Up as its own area with contacts (welcome cards,
-- group lists), outcomes you can edit and delete, house church placement,
-- and Bible Study (series, sessions, a storage bucket).
-- Requires upgrade-v14.sql first. Safe to run twice.
-- Same content as supabase/migrations/20261029000001_followup_contacts_bible_study.sql.
-- ============================================================

-- ---------- 1. Contact fields on people ----------
alter table public.people alter column phone drop not null;

alter table public.people
  add column if not exists source text not null default 'next_steps',
  add column if not exists group_name text,             -- e.g. 'Law school', for source = 'group'
  add column if not exists gender text,
  add column if not exists birth_day smallint,
  add column if not exists birth_month smallint,
  add column if not exists birth_year smallint,         -- only when the card gave it
  add column if not exists age_range text,
  add column if not exists address text,
  add column if not exists occupation text,
  add column if not exists referral text,               -- who invited them / how they heard
  add column if not exists prayer_request text,
  add column if not exists first_visit date,            -- the service they filled the card in at
  add column if not exists needs_check text,            -- why the details need a human look; null = fine
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists handed_over_at timestamptz,  -- passed to Follow Up from a WhatsApp reply
  add column if not exists handover_reason text,
  add column if not exists hc_placed_in text,           -- recorded once the overseer has placed them
  add column if not exists hc_placed_on date;

do $$ begin
  alter table public.people add constraint people_source_check check (source in ('next_steps','welcome_card','group','referral'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.people add constraint people_gender_check check (gender is null or gender in ('F','M'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.people add constraint people_birthday_check check (
    (birth_day is null or birth_day between 1 and 31) and (birth_month is null or birth_month between 1 and 12));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.people add constraint people_contact_check check (phone is not null or email is not null);
exception when duplicate_object then null; end $$;

-- Follow Up's book: everyone it already saw (house church, membership
-- pipeline, open follow-ups, no-shows) plus contacts that did not come
-- through Next Steps, anyone assigned a caller, and anyone handed over
-- from a WhatsApp reply. The no-show rule here is still mirrored in
-- useFollowUp.js / the contacts view; keep them in sync.
create or replace function public.support_visible_person(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select
      p.hc_interest
      or p.member_since is not null
      or p.source <> 'next_steps'
      or p.assigned_to is not null
      or p.handed_over_at is not null
      or coalesce(cs.steps_done, 0) = 4
      or exists (
        select 1 from public.followups f
        where f.person_id = p.id and f.type = 'attended'
        and (f.status = 'pending' or (f.status in ('sent','called','texted') and f.outcome is null))
      )
      or (
        coalesce(cs.steps_done, 0) between 1 and 3
        and cs.last_seen is not null
        and cs.last_seen < (current_date - (extract(dow from current_date)::int))
      )
    from public.people p
    left join (
      select person_id, count(distinct step) as steps_done, max(checkin_date) as last_seen
      from public.checkins where person_id = p_id group by person_id
    ) cs on cs.person_id = p.id
    where p.id = p_id
  ), false);
$$;

-- ---------- 2. Outcomes ----------
create table if not exists public.outcomes (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  followup_id uuid references public.followups(id) on delete set null,
  action text not null check (action in ('called','sent','texted','door_open')),
  note text,
  logged_by uuid references public.profiles(id) on delete set null,
  note_id uuid references public.person_notes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists outcomes_person_idx on public.outcomes (person_id, created_at desc);
create index if not exists outcomes_created_idx on public.outcomes (created_at desc);

-- Carry every outcome already written on followups across, once, before
-- the triggers below exist (those outcomes already have their notes, so
-- mirroring them again would duplicate every one).
insert into public.outcomes (person_id, followup_id, action, note, created_at, updated_at)
select f.person_id, f.id, f.status, nullif(f.outcome, '(no details logged)'), f.updated_at, f.updated_at
from public.followups f
where f.outcome is not null and f.status in ('called','sent','texted','door_open')
and not exists (select 1 from public.outcomes o where o.followup_id = f.id);

alter table public.outcomes enable row level security;
drop policy if exists "staff read outcomes" on public.outcomes;
drop policy if exists "log outcomes" on public.outcomes;
drop policy if exists "edit own outcomes" on public.outcomes;
drop policy if exists "delete own outcomes" on public.outcomes;
create policy "staff read outcomes" on public.outcomes for select to authenticated
  using (public.is_director() or public.is_leader() or public.support_visible_person(person_id));
-- The admin may credit a call to whoever made it; Follow Up logs only as itself.
create policy "log outcomes" on public.outcomes for insert to authenticated
  with check (public.is_director()
    or (public.is_support() and logged_by = auth.uid() and public.support_visible_person(person_id)));
create policy "edit own outcomes" on public.outcomes for update to authenticated
  using (public.is_director() or (public.is_support() and logged_by = auth.uid()))
  with check (public.is_director()
    or (public.is_support() and logged_by = auth.uid() and public.support_visible_person(person_id)));
create policy "delete own outcomes" on public.outcomes for delete to authenticated
  using (public.is_director() or (public.is_support() and logged_by = auth.uid()));
grant select, insert, update, delete on public.outcomes to authenticated;
grant select, insert, update, delete on public.outcomes to service_role;

-- The note an outcome leaves on the person's record, in the same words
-- the old outcome modal used, so history reads the same before and after.
create or replace function public.outcome_note_text(p_action text, p_note text)
returns text language sql immutable as $$
  select 'Follow-up — ' || case p_action
    when 'sent' then 'Message sent' when 'called' then 'Called'
    when 'texted' then 'Texted' when 'door_open' then 'Door open' else p_action end
    || coalesce(': ' || nullif(trim(p_note), ''), '.');
$$;

-- Before insert: attach the person's open follow-up (if any), close it the
-- way logging an outcome always has, and write the mirrored note.
create or replace function public.outcomes_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_note uuid;
begin
  if new.followup_id is null then
    select f.id into new.followup_id from public.followups f
    where f.person_id = new.person_id and f.type = 'attended'
    and (f.status = 'pending' or (f.status in ('sent','called','texted') and f.outcome is null))
    order by f.created_at desc limit 1;
  end if;
  if new.followup_id is not null then
    update public.followups
      set status = new.action, outcome = coalesce(nullif(trim(new.note), ''), '(no details logged)'), updated_at = now()
      where id = new.followup_id;
  end if;
  insert into public.person_notes (person_id, author_id, note)
    values (new.person_id, new.logged_by, public.outcome_note_text(new.action, new.note))
    returning id into v_note;
  new.note_id := v_note;
  return new;
end $$;

create or replace function public.outcomes_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  -- Who it is about, which follow-up and which note never change on an edit.
  new.person_id := old.person_id;
  new.followup_id := old.followup_id;
  new.note_id := old.note_id;
  if new.note_id is not null then
    update public.person_notes set note = public.outcome_note_text(new.action, new.note) where id = new.note_id;
  end if;
  if new.followup_id is not null then
    update public.followups
      set status = new.action, outcome = coalesce(nullif(trim(new.note), ''), '(no details logged)'), updated_at = now()
      where id = new.followup_id;
  end if;
  return new;
end $$;

-- Deleting an outcome takes its note with it, and reopens the follow-up it
-- closed (if nothing else closed it too), so the person is waiting again.
create or replace function public.outcomes_after_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.note_id is not null then delete from public.person_notes where id = old.note_id; end if;
  if old.followup_id is not null and not exists (select 1 from public.outcomes where followup_id = old.followup_id) then
    update public.followups set outcome = null, updated_at = now() where id = old.followup_id;
  end if;
  return old;
end $$;

drop trigger if exists outcomes_bi on public.outcomes;
drop trigger if exists outcomes_bu on public.outcomes;
drop trigger if exists outcomes_ad on public.outcomes;
create trigger outcomes_bi before insert on public.outcomes for each row execute function public.outcomes_before_insert();
create trigger outcomes_bu before update on public.outcomes for each row execute function public.outcomes_before_update();
create trigger outcomes_ad after delete on public.outcomes for each row execute function public.outcomes_after_delete();

-- ---------- 3. The contacts view (Follow Up's whole world) ----------
-- Same pattern as v_support_people: NOT security_invoker, so the support
-- role can read the few people columns it needs without table access to
-- people or checkins; the WHERE clause is the restriction. No step
-- history beyond the count, no check-in rows.
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
  wf.failed_at, wf.failed_error,
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

-- The outcomes list with names attached, for the Outcomes page. NOT
-- security_invoker: support cannot read other staff profiles, so the
-- caller's name would come back empty. The WHERE clause repeats the
-- table's own read rule instead.
create or replace view public.v_outcomes as
select o.id, o.person_id, o.followup_id, o.action, o.note, o.logged_by, o.created_at, o.updated_at,
       pr.full_name as logged_by_name, pe.full_name as person_name, pe.source as person_source
from public.outcomes o
join public.people pe on pe.id = o.person_id
left join public.profiles pr on pr.id = o.logged_by
where public.is_director() or public.is_leader() or public.support_visible_person(o.person_id);
grant select on public.v_outcomes to authenticated, service_role;

-- Staff names for "who made the call" pickers and assignee badges. Only
-- id and name, never role or email, so any staff member may read them.
create or replace function public.staff_names()
returns table (id uuid, full_name text, role text) language sql stable security definer set search_path = public as $$
  select id, coalesce(nullif(full_name, ''), email), role from public.profiles
  where public.is_director() or public.is_leader() or public.is_support()
  order by 2;
$$;
grant execute on function public.staff_names() to authenticated;

-- ---------- Contact RPCs (how Follow Up writes without table access) ----------

-- Add one contact. Returns {ok, id} or {ok:false, error}. A phone already
-- on file is not a new person: it returns that person's id with
-- existing = true and changes nothing.
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
    age_range, address, occupation, referral, prayer_request, first_visit, needs_check, assigned_to)
  values (
    trim(p->>'full_name'), v_phone, v_email, v_source, nullif(trim(coalesce(p->>'group_name', '')), ''),
    nullif(p->>'gender', ''), nullif(p->>'birth_day', '')::smallint, nullif(p->>'birth_month', '')::smallint,
    nullif(p->>'birth_year', '')::smallint, nullif(trim(coalesce(p->>'age_range', '')), ''),
    nullif(trim(coalesce(p->>'address', '')), ''), nullif(trim(coalesce(p->>'occupation', '')), ''),
    nullif(trim(coalesce(p->>'referral', '')), ''), nullif(trim(coalesce(p->>'prayer_request', '')), ''),
    nullif(p->>'first_visit', '')::date, nullif(trim(coalesce(p->>'needs_check', '')), ''),
    case when public.is_director() then nullif(p->>'assigned_to', '')::uuid else null end
  ) returning id into v_id;
  return json_build_object('ok', true, 'id', v_id, 'existing', false);
end $$;
grant execute on function public.add_contact(jsonb) to authenticated;

-- Correct a contact's details, or clear its "needs a check" flag once the
-- number or email has been confirmed. Only the card fields; never steps,
-- membership or placement.
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

-- "Take it": a Follow Up caller claims an unassigned contact. Reassigning
-- someone already claimed is the admin's job (a plain people update).
create or replace function public.take_contact(p_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not (public.is_director() or (public.is_support() and public.support_visible_person(p_id))) then
    return json_build_object('ok', false, 'error', 'not_allowed');
  end if;
  update public.people set assigned_to = auth.uid() where id = p_id and assigned_to is null;
  get diagnostics n = row_count;
  return json_build_object('ok', n = 1);
end $$;
grant execute on function public.take_contact(uuid) to authenticated;

-- Admin spreadsheet import. rows: [{...add_contact fields, feedback, feedback_by}]
-- Every row goes through add_contact's rules (so a duplicate phone merges
-- into the existing person); call feedback becomes that person's first
-- outcome. Rows with a TO CHECK note arrive flagged, never skipped.
create or replace function public.import_contacts(rows jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare r jsonb; res json; v_added int := 0; v_merged int := 0; v_failed int := 0; v_outcomes int := 0;
begin
  if not public.is_director() then
    return json_build_object('ok', false, 'error', 'not_allowed');
  end if;
  for r in select * from jsonb_array_elements(rows) loop
    res := public.add_contact(r);
    if (res->>'ok')::boolean then
      if (res->>'existing')::boolean then v_merged := v_merged + 1; else v_added := v_added + 1; end if;
      if coalesce(trim(r->>'feedback'), '') <> '' then
        insert into public.outcomes (person_id, action, note, logged_by)
        values ((res->>'id')::uuid, 'called', trim(r->>'feedback'), null);
        v_outcomes := v_outcomes + 1;
      end if;
    else
      v_failed := v_failed + 1;
    end if;
  end loop;
  return json_build_object('ok', true, 'added', v_added, 'merged', v_merged, 'failed', v_failed, 'outcomes', v_outcomes);
end $$;
grant execute on function public.import_contacts(jsonb) to authenticated;

-- v_people_progress gains source at the END (CREATE OR REPLACE VIEW can
-- only append columns), so People can tell a welcome card from a Sunday.
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
  p.source
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

-- ---------- 4. Bible Study ----------
create table if not exists public.bs_series (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  short_title text,
  description text,                     -- one or two sentences on the series card
  intro text,                           -- top of the series page
  starts_on date,
  planned_sessions int,
  thumbnail_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.bs_sessions (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.bs_series(id) on delete cascade,
  number int,
  title text not null,
  taught_on date,
  passage text,
  teacher text,
  youtube_url text,
  duration text,                        -- typed in for now, e.g. '2:04:49'
  summary text,
  glance jsonb not null default '[]'::jsonb,     -- [{k, v}]
  points jsonb not null default '[]'::jsonb,     -- [{t: 'mm:ss', head, text}]
  questions jsonb not null default '[]'::jsonb,  -- ['…']
  scriptures text,
  resources jsonb not null default '[]'::jsonb,  -- [{kind, name, url, download}]
  thumbnail_url text,                   -- empty = YouTube's own thumbnail
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bs_sessions_series_idx on public.bs_sessions (series_id, number);

alter table public.bs_series enable row level security;
alter table public.bs_sessions enable row level security;
drop policy if exists "staff read series" on public.bs_series;
drop policy if exists "director write series" on public.bs_series;
drop policy if exists "staff read sessions bs" on public.bs_sessions;
drop policy if exists "director write sessions bs" on public.bs_sessions;
create policy "staff read series" on public.bs_series for select to authenticated using (public.is_director() or public.is_leader());
create policy "director write series" on public.bs_series for all to authenticated using (public.is_director()) with check (public.is_director());
-- Drafts are the admin's own work in progress; leadership sees published sessions only.
create policy "staff read sessions bs" on public.bs_sessions for select to authenticated
  using (public.is_director() or (public.is_leader() and status = 'published'));
create policy "director write sessions bs" on public.bs_sessions for all to authenticated using (public.is_director()) with check (public.is_director());
grant select, insert, update, delete on public.bs_series, public.bs_sessions to authenticated, service_role;

-- Thumbnails and study files. Public read: this is teaching material meant
-- to be shared, and public URLs work in <img> without signing. Writes are
-- the admin's only. Guarded so a plain Postgres (no storage schema) can
-- still run this file.
do $$ begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('bible-study', 'bible-study', true)
      on conflict (id) do nothing;
    drop policy if exists "bible study public read" on storage.objects;
    drop policy if exists "bible study director write" on storage.objects;
    drop policy if exists "bible study director update" on storage.objects;
    drop policy if exists "bible study director delete" on storage.objects;
    create policy "bible study public read" on storage.objects for select using (bucket_id = 'bible-study');
    create policy "bible study director write" on storage.objects for insert to authenticated with check (bucket_id = 'bible-study' and public.is_director());
    create policy "bible study director update" on storage.objects for update to authenticated using (bucket_id = 'bible-study' and public.is_director());
    create policy "bible study director delete" on storage.objects for delete to authenticated using (bucket_id = 'bible-study' and public.is_director());
  end if;
end $$;
