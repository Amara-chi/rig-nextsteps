-- ---------- WhatsApp: unread state and the conversation list ----------
-- Read state is deliberately SHARED, not per staff member (org decision,
-- 17 Sep 2026): this is one church inbox, so once anyone opens a
-- conversation it is read for everybody. Per-user unread would let two
-- people answer the same newcomer without either realising.
alter table public.whatsapp_messages add column if not exists read_at timestamptz;

-- Partial index: the only question ever asked of this column is "which
-- inbound messages are still unread", and that set stays small.
create index if not exists whatsapp_messages_unread_idx
  on public.whatsapp_messages (person_id)
  where direction = 'in' and read_at is null;

-- Staff have no UPDATE on whatsapp_messages (the table is written only by
-- the Edge Functions), so marking a conversation read goes through this
-- instead of widening the table's policies. It re-checks visibility itself
-- rather than trusting the caller: a support account can only clear the
-- unread flag on someone it is already allowed to see.
create or replace function public.wa_mark_read(p_person_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not (public.is_director() or public.is_leader() or public.support_visible_person(p_person_id)) then
    return 0;
  end if;
  update public.whatsapp_messages
    set read_at = now(), updated_at = now()
    where person_id = p_person_id and direction = 'in' and read_at is null;
  get diagnostics n = row_count;
  return n;
end;
$$;
grant execute on function public.wa_mark_read(uuid) to authenticated, service_role;

-- One row per conversation for the Messages pane. security_invoker so the
-- table's own RLS still decides who sees which conversation; the pane is
-- director/leader only, and both can read people, so the name resolves.
-- Rows with a null person_id (someone messaging from a number not on file)
-- group by phone instead, so a stranger's message is still visible rather
-- than silently orphaned.
create or replace view public.v_wa_conversations
with (security_invoker = true) as
select
  m.person_id,
  m.phone,
  p.full_name,
  max(m.created_at) as last_at,
  max(m.created_at) filter (where m.direction = 'in') as last_in_at,
  count(*) filter (where m.direction = 'in' and m.read_at is null) as unread,
  (array_agg(m.body order by m.created_at desc))[1] as last_body,
  (array_agg(m.direction order by m.created_at desc))[1] as last_direction
from public.whatsapp_messages m
left join public.people p on p.id = m.person_id
group by m.person_id, m.phone, p.full_name;
grant select on public.v_wa_conversations to authenticated, service_role;
