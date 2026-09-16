-- ============================================================
-- UPGRADE v13 - run ONCE on your existing Supabase project
-- Adds the WhatsApp conversation store behind the in-app chat:
-- one table for every message to or from the church's Cloud API
-- number, plus wa_window_open(), the 24-hour customer service
-- window check that decides whether staff may type freely or must
-- send an approved template.
-- Written only by the whatsapp-webhook and whatsapp-send Edge
-- Functions; staff read it and never write to it directly.
-- ============================================================

-- ---------- WhatsApp conversations (Cloud API) ----------
-- Every message to or from the church's WhatsApp number, so staff can hold
-- a conversation inside the app instead of on a personal phone. Written
-- only by the two Edge Functions (service_role): whatsapp-webhook records
-- what comes in and how outbound messages fared, whatsapp-send records what
-- goes out. Staff never insert here directly, which is why there is no
-- INSERT policy for authenticated.
--
-- person_id is nullable on purpose: a stranger can message the number, and
-- dropping that message would be worse than keeping it unattached. Such
-- rows are visible to director/leader only, never support.
--
-- wa_message_id is Meta's own id. It is unique because Meta retries a
-- webhook delivery until it gets a 200, so the same message can arrive
-- more than once, and because delivery receipts arrive later and have to
-- find the row they belong to.
create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people(id) on delete cascade,
  phone text not null,
  direction text not null check (direction in ('in','out')),
  wa_message_id text unique,
  body text,
  template_name text,
  status text,
  error text,
  sent_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists whatsapp_messages_person_idx on public.whatsapp_messages (person_id, created_at desc);
create index if not exists whatsapp_messages_phone_idx  on public.whatsapp_messages (phone, created_at desc);

alter table public.whatsapp_messages enable row level security;
create policy "staff read whatsapp" on public.whatsapp_messages for select to authenticated
  using (
    public.is_director() or public.is_leader()
    or (person_id is not null and public.support_visible_person(person_id))
  );
grant select on public.whatsapp_messages to authenticated;
grant select, insert, update, delete on public.whatsapp_messages to service_role;

-- WhatsApp only allows free-form replies within 24 hours of the person's
-- last inbound message; outside that window a business may send approved
-- templates and nothing else. The chat UI greys out its compose box based
-- on this, and whatsapp-send refuses free text when it is false, so the
-- rule is enforced server-side rather than trusted to the client.
create or replace function public.wa_window_open(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.whatsapp_messages
    where person_id = p_id and direction = 'in'
    and created_at > now() - interval '24 hours'
  );
$$;
grant execute on function public.wa_window_open(uuid) to authenticated, service_role;
