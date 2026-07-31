-- ============================================================
-- UPGRADE v7 — run ONCE on your existing Supabase project
-- Adds a Team pane: directors can invite, remove, or re-role staff
-- from inside the app instead of hand-running SQL every time. Needs
-- the profiles.email column (for the roster) and the manage-staff
-- Edge Function (deploy separately: supabase functions deploy manage-staff).
-- ============================================================

alter table public.profiles add column if not exists email text;
update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email);
  return new;
end $$;

drop policy if exists "director read all profiles" on public.profiles;
create policy "director read all profiles" on public.profiles for select to authenticated using (public.is_director());
