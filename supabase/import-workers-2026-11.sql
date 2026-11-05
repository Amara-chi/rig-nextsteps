-- ============================================================
-- One-time import: the members and workers list (5 Nov 2026)
-- From contacts_2026_11_05 (the mailing-list export). Run AFTER v18.
-- Idempotent: matches people by email, so running it twice changes nothing.
--
-- Decisions taken with the admin:
-- * Everyone here is recorded as a member AND tagged as a worker.
-- * "Member since" is their mailing-list "Subscribed At" date, which is NOT
--   a confirmed membership date, so each record carries a "Needs a check"
--   note saying so. Correct the date from their record once known.
-- * Olabisi Idiong appeared twice (two emails): one person, the second
--   email kept in the check note. Earliest of the two dates used.
-- * Grace's "surname" was "Prophetic Lead": saved as her worker title.
-- * Someone already on file (same email) is tagged a worker; their existing
--   membership date and details are left as they are.
-- ============================================================

create temp table _workers (full_name text, email text, since date, title text, extra text);
insert into _workers values
  ('Michael Iroha',               'iroha43@gmail.com',              '2026-02-25', null, null),
  ('Jumai Marioghae',             'childshill220@gmail.com',        '2026-02-25', null, null),
  ('Foluke Akinyemi',             'fliky53@gmail.com',              '2026-02-25', null, null),
  ('Salem Jesutomi',              'olympiojesutomi@gmail.com',      '2026-03-28', null, null),
  ('Grace',                       'jetspring057@gmail.com',         '2026-03-14', 'Prophetic Lead', 'Only a first name on file.'),
  ('Adebusola Maja',              'adebusolamaja@gmail.com',        '2026-02-25', null, null),
  ('Dolapo Ogunlusi',             'kenniedolapoogunlusi@gmail.com', '2026-02-25', null, null),
  ('Stephen Orji',                'stevemass6@gmail.com',           '2026-02-25', null, null),
  ('Victor Chekwubechukwu Uduje', 'udujegod@gmail.com',             '2026-02-25', null, null),
  ('David Marioghae',             'riglagos2@gmail.com',            '2026-02-26', null, 'The email looks like a church account (riglagos2); confirm their own address.'),
  ('Buife Nomeh',                 'buifenomeh@gmail.com',           '2026-03-14', null, null),
  ('Eniola Ogunlusi',             'ogunlusitaiwoeniola@gmail.com',  '2026-02-25', null, null),
  ('Elomena Onome',               'elo.idise@gmail.com',            '2026-03-28', null, null),
  ('Emmanuel Damsa',              'cheekdamsa@gmail.com',           '2026-02-25', null, null),
  ('Ecclesian Batsone',           'ecclesianbatsone@gmail.com',     '2026-02-25', null, null),
  ('Olabisi Idiong',              'missolabisi@gmail.com',          '2026-02-25', null, 'Also on the list as olabisi_majekodunmi@hotmail.com; confirm which email to keep.'),
  ('Isioma Enuonye',              'isiomaenuonye@gmail.com',        '2026-02-25', null, null),
  ('Labake Koloko',               'omolabakelase@gmail.com',        '2026-02-25', null, null),
  ('Shedrack Enuonye',            'shedrackenuonye@gmail.com',      '2026-02-25', null, null),
  ('Zion',                        'olympiozion@gmail.com',          '2026-03-28', null, 'Only a first name on file.'),
  ('Benjamin Adediran',           'benmore80@gmail.com',            '2026-03-28', null, null),
  ('Onosioze Uduje',              'onosiozeuduje@gmail.com',        '2026-02-25', null, null),
  ('Kehinde Dolapo',              'kennielusie27@gmail.com',        '2026-03-28', null, 'May be the same person as Dolapo Ogunlusi (similar email); check before calling.');

-- Already on file: tag as a worker, keep what is there. Only a person who
-- had no membership date gets this list's date, and the note with it.
update public.people p set
  is_worker = true,
  worker_title = coalesce(p.worker_title, w.title),
  needs_check = case when p.member_since is null
    then concat_ws(' ', p.needs_check, 'Member since is the mailing-list subscription date, not a confirmed membership date.', w.extra)
    else p.needs_check end,
  member_since = coalesce(p.member_since, w.since)
from _workers w
where lower(p.email) = w.email and not p.is_worker;

-- Not on file: add them as members and workers, on a "Workers" list so
-- Contacts shows where they came from.
insert into public.people (full_name, email, source, group_name, member_since, is_worker, worker_title, needs_check)
select w.full_name, w.email, 'group', 'Workers', w.since, true, w.title,
  concat_ws(' ', 'Member since is the mailing-list subscription date, not a confirmed membership date.', w.extra)
from _workers w
where not exists (select 1 from public.people p where lower(p.email) = w.email);

drop table _workers;

-- Check: should list 23 people, all workers.
select full_name, email, member_since, worker_title, source
from public.people where is_worker order by full_name;
