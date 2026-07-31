-- ============================================================
-- UPGRADE v9 — run ONCE on your existing Supabase project
-- Adds a small shared settings table, first used by the Reports
-- pane's "Customize fields" button (director-only) to remember
-- which fields show on the weekly session report.
-- ============================================================

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;

drop policy if exists "staff read settings" on public.app_settings;
create policy "staff read settings" on public.app_settings for select to authenticated using (true);

drop policy if exists "director write settings" on public.app_settings;
create policy "director write settings" on public.app_settings for all to authenticated using (public.is_director()) with check (public.is_director());

grant select, insert, update, delete on public.app_settings to authenticated, service_role;
