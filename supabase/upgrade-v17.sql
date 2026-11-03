-- ============================================================
-- UPGRADE v17 - run ONCE on your existing Supabase project
-- Outcomes can be dated: the Log outcome form asks when the call happened
-- (today by default), and the note it leaves takes the same date. Requires
-- upgrade-v16.sql first. Safe to run twice.
-- Same content as supabase/migrations/20261103000001_outcome_dates.sql.
-- ============================================================

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
  -- The form may set the day it happened; never later than now.
  new.created_at := least(coalesce(new.created_at, now()), now());
  insert into public.person_notes (person_id, author_id, note, created_at)
    values (new.person_id, new.logged_by, public.outcome_note_text(new.action, new.note), new.created_at)
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
  new.created_at := least(coalesce(new.created_at, old.created_at), now());
  if new.note_id is not null then
    update public.person_notes set note = public.outcome_note_text(new.action, new.note), created_at = new.created_at where id = new.note_id;
  end if;
  if new.followup_id is not null then
    update public.followups
      set status = new.action, outcome = coalesce(nullif(trim(new.note), ''), '(no details logged)'), updated_at = now()
      where id = new.followup_id;
  end if;
  return new;
end $$;
