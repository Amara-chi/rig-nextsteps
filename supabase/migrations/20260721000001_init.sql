-- ============================================================
-- RIG CHURCH LAGOS — NEXT STEPS PLATFORM
-- Database schema for Supabase (PostgreSQL)
-- Paste this entire file into: Supabase > SQL Editor > Run
-- Safe to run once on a fresh project.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Helper: normalise Nigerian phone numbers ----------
-- "0803 555 0102" -> "2348035550102" so every number is stored one way.
create or replace function public.norm_phone(p text)
returns text language sql immutable as $$
  select case
    when regexp_replace(coalesce(p,''), '\D', '', 'g') ~ '^0\d{10}$'
      then '234' || substr(regexp_replace(p, '\D', '', 'g'), 2)
    else regexp_replace(coalesce(p,''), '\D', '', 'g')
  end;
$$;

-- ============================================================
-- TABLES
-- ============================================================

-- Staff accounts (created in Supabase Authentication).
-- Every new login starts as read-only 'leader'; promote the
-- director with the UPDATE statement at the bottom of this file.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text default '',
  role text not null default 'leader' check (role in ('director','leader')),
  created_at timestamptz not null default now()
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,          -- normalised, e.g. 2348035550102
  email text,
  first_time boolean not null default false,
  heard_about text,
  hc_interest boolean not null default false,      -- house church interest
  serving_interest boolean not null default false,
  member_since date,                    -- set by leadership after the 1-month window
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  session_date date not null default current_date,
  step int not null check (step between 1 and 4),
  is_open boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  step int not null check (step between 1 and 4),
  checkin_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (person_id, checkin_date)      -- one check-in per person per day
);

create table public.followups (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  checkin_id uuid references public.checkins(id) on delete cascade,
  type text not null default 'attended' check (type in ('attended','noshow')),
  status text not null default 'pending'
    check (status in ('pending','sent','called','texted','door_open')),
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Auto-create a profile whenever a staff login is made ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Role check used by all security policies ----------
create or replace function public.is_director()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'director');
$$;

-- Staff notes on people: action points, prayer points, notes for
-- the house church leader. All staff can read and add; you can
-- delete your own notes, the director can delete any.
create table public.person_notes (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);
alter table public.person_notes enable row level security;
create policy "staff read notes" on public.person_notes for select to authenticated using (true);
create policy "staff add notes" on public.person_notes for insert to authenticated with check (author_id = auth.uid());
create policy "author or director delete notes" on public.person_notes for delete to authenticated using (author_id = auth.uid() or public.is_director());
grant select, insert, delete on public.person_notes to authenticated;

-- ============================================================
-- ROW LEVEL SECURITY
-- Visitors (anon) can touch NOTHING directly — they only go
-- through the two safe functions further below.
-- Logged-in staff can read; only the director can write.
-- ============================================================

alter table public.profiles  enable row level security;
alter table public.people    enable row level security;
alter table public.sessions  enable row level security;
alter table public.checkins  enable row level security;
alter table public.followups enable row level security;

create policy "own profile read"   on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy "staff read people"      on public.people    for select to authenticated using (true);
create policy "director write people"  on public.people    for all    to authenticated using (public.is_director()) with check (public.is_director());

create policy "staff read sessions"     on public.sessions  for select to authenticated using (true);
create policy "director write sessions" on public.sessions  for all    to authenticated using (public.is_director()) with check (public.is_director());

create policy "staff read checkins"     on public.checkins  for select to authenticated using (true);
create policy "director write checkins" on public.checkins  for all    to authenticated using (public.is_director()) with check (public.is_director());

create policy "staff read followups"     on public.followups for select to authenticated using (true);
create policy "director write followups" on public.followups for all    to authenticated using (public.is_director()) with check (public.is_director());

-- ============================================================
-- PUBLIC CHECK-IN FUNCTIONS (the only doors open to visitors)
-- ============================================================

-- Returning-visitor lookup: given a phone number, returns ONLY
-- a first name and which steps are done. Never exposes contact data.
create or replace function public.lookup_person(p_phone text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_first text; v_steps int[];
begin
  select id, split_part(full_name, ' ', 1) into v_id, v_first
  from public.people where phone = public.norm_phone(p_phone);

  if v_id is null then
    return json_build_object('found', false);
  end if;

  select coalesce(array_agg(distinct step order by step), '{}') into v_steps
  from public.checkins where person_id = v_id;

  return json_build_object('found', true, 'first_name', v_first, 'steps', v_steps);
end $$;

-- The check-in itself. Creates the person if new, records the
-- check-in (attached to today's open session if one exists),
-- and queues the 24-hour follow-up automatically.
create or replace function public.check_in(
  p_phone text,
  p_step int,
  p_name text default null,
  p_email text default null,
  p_first_time boolean default false,
  p_heard text default null
) returns json language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_first text; v_session uuid; v_checkin uuid;
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
    insert into public.people (full_name, phone, email, first_time, heard_about)
    values (trim(p_name), public.norm_phone(p_phone), nullif(trim(coalesce(p_email,'')), ''),
            coalesce(p_first_time, false), nullif(trim(coalesce(p_heard,'')), ''))
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

grant execute on function public.lookup_person(text) to anon, authenticated;
grant execute on function public.check_in(text, int, text, text, boolean, text) to anon, authenticated;

-- ============================================================
-- STAFF VIEWS (respect the security rules above)
-- ============================================================

-- Everyone's journey at a glance.
-- House church eligibility requires completing ALL 4 steps.
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
  end as milestone
from public.people p
left join (
  select person_id,
         array_agg(distinct step order by step) as steps,
         max(created_at) as last_seen,
         max(checkin_date) as completed_on
  from public.checkins
  group by person_id
) c on c.person_id = p.id;

-- The five things the SOP weekly report needs, per session.
create or replace view public.v_session_report
with (security_invoker = true) as
select
  s.id, s.session_date, s.step, s.notes, s.is_open,
  count(c.id) as attendance,
  count(c.id) filter (where p.created_at::date = s.session_date) as first_timers,
  count(distinct c.person_id) filter (where p.hc_interest) as hc_interest,
  count(distinct c.person_id) filter (where p.serving_interest) as serving_interest
from public.sessions s
left join public.checkins c on c.session_id = s.id
left join public.people  p on p.id = c.person_id
group by s.id;

-- ============================================================
-- AFTER RUNNING THIS FILE:
-- 1) Authentication > Users > Add user  (create the director's login)
-- 2) Promote that login to director by running:
--    update public.profiles set role = 'director', full_name = 'Next Steps Director'
--    where id = (select id from auth.users where email = 'YOUR-EMAIL-HERE');
-- Any other users you add stay read-only leadership automatically.
-- ============================================================
