-- ============================================================
-- UPGRADE v6 — run ONCE on your existing Supabase project
-- Adds a third staff role, 'support': it can only see people
-- flagged for house church interest, the post-4-step membership
-- pipeline, or an open follow-up (a pending message, one sent with
-- no outcome logged yet, or a no-show) — see support_visible_person()
-- below. It can add notes and log follow-up outcomes for exactly
-- those people, and nothing else: no full step history, no one
-- outside those three categories.
-- ============================================================

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('director','leader','support'));

create or replace function public.is_leader()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'leader');
$$;
create or replace function public.is_support()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'support');
$$;

create or replace function public.support_visible_person(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select
      p.hc_interest
      or p.member_since is not null
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

drop policy if exists "staff read people" on public.people;
create policy "staff read people" on public.people for select to authenticated using (public.is_director() or public.is_leader());

drop policy if exists "staff read checkins" on public.checkins;
create policy "staff read checkins" on public.checkins for select to authenticated using (public.is_director() or public.is_leader());

drop policy if exists "staff read followups" on public.followups;
create policy "staff read followups" on public.followups for select to authenticated using (public.is_director() or public.is_leader() or public.support_visible_person(person_id));

drop policy if exists "support log followups" on public.followups;
create policy "support log followups" on public.followups for insert to authenticated with check (public.is_support() and public.support_visible_person(person_id));

drop policy if exists "support update followups" on public.followups;
create policy "support update followups" on public.followups for update to authenticated using (public.is_support() and public.support_visible_person(person_id)) with check (public.is_support() and public.support_visible_person(person_id));

drop policy if exists "staff read notes" on public.person_notes;
create policy "staff read notes" on public.person_notes for select to authenticated using (public.is_director() or public.is_leader() or public.support_visible_person(person_id));

drop policy if exists "staff add notes" on public.person_notes;
create policy "staff add notes" on public.person_notes for insert to authenticated with check (author_id = auth.uid() and (public.is_director() or public.is_leader() or public.support_visible_person(person_id)));

create or replace view public.v_support_people as
select
  p.id, p.full_name, p.phone, p.email,
  p.hc_interest, p.serving_interest, p.member_since,
  coalesce(cs.steps_done, 0) as steps_done,
  cs.last_seen,
  fo.id as open_followup_id,
  fo.status as open_followup_status,
  fo.step as open_followup_step,
  case
    when p.member_since is not null then 'member'
    when coalesce(cs.steps_done, 0) = 4 then 'membership_pipeline'
    when fo.id is not null then 'awaiting_followup'
    when coalesce(cs.steps_done, 0) between 1 and 3
      and cs.last_seen is not null
      and cs.last_seen < (current_date - (extract(dow from current_date)::int))
      then 'noshow'
    when p.hc_interest then 'house_church'
    else 'other'
  end as reason
from public.people p
left join (
  select person_id, count(distinct step) as steps_done, max(checkin_date) as last_seen
  from public.checkins group by person_id
) cs on cs.person_id = p.id
left join lateral (
  select f.id, f.status, c.step from public.followups f
  left join public.checkins c on c.id = f.checkin_id
  where f.person_id = p.id and f.type = 'attended'
  and (f.status = 'pending' or (f.status in ('sent','called','texted') and f.outcome is null))
  order by f.created_at desc limit 1
) fo on true
where public.support_visible_person(p.id);
grant select on public.v_support_people to authenticated;

-- To make an existing login a support user:
--   update public.profiles set role = 'support', full_name = 'Their Name'
--   where id = (select id from auth.users where email = 'their-email@example.com');
