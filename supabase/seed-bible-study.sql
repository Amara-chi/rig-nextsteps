-- ============================================================
-- Bible Study seed: "The Seven Churches of Revelation" (8 sessions,
-- Jul to Sep 2026), as written up in the Design canvas mockup.
-- Optional. Run AFTER upgrade-v15.sql. Idempotent: skips anything that
-- already exists by title, so it is safe to run twice.
-- Thumbnails are the canvas's own cover art, one per session, shipped with
-- the site in public/images/bible-study/ (filled in at the end of this file).
-- ============================================================
insert into public.bs_series (title, short_title, description, intro, starts_on, planned_sessions)
select 'The Seven Churches of Revelation', 'The Seven Churches',
  'Christ''s letters to Ephesus, Smyrna, Pergamos, Thyatira, Sardis, Philadelphia and Laodicea.',
  'PDM takes each letter through its seven elements, from Christ''s title to the promise to the overcomer, and applies it to the first-century church, to every church, to each believer and to church history.',
  '2026-07-14', 8
where not exists (select 1 from public.bs_series where title = 'The Seven Churches of Revelation');

insert into public.bs_sessions (series_id, number, title, taught_on, passage, teacher, youtube_url, duration, summary, glance, points, questions, scriptures, status)
select s.id, 0, 'Introduction: The Seven Churches of Asia', '2026-07-14', 'Revelation 1', 'PDM', 'https://www.youtube.com/watch?v=himuMSofJ-A', '1:27:09',
  'Revelation is the unveiling of Jesus, not as the suffering Lamb but as the ruling King, and the only book that promises a blessing to those who read, hear and keep it. Chapter 1 introduces the seven churches of Asia and the vision of Christ walking among them.',
  '[{"k":"Writer","v":"John the beloved, around AD 95, exiled on Patmos"},{"k":"Key verse","v":"Revelation 1:3, a blessing on those who read, hear and keep"},{"k":"Outline","v":"Things seen, things which are, things to come (1:19)"},{"k":"Symbols","v":"Stars are the angels of the churches; lampstands are the churches (1:20)"}]'::jsonb,
  '[{"t":"21:21","head":"What revelation means.","text":"Apokalypsis means unveiling, not catastrophe."},{"t":"25:00","head":"Why God gives prophecy.","text":"So His people are not surprised, know what to do and have peace."},{"t":"36:12","head":"The seven churches.","text":"Real churches in Asia Minor; seven speaks of completeness."},{"t":"42:24","head":"Kings and priests.","text":"Every believer has direct access to God and is called to intercede."},{"t":"1:04:16","head":"The vision of Christ.","text":"Purity, judgement, power and authority in every detail."}]'::jsonb,
  '["What changes when you read Revelation as the unveiling of Jesus?","Why does Revelation promise a blessing to those who read, hear and keep it?","How does Christ walking among the lampstands shape how we read the letters?"]'::jsonb,
  'Revelation 1:1–20; John 1:1–14; Daniel 7:13; 1 Peter 2:9; Hebrews 4:16', 'published'
from public.bs_series s
where s.title = 'The Seven Churches of Revelation'
and not exists (select 1 from public.bs_sessions x where x.series_id = s.id and x.title = 'Introduction: The Seven Churches of Asia');

insert into public.bs_sessions (series_id, number, title, taught_on, passage, teacher, youtube_url, duration, summary, glance, points, questions, scriptures, status)
select s.id, 1, 'Ephesus: The Church That Left Its First Love', '2026-07-21', 'Revelation 2:1–7', 'PDM', 'https://www.youtube.com/watch?v=fryNjsHIrJQ', '2:04:49',
  'Ephesus guarded sound doctrine and worked hard, but lost its first love: it became so busy with the King’s business that it stopped making time for the King. God values devotion above service, success or spiritual gifts.',
  '[{"k":"Christ’s title","v":"Holds the seven stars and walks among the lampstands"},{"k":"Commendation","v":"Labour, patience, testing false apostles, hating the deeds of the Nicolaitans"},{"k":"Concern","v":"Left their first love"},{"k":"Exhortation","v":"Remember, repent, do the first works"},{"k":"Promise","v":"To eat from the tree of life"}]'::jsonb,
  '[{"t":"54:27","head":"Seven elements in every letter.","text":"Name, title, commendation, concern, exhortation, promise, close."},{"t":"58:59","head":"Report cards.","text":"Churches that thought they were doing well were often rebuked."},{"t":"1:24:27","head":"First love.","text":"Protos means the chief thing: devotion before labour."},{"t":"1:31:47","head":"The Nicolaitans.","text":"Rulers over the people; greatness comes through service."},{"t":"1:44:13","head":"Gifts are not proof of closeness.","text":"The real test is your time with God."}]'::jsonb,
  '["What are the signs that busyness has replaced devotion in your walk?","What were your “first works”, and which have faded?","If gifts can work without fellowship, how should we measure spiritual health?"]'::jsonb,
  'Revelation 2:1–7; Acts 20:29–31; Luke 10:38–42; Deuteronomy 6:4–5; 1 Corinthians 13', 'published'
from public.bs_series s
where s.title = 'The Seven Churches of Revelation'
and not exists (select 1 from public.bs_sessions x where x.series_id = s.id and x.title = 'Ephesus: The Church That Left Its First Love');

insert into public.bs_sessions (series_id, number, title, taught_on, passage, teacher, youtube_url, duration, summary, glance, points, questions, scriptures, status)
select s.id, 2, 'Smyrna: The Persecuted but Faithful Church', '2026-07-28', 'Revelation 2:8–11', 'PDM', 'https://www.youtube.com/watch?v=9vRxif5pPjY', '2:07:01',
  'Smyrna is the suffering church, and Jesus has no complaint against it. Its name comes from myrrh, which releases its fragrance only when crushed. Jesus tells a poor, persecuted church that it is rich in His sight.',
  '[{"k":"Christ’s title","v":"The First and the Last, who was dead and came to life"},{"k":"Commendation","v":"Works, tribulation and poverty, yet rich"},{"k":"Concern","v":"None"},{"k":"Exhortation","v":"Do not fear; be faithful until death"},{"k":"Promise","v":"The crown of life; not hurt by the second death"}]'::jsonb,
  '[{"t":"40:14","head":"The name Smyrna.","text":"Myrrh pictures suffering and death."},{"t":"52:50","head":"Caesar worship as the test.","text":"Christians who refused faced fire or wild beasts."},{"t":"1:01:29","head":"Poor but rich.","text":"The mirror image of Laodicea, rich but poor."},{"t":"1:18:19","head":"Polycarp.","text":"Bishop of Smyrna, faithful after 86 years of service."},{"t":"1:40:19","head":"Nothing negative.","text":"Tribulation can keep the church close to God."}]'::jsonb,
  '["Smyrna was poor but rich. Which describes you more today?","Which purposes of trials have you seen in your own life?","Why might a church under pressure stay healthier than a comfortable one?"]'::jsonb,
  'Revelation 2:8–11; John 16:33; 2 Timothy 3:12; James 1:2–4; Daniel 3', 'published'
from public.bs_series s
where s.title = 'The Seven Churches of Revelation'
and not exists (select 1 from public.bs_sessions x where x.series_id = s.id and x.title = 'Smyrna: The Persecuted but Faithful Church');

insert into public.bs_sessions (series_id, number, title, taught_on, passage, teacher, youtube_url, duration, summary, glance, points, questions, scriptures, status)
select s.id, 3, 'Pergamos: The Compromising Church', '2026-08-04', 'Revelation 2:12–17', 'PDM', 'https://www.youtube.com/watch?v=55U02zoa--c', '2:25:58',
  'Pergamos held fast to Christ’s name where Satan’s throne was, but tolerated the teaching of Balaam and the Nicolaitans. Compromise with the world was its central problem: what persecution could not do, compromise did.',
  '[{"k":"Christ’s title","v":"He who has the sharp two-edged sword"},{"k":"Commendation","v":"Held fast His name, even when Antipas was martyred"},{"k":"Concern","v":"The doctrine of Balaam and of the Nicolaitans"},{"k":"Exhortation","v":"Repent"},{"k":"Promise","v":"Hidden manna, a white stone and a new name"}]'::jsonb,
  '[{"t":"36:00","head":"From symbol to idol.","text":"The bronze serpent became Nehushtan."},{"t":"53:43","head":"Holding fast His name.","text":"Taught as faithful ambassadorship."},{"t":"58:16","head":"The doctrine of Balaam.","text":"Israel fell through immorality and idol feasts."},{"t":"1:03:53","head":"Permission is not preference.","text":"Discern what God prefers, not only what He permits."},{"t":"1:08:15","head":"Three warnings.","text":"The doctrine, the way and the error of Balaam."}]'::jsonb,
  '["Where are you most tempted to “marry” your faith to the world’s ways?","How does the third commandment as ambassadorship change your work life?","How can a gift or favour become a snare?"]'::jsonb,
  'Revelation 2:12–17; Numbers 22–25; 2 Peter 2:15; Jude 11; 2 Corinthians 6:14', 'published'
from public.bs_series s
where s.title = 'The Seven Churches of Revelation'
and not exists (select 1 from public.bs_sessions x where x.series_id = s.id and x.title = 'Pergamos: The Compromising Church');

insert into public.bs_sessions (series_id, number, title, taught_on, passage, teacher, youtube_url, duration, summary, glance, points, questions, scriptures, status)
select s.id, 4, 'Thyatira: The Tolerant Church', '2026-08-11', 'Revelation 2:18–29', 'PDM', 'https://www.youtube.com/watch?v=c5wIK1vWREE', '2:18:10',
  'Thyatira’s love, service, faith and patience were growing, but it tolerated “Jezebel”, who led believers into immorality and idolatry. No believer is beyond falling: hold fast and stay close to God.',
  '[{"k":"Christ’s title","v":"The Son of God, eyes like fire, feet like fine brass"},{"k":"Commendation","v":"Love, service, faith, patience; latest works greater than the first"},{"k":"Concern","v":"Tolerating Jezebel’s teaching"},{"k":"Exhortation","v":"Hold fast what you have until Christ comes"},{"k":"Promise","v":"Power over the nations and the morning star"}]'::jsonb,
  '[{"t":"32:35","head":"Christ’s title.","text":"He searches minds, hearts and motives."},{"t":"45:34","head":"Who Jezebel was.","text":"A church member who copied that Jezebel’s spirit."},{"t":"47:45","head":"No one is beyond falling.","text":"Let him who thinks he stands take heed."},{"t":"1:06:30","head":"The depths of Satan.","text":"Secret knowledge; the faithful are asked only to hold fast."},{"t":"1:11:25","head":"The promise.","text":"Overcomers reign with Christ, the morning star."}]'::jsonb,
  '["How can a growing church still tolerate serious error?","What “Jezebel” influences might we tolerate today?","What does “hold fast till I come” look like in practice?"]'::jsonb,
  'Revelation 2:18–29; Acts 16:14; 1 Kings 21; 1 Corinthians 10:12; Psalm 2', 'published'
from public.bs_series s
where s.title = 'The Seven Churches of Revelation'
and not exists (select 1 from public.bs_sessions x where x.series_id = s.id and x.title = 'Thyatira: The Tolerant Church');

insert into public.bs_sessions (series_id, number, title, taught_on, passage, teacher, youtube_url, duration, summary, glance, points, questions, scriptures, status)
select s.id, 5, 'Sardis: The Church That Looks Alive but Is Dead', '2026-08-18', 'Revelation 3:1–6', 'PDM', 'https://www.youtube.com/watch?v=Bl0xiOQpw6A', '2:02:12',
  'Sardis had a name for being alive, but Christ calls it dead. Its cliffs seemed impossible to climb, yet the city fell like a thief in the night because no one kept watch. The message is watchfulness and diligence.',
  '[{"k":"Christ’s title","v":"He who has the seven spirits of God and the seven stars"},{"k":"Commendation","v":"None"},{"k":"Concern","v":"A name for being alive, but dead"},{"k":"Exhortation","v":"Be watchful, strengthen what remains, repent"},{"k":"Promise","v":"White garments and a name kept in the Book of Life"}]'::jsonb,
  '[{"t":"33:50","head":"The seven spirits of God.","text":"Only the Holy Spirit can revive a dead church."},{"t":"37:00","head":"The Reformation church.","text":"It broke away, then hardened into tradition."},{"t":"1:09:44","head":"False security.","text":"Clay cliffs, sleeping guards, a city taken by night."},{"t":"1:33:58","head":"The exhortation.","text":"Watch, strengthen what remains, hold fast."},{"t":"1:55:11","head":"The faithful few.","text":"Some had not defiled their garments."}]'::jsonb,
  '["How can a believer have a good reputation but be spiritually dead?","What “clay cliffs” give you false security?","What remains in your life that needs strengthening?"]'::jsonb,
  'Revelation 3:1–6; Isaiah 11:2; Habakkuk 2:4; Matthew 25:1–13; Acts 17:11', 'published'
from public.bs_series s
where s.title = 'The Seven Churches of Revelation'
and not exists (select 1 from public.bs_sessions x where x.series_id = s.id and x.title = 'Sardis: The Church That Looks Alive but Is Dead');

insert into public.bs_sessions (series_id, number, title, taught_on, passage, teacher, youtube_url, duration, summary, glance, points, questions, scriptures, status)
select s.id, 6, 'Philadelphia: The Church of the Open Door', '2026-08-25', 'Revelation 3:7–13', 'PDM', 'https://www.youtube.com/watch?v=HVMeI0UU1e4', '2:03:49',
  'Philadelphia had little strength, yet kept Christ’s word and did not deny His name. It receives no rebuke. The central charge: hold fast what you have, that no one may take your crown.',
  '[{"k":"Christ’s title","v":"He who is holy, He who is true, who has the key of David"},{"k":"Commendation","v":"An open door, kept His word, did not deny His name"},{"k":"Concern","v":"None"},{"k":"Exhortation","v":"Hold fast what you have"},{"k":"Promise","v":"A pillar in God’s temple with His name written on it"}]'::jsonb,
  '[{"t":"31:22","head":"He who is true.","text":"God does not change, lie or withdraw His gifts."},{"t":"38:01","head":"The open door.","text":"Walk through the doors God opens."},{"t":"45:10","head":"Little strength.","text":"Weakness makes us lean on God."},{"t":"1:07:26","head":"Kept from the hour of trial.","text":"The promise is to be kept from that time."},{"t":"1:15:09","head":"Let no one take your crown.","text":"Guard your calling and place."}]'::jsonb,
  '["What doors has God opened that you have not walked through?","How can little strength become an advantage?","What does holding fast to your crown look like now?"]'::jsonb,
  'Revelation 3:7–13; Isaiah 6; 1 Corinthians 16:9; Acts 16:6–10; 2 Corinthians 12:9–10', 'published'
from public.bs_series s
where s.title = 'The Seven Churches of Revelation'
and not exists (select 1 from public.bs_sessions x where x.series_id = s.id and x.title = 'Philadelphia: The Church of the Open Door');

insert into public.bs_sessions (series_id, number, title, taught_on, passage, teacher, youtube_url, duration, summary, glance, points, questions, scriptures, status)
select s.id, 7, 'Laodicea: The Lukewarm Church', '2026-09-01', 'Revelation 3:14–22', 'PDM', 'https://www.youtube.com/watch?v=tNbEsQf-Ihw', '2:02:00',
  'Laodicea is a picture of today’s church: proud, self-sufficient and lukewarm. Jesus stands outside its door knocking. The remedy is gold refined in fire, white garments and eye salve, with zeal and repentance.',
  '[{"k":"Christ’s title","v":"The Amen, the Faithful and True Witness"},{"k":"Commendation","v":"None"},{"k":"Concern","v":"Lukewarm; rich in its own eyes but poor, blind and naked"},{"k":"Exhortation","v":"Buy gold, white garments and eye salve; repent"},{"k":"Promise","v":"To sit with Christ on His throne"}]'::jsonb,
  '[{"t":"39:51","head":"Lukewarm water.","text":"Hot springs arrived lukewarm by aqueduct."},{"t":"52:27","head":"Cold, hot and lukewarm.","text":"A form of godliness that denies its power."},{"t":"1:08:39","head":"The counsel to buy.","text":"Tested faith, true righteousness, the Spirit’s sight."},{"t":"1:09:40","head":"Chastening as love.","text":"Correction proves you are a child of God."},{"t":"1:21:11","head":"I stand at the door.","text":"Jesus outside His own church, still knocking."}]'::jsonb,
  '["What are the signs of lukewarmness in a believer?","Why is self-sufficiency so dangerous?","How does Revelation 3:20 read differently in context?"]'::jsonb,
  'Revelation 3:14–22; 2 Timothy 3:1–5; Matthew 24:12; Hebrews 12:6–8; James 4:4', 'published'
from public.bs_series s
where s.title = 'The Seven Churches of Revelation'
and not exists (select 1 from public.bs_sessions x where x.series_id = s.id and x.title = 'Laodicea: The Lukewarm Church');

-- Cover art from the design canvas, one per session by number (0 to 7), and
-- the introduction's cover for the series card. Only fills an empty
-- thumbnail, so a cover chosen later in Upload is never overwritten. Safe to
-- run on its own against a database seeded before the covers existed.
update public.bs_sessions v
set thumbnail_url = '/images/bible-study/seven-churches-' || v.number || '.jpg'
from public.bs_series s
where v.series_id = s.id and s.title = 'The Seven Churches of Revelation'
and v.number between 0 and 7 and coalesce(v.thumbnail_url, '') = '';

update public.bs_series
set thumbnail_url = '/images/bible-study/seven-churches-0.jpg'
where title = 'The Seven Churches of Revelation' and coalesce(thumbnail_url, '') = '';
