-- ============================================================
-- UPGRADE v3 — run this ONCE on your EXISTING Supabase project
-- (Supabase > SQL Editor > paste > Run)
-- Adds: staff notes on people · house church eligibility now
-- requires completing ALL 4 steps. No data is touched.
-- ============================================================

-- ---------- Staff notes ----------
-- Any signed-in staff member (director OR leadership) can read
-- and add notes: action points, prayer points, notes for the
-- house church leader. You can delete your own notes; the
-- director can delete any.
create table if not exists public.person_notes (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);
alter table public.person_notes enable row level security;

drop policy if exists "staff read notes" on public.person_notes;
create policy "staff read notes" on public.person_notes
  for select to authenticated using (true);

drop policy if exists "staff add notes" on public.person_notes;
create policy "staff add notes" on public.person_notes
  for insert to authenticated with check (author_id = auth.uid());

drop policy if exists "author or director delete notes" on public.person_notes;
create policy "author or director delete notes" on public.person_notes
  for delete to authenticated using (author_id = auth.uid() or public.is_director());
grant select, insert, delete on public.person_notes to authenticated;

-- ---------- House church eligibility: now ALL 4 steps ----------
-- hc_eligible becomes its own true/false column (all 4 done),
-- and the milestone ladder simplifies to the membership journey.
drop view if exists public.v_people_progress;
create view public.v_people_progress
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
