-- ============================================================
-- HISTORICAL DATA IMPORT — March to July 2026
-- Rig Church Lagos · Next Steps platform
-- Paste into Supabase > SQL Editor > Run. Safe to run twice:
-- existing people/check-ins/notes are not duplicated.
-- Source: connection form export + consolidated report Mar-Apr,
-- merged and cleaned (see the master workbook's Data Notes tab).
-- ============================================================
begin;

-- ── Christopher Mbukanma ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Christopher Mbukanma', '2348083461450', 'mbukanmachristopher@gmail.com', false, 'Others', '2026-03-08 11:30:00+01')
on conflict (phone) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 1, '2026-03-01', '2026-03-01 11:30:00+01' from public.people where phone='2348083461450'
on conflict (person_id, checkin_date) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 2, '2026-03-08', '2026-03-08 11:30:00+01' from public.people where phone='2348083461450'
on conflict (person_id, checkin_date) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 3, '2026-04-12', '2026-04-12 11:30:00+01' from public.people where phone='2348083461450'
on conflict (person_id, checkin_date) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 4, '2026-04-19', '2026-04-19 11:30:00+01' from public.people where phone='2348083461450'
on conflict (person_id, checkin_date) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Follow-up by Eccly, 08 Mar 2026: Away for 1 month; son hospitalized.', '2026-04-19 12:00:00+01' from public.people where phone='2348083461450'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2348083461450' and x.note='[Import] Follow-up by Eccly, 08 Mar 2026: Away for 1 month; son hospitalized.');
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Steps 1 & 2 recorded together on 8 Mar 2026 and all 4 reported complete by 19 Apr 2026; some session dates are estimates.', '2026-04-19 12:00:00+01' from public.people where phone='2348083461450'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2348083461450' and x.note='[Import] Steps 1 & 2 recorded together on 8 Mar 2026 and all 4 reported complete by 19 Apr 2026; some session dates are estimates.');

-- ── Seun Obileye ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Seun Obileye', '447551423477', 'obileyebabs1@gmail.com', false, 'Friend or Family', '2026-03-08 11:30:00+01')
on conflict (phone) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 1, '2026-03-01', '2026-03-01 11:30:00+01' from public.people where phone='447551423477'
on conflict (person_id, checkin_date) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 2, '2026-03-08', '2026-03-08 11:30:00+01' from public.people where phone='447551423477'
on conflict (person_id, checkin_date) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Follow-up by Eccly, 08 Mar 2026: Message received; expressed gratitude.', '2026-03-08 12:00:00+01' from public.people where phone='447551423477'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='447551423477' and x.note='[Import] Follow-up by Eccly, 08 Mar 2026: Message received; expressed gratitude.');
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Steps 1 & 2 were recorded together on 8 Mar 2026; Step 1 date is an estimate. UK-based number — likely diaspora or visiting.', '2026-03-08 12:00:00+01' from public.people where phone='447551423477'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='447551423477' and x.note='[Import] Steps 1 & 2 were recorded together on 8 Mar 2026; Step 1 date is an estimate. UK-based number — likely diaspora or visiting.');

-- ── Adeola Adekoya ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Adeola Adekoya', '2348141659138', 'mocute027@gmail.com', false, 'Friend or Family', '2026-03-15 11:30:00+01')
on conflict (phone) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 2, '2026-03-15', '2026-03-15 11:30:00+01' from public.people where phone='2348141659138'
on conflict (person_id, checkin_date) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 3, '2026-03-29', '2026-03-29 11:30:00+01' from public.people where phone='2348141659138'
on conflict (person_id, checkin_date) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 1, '2026-05-31', '2026-05-31 11:30:00+01' from public.people where phone='2348141659138'
on conflict (person_id, checkin_date) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Follow-up by Eccly, 15 Mar 2026: Message received; enjoys RIG services.', '2026-05-31 12:00:00+01' from public.people where phone='2348141659138'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2348141659138' and x.note='[Import] Follow-up by Eccly, 15 Mar 2026: Message received; enjoys RIG services.');
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Follow-up by Jody, 29 Mar 2026: Prayed for her legs and relationships', '2026-05-31 12:00:00+01' from public.people where phone='2348141659138'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2348141659138' and x.note='[Import] Follow-up by Jody, 29 Mar 2026: Prayed for her legs and relationships');
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Follow-up by Eccly, 05 Apr 2026: Messaged', '2026-05-31 12:00:00+01' from public.people where phone='2348141659138'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2348141659138' and x.note='[Import] Follow-up by Eccly, 05 Apr 2026: Messaged');
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Also attended 5 Apr 2026 (revision — Steps 2 & 3 already done). Most faithful attendee: 4 visits. Needs only Step 4 to complete.', '2026-05-31 12:00:00+01' from public.people where phone='2348141659138'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2348141659138' and x.note='[Import] Also attended 5 Apr 2026 (revision — Steps 2 & 3 already done). Most faithful attendee: 4 visits. Needs only Step 4 to complete.');

-- ── Omotola Banjo ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Omotola Banjo', '447985650373', 'ofolarin@hotmail.com', false, 'Friend or Family', '2026-03-15 11:30:00+01')
on conflict (phone) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 2, '2026-03-15', '2026-03-15 11:30:00+01' from public.people where phone='447985650373'
on conflict (person_id, checkin_date) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Follow-up by Eccly, 15 Mar 2026: Messaged; no response.', '2026-03-15 12:00:00+01' from public.people where phone='447985650373'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='447985650373' and x.note='[Import] Follow-up by Eccly, 15 Mar 2026: Messaged; no response.');
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] UK-based number — likely diaspora or visiting.', '2026-03-15 12:00:00+01' from public.people where phone='447985650373'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='447985650373' and x.note='[Import] UK-based number — likely diaspora or visiting.');

-- ── Fejiro Brume ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Fejiro Brume', '2349034651604', 'fejirobrume@gmail.com', false, 'Friend or Family', '2026-03-15 11:30:00+01')
on conflict (phone) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 2, '2026-03-15', '2026-03-15 11:30:00+01' from public.people where phone='2349034651604'
on conflict (person_id, checkin_date) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 3, '2026-03-22', '2026-03-22 11:30:00+01' from public.people where phone='2349034651604'
on conflict (person_id, checkin_date) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 4, '2026-04-05', '2026-04-05 11:30:00+01' from public.people where phone='2349034651604'
on conflict (person_id, checkin_date) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Follow-up by Eccly, 15 Mar 2026: Messaged; no response.', '2026-04-05 12:00:00+01' from public.people where phone='2349034651604'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2349034651604' and x.note='[Import] Follow-up by Eccly, 15 Mar 2026: Messaged; no response.');
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Follow-up by Jody, 22 Mar 2026: Messaged; expressed gratitude, added to women''s group', '2026-04-05 12:00:00+01' from public.people where phone='2349034651604'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2349034651604' and x.note='[Import] Follow-up by Jody, 22 Mar 2026: Messaged; expressed gratitude, added to women''s group');
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Follow-up by Eccly, 05 Apr 2026: Messaged', '2026-04-05 12:00:00+01' from public.people where phone='2349034651604'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2349034651604' and x.note='[Import] Follow-up by Eccly, 05 Apr 2026: Messaged');
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Needs only Step 1 to complete. Was added to the women''s group (22 Mar follow-up).', '2026-04-05 12:00:00+01' from public.people where phone='2349034651604'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2349034651604' and x.note='[Import] Needs only Step 1 to complete. Was added to the women''s group (22 Mar follow-up).');

-- ── Dauda Ardo ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Dauda Ardo', '2348035064782', 'Deearedo@gmail.com', false, 'Friend or Family', '2026-04-05 11:30:00+01')
on conflict (phone) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 1, '2026-04-05', '2026-04-05 11:30:00+01' from public.people where phone='2348035064782'
on conflict (person_id, checkin_date) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Follow-up by Eccly, 05 Apr 2026: Messaged', '2026-04-05 12:00:00+01' from public.people where phone='2348035064782'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2348035064782' and x.note='[Import] Follow-up by Eccly, 05 Apr 2026: Messaged');

-- ── Eyitemi Arubi ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Eyitemi Arubi', '2349030493494', 'eyitemiarubi45@gmail.com', false, 'Friend or Family', '2026-04-05 11:30:00+01')
on conflict (phone) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 1, '2026-04-05', '2026-04-05 11:30:00+01' from public.people where phone='2349030493494'
on conflict (person_id, checkin_date) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Follow-up by Eccly, 05 Apr 2026: Messaged', '2026-04-05 12:00:00+01' from public.people where phone='2349030493494'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2349030493494' and x.note='[Import] Follow-up by Eccly, 05 Apr 2026: Messaged');

-- ── Onyekachi Akubueze ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Onyekachi Akubueze', '2348060240868', 'onyekachiakubuze@gmail.com', false, 'Friend or Family', '2026-04-12 11:30:00+01')
on conflict (phone) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 1, '2026-04-12', '2026-04-12 11:30:00+01' from public.people where phone='2348060240868'
on conflict (person_id, checkin_date) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Follow-up by Jody, 12 Apr 2026: Messaged (WA); no response.', '2026-04-12 12:00:00+01' from public.people where phone='2348060240868'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2348060240868' and x.note='[Import] Follow-up by Jody, 12 Apr 2026: Messaged (WA); no response.');

-- ── Joseph Awa ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Joseph Awa', '2347018922556', 'Awajoejoe154@gmail.com', true, 'Others', '2026-04-12 11:30:00+01')
on conflict (phone) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 1, '2026-04-12', '2026-04-12 11:30:00+01' from public.people where phone='2347018922556'
on conflict (person_id, checkin_date) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Follow-up by Jody, 12 Apr 2026: Messaged (WA); no response.', '2026-04-12 12:00:00+01' from public.people where phone='2347018922556'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2347018922556' and x.note='[Import] Follow-up by Jody, 12 Apr 2026: Messaged (WA); no response.');

-- ── Chidozie Iroha ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Chidozie Iroha', '2347030488361', 'doziekool@gmail.com', false, 'Friend or Family', '2026-04-12 11:30:00+01')
on conflict (phone) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 1, '2026-04-12', '2026-04-12 11:30:00+01' from public.people where phone='2347030488361'
on conflict (person_id, checkin_date) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Follow-up by Jody, 12 Apr 2026: Spoke via phone.', '2026-04-12 12:00:00+01' from public.people where phone='2347030488361'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2347030488361' and x.note='[Import] Follow-up by Jody, 12 Apr 2026: Spoke via phone.');

-- ── Chinedu Okwulehie ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Chinedu Okwulehie', '2349074901001', 'ceokwulehie@gmail.com', true, 'Friend or Family', '2026-04-12 11:30:00+01')
on conflict (phone) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 1, '2026-04-12', '2026-04-12 11:30:00+01' from public.people where phone='2349074901001'
on conflict (person_id, checkin_date) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 2, '2026-04-26', '2026-04-26 11:30:00+01' from public.people where phone='2349074901001'
on conflict (person_id, checkin_date) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Follow-up by Jody, 12 Apr 2026: Messaged (WA); no response.', '2026-05-03 12:00:00+01' from public.people where phone='2349074901001'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2349074901001' and x.note='[Import] Follow-up by Jody, 12 Apr 2026: Messaged (WA); no response.');
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Also attended 3 May 2026; his form that day suggests he may have watched Step 3 — please confirm with him before crediting it.', '2026-05-03 12:00:00+01' from public.people where phone='2349074901001'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2349074901001' and x.note='[Import] Also attended 3 May 2026; his form that day suggests he may have watched Step 3 — please confirm with him before crediting it.');

-- ── Oghenerivwe Onos-Ekpo ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Oghenerivwe Onos-Ekpo', '2347082715766', 'deoluwaseyitan@gmail.com', true, 'Friend or Family', '2026-04-12 11:30:00+01')
on conflict (phone) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Follow-up by Jody, 12 Apr 2026: Messaged (SMS); no response.', '2026-04-12 12:00:00+01' from public.people where phone='2347082715766'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2347082715766' and x.note='[Import] Follow-up by Jody, 12 Apr 2026: Messaged (SMS); no response.');
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] First visited 12 Apr 2026 — the old form did not record which step ran that day, so no step is credited yet.', '2026-04-12 12:00:00+01' from public.people where phone='2347082715766'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2347082715766' and x.note='[Import] First visited 12 Apr 2026 — the old form did not record which step ran that day, so no step is credited yet.');

-- ── Oluwatosin Botti ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Oluwatosin Botti', '26876888809', 'olwabott@yahoo.com', true, 'Friend or Family', '2026-04-19 11:30:00+01')
on conflict (phone) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] First visited 19 Apr 2026 — the old form did not record which step ran that day, so no step is credited yet.', '2026-04-19 12:00:00+01' from public.people where phone='26876888809'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='26876888809' and x.note='[Import] First visited 19 Apr 2026 — the old form did not record which step ran that day, so no step is credited yet.');
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Eswatini (+268) number.', '2026-04-19 12:00:00+01' from public.people where phone='26876888809'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='26876888809' and x.note='[Import] Eswatini (+268) number.');

-- ── Felix George ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Felix George', '2349025587632', 'felixgeorge490@gmail.com', false, 'Friend or Family', '2026-05-03 11:30:00+01')
on conflict (phone) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 3, '2026-05-03', '2026-05-03 11:30:00+01' from public.people where phone='2349025587632'
on conflict (person_id, checkin_date) do nothing;

-- ── Kehinde Maja ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Kehinde Maja', '2349043062690', 'majakehinde@gmail.com', true, 'Friend or Family', '2026-05-10 11:30:00+01')
on conflict (phone) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] First visited 10 May 2026 — the old form did not record which step ran that day, so no step is credited yet.', '2026-05-10 12:00:00+01' from public.people where phone='2349043062690'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2349043062690' and x.note='[Import] First visited 10 May 2026 — the old form did not record which step ran that day, so no step is credited yet.');

-- ── Chukwuemeka Paul Ahaiwe ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Chukwuemeka Paul Ahaiwe', '13473895064', 'ahaiwedr@gmail.com', false, 'Friend or Family', '2026-05-17 11:30:00+01')
on conflict (phone) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 3, '2026-05-17', '2026-05-17 11:30:00+01' from public.people where phone='13473895064'
on conflict (person_id, checkin_date) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] US-based number (alt: 3124785468).', '2026-05-17 12:00:00+01' from public.people where phone='13473895064'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='13473895064' and x.note='[Import] US-based number (alt: 3124785468).');

-- ── Demilade Akintolu ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Demilade Akintolu', '2348053933177', 'Demiladetemiii@gmail.com', true, 'Friend or Family', '2026-05-24 11:30:00+01')
on conflict (phone) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] First visited 24 May 2026 — the old form did not record which step ran that day, so no step is credited yet.', '2026-05-24 12:00:00+01' from public.people where phone='2348053933177'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2348053933177' and x.note='[Import] First visited 24 May 2026 — the old form did not record which step ran that day, so no step is credited yet.');

-- ── Halima Akintolu-Oladiran ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Halima Akintolu-Oladiran', '2348032923350', 'Rotolubb@yahoo.com', true, 'Friend or Family', '2026-05-24 11:30:00+01')
on conflict (phone) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] First visited 24 May 2026 — the old form did not record which step ran that day, so no step is credited yet.', '2026-05-24 12:00:00+01' from public.people where phone='2348032923350'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2348032923350' and x.note='[Import] First visited 24 May 2026 — the old form did not record which step ran that day, so no step is credited yet.');

-- ── Samuel Idise ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Samuel Idise', '2348036705002', 'Samdeeidise@gmail.com', false, 'Friend or Family', '2026-06-21 11:30:00+01')
on conflict (phone) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 1, '2026-06-21', '2026-06-21 11:30:00+01' from public.people where phone='2348036705002'
on conflict (person_id, checkin_date) do nothing;

-- ── Patricia Idise ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Patricia Idise', '2347037004757', 'Patriciaidise1@gmail.com', false, 'Friend or Family', '2026-06-21 11:30:00+01')
on conflict (phone) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 1, '2026-06-21', '2026-06-21 11:30:00+01' from public.people where phone='2347037004757'
on conflict (person_id, checkin_date) do nothing;

-- ── Grace Abeje ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Grace Abeje', '2349051651304', 'adewale.jody@gmail.com', false, 'Friend or Family', '2026-06-28 11:30:00+01')
on conflict (phone) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 1, '2026-06-28', '2026-06-28 11:30:00+01' from public.people where phone='2349051651304'
on conflict (person_id, checkin_date) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Email on file is a staff email (entered on her behalf) — please collect her personal email.', '2026-06-28 12:00:00+01' from public.people where phone='2349051651304'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2349051651304' and x.note='[Import] Email on file is a staff email (entered on her behalf) — please collect her personal email.');

-- ── Nelson Monday ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Nelson Monday', '2349124401317', 'nelsonmonday@17gmail.com', false, 'Friend or Family', '2026-06-28 11:30:00+01')
on conflict (phone) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 1, '2026-06-28', '2026-06-28 11:30:00+01' from public.people where phone='2349124401317'
on conflict (person_id, checkin_date) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Email on file (nelsonmonday@17gmail.com) looks like a typo — probably nelsonmonday17@gmail.com. Verify before emailing.', '2026-06-28 12:00:00+01' from public.people where phone='2349124401317'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2349124401317' and x.note='[Import] Email on file (nelsonmonday@17gmail.com) looks like a typo — probably nelsonmonday17@gmail.com. Verify before emailing.');

-- ── Isaiah Moses ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Isaiah Moses', '2347025867966', 'Isaiahngbedemoses@gmail.com', true, 'Friend or Family', '2026-07-05 11:30:00+01')
on conflict (phone) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] First visited 05 Jul 2026 — the old form did not record which step ran that day, so no step is credited yet.', '2026-07-05 12:00:00+01' from public.people where phone='2347025867966'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2347025867966' and x.note='[Import] First visited 05 Jul 2026 — the old form did not record which step ran that day, so no step is credited yet.');

-- ── Tobiloba Sanni ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Tobiloba Sanni', '2348105289801', 'Tobilobasanni327@gmail.com', true, 'Friend or Family', '2026-07-05 11:30:00+01')
on conflict (phone) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] First visited 05 Jul 2026 — the old form did not record which step ran that day, so no step is credited yet.', '2026-07-05 12:00:00+01' from public.people where phone='2348105289801'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2348105289801' and x.note='[Import] First visited 05 Jul 2026 — the old form did not record which step ran that day, so no step is credited yet.');

-- ── Tobi Akinrinmade ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Tobi Akinrinmade', '2349061340509', 'takinrinmade@hotmail.com', false, 'Others', '2026-07-12 11:30:00+01')
on conflict (phone) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 1, '2026-07-12', '2026-07-12 11:30:00+01' from public.people where phone='2349061340509'
on conflict (person_id, checkin_date) do nothing;

-- ── Emily Umeh ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Emily Umeh', '2348030507893', 'adewale.jody@gmail.com', true, 'Others', '2026-07-12 11:30:00+01')
on conflict (phone) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] First visited 12 Jul 2026 — the old form did not record which step ran that day, so no step is credited yet.', '2026-07-12 12:00:00+01' from public.people where phone='2348030507893'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2348030507893' and x.note='[Import] First visited 12 Jul 2026 — the old form did not record which step ran that day, so no step is credited yet.');
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Email on file is a staff email (entered on her behalf) — please collect her personal email.', '2026-07-12 12:00:00+01' from public.people where phone='2348030507893'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2348030507893' and x.note='[Import] Email on file is a staff email (entered on her behalf) — please collect her personal email.');

-- ── Victoria Onafeso ──────────────────────────────
insert into public.people (full_name, phone, email, first_time, heard_about, created_at)
values ('Victoria Onafeso', '2348021204100', 'tunrayo2016@gmail.com', false, 'Social Media', '2026-07-19 11:30:00+01')
on conflict (phone) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 1, '2026-06-28', '2026-06-28 11:30:00+01' from public.people where phone='2348021204100'
on conflict (person_id, checkin_date) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 2, '2026-07-05', '2026-07-05 11:30:00+01' from public.people where phone='2348021204100'
on conflict (person_id, checkin_date) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 3, '2026-07-12', '2026-07-12 11:30:00+01' from public.people where phone='2348021204100'
on conflict (person_id, checkin_date) do nothing;
insert into public.checkins (person_id, step, checkin_date, created_at)
select id, 4, '2026-07-19', '2026-07-19 11:30:00+01' from public.people where phone='2348021204100'
on conflict (person_id, checkin_date) do nothing;
insert into public.person_notes (person_id, author_id, note, created_at)
select id, null, '[Import] Completed all 4 steps as self-reported on 19 Jul 2026. Individual session dates before 19 Jul are estimates (consecutive Sundays).', '2026-07-19 12:00:00+01' from public.people where phone='2348021204100'
and not exists (select 1 from public.person_notes x join public.people pp on pp.id=x.person_id where pp.phone='2348021204100' and x.note='[Import] Completed all 4 steps as self-reported on 19 Jul 2026. Individual session dates before 19 Jul are estimates (consecutive Sundays).');

commit;

-- Quick verification (run after the import):
select full_name, steps_done, hc_eligible, milestone from public.v_people_progress order by steps_done desc, full_name;