-- ============================================================
-- UPGRADE v5 — run ONCE on your existing Supabase project
-- Lets the note's author (or the director) edit a staff note
-- after posting it, instead of only being able to delete it.
-- ============================================================
create policy "author or director edit notes" on public.person_notes
  for update to authenticated
  using (author_id = auth.uid() or public.is_director())
  with check (author_id = auth.uid() or public.is_director());
grant update on public.person_notes to authenticated;
