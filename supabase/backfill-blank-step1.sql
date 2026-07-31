-- ============================================================
-- BACKFILL — mark "blank" people as Step 1
-- Rig Church Lagos · Next Steps platform
-- One-time data fix, run ONCE in Supabase > SQL Editor.
-- Some records have no check-in on file at all (nothing scanned,
-- nothing imported). Per the director's decision (31 Jul 2026),
-- each of these is marked Step 1, dated to when their record was
-- created (the closest date we actually have for them).
-- Safe to run more than once: anyone who already has a check-in
-- of any kind — including one this script added — is skipped.
-- ============================================================
begin;

with blanks as (
  select p.id, p.created_at
  from public.people p
  where not exists (select 1 from public.checkins c where c.person_id = p.id)
),
ins_checkins as (
  insert into public.checkins (person_id, step, checkin_date, created_at)
  select id, 1, created_at::date, created_at from blanks
  on conflict (person_id, checkin_date) do nothing
  returning person_id
)
insert into public.person_notes (person_id, author_id, note, created_at)
select b.id, null,
  '[Import] Step 1 auto-assigned on 31 Jul 2026 — this record had no check-in on file.',
  now()
from blanks b
where not exists (
  select 1 from public.person_notes n
  where n.person_id = b.id
  and n.note = '[Import] Step 1 auto-assigned on 31 Jul 2026 — this record had no check-in on file.'
);

commit;
