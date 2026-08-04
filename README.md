# Next Steps Platform — Rig Church Lagos

Sunday check-in, journey tracking, follow-up, and reporting for the Next Steps programme.
**Start with `CLAUDE.md`** — it explains the architecture, business rules, and security model.

## Quick start (fresh environment)
1. Create a Supabase project → SQL Editor → run `supabase/schema.sql`
2. Run `supabase/import-history.sql` (loads the Mar–Jul 2026 history; safe to re-run)
3. Supabase → Authentication → add staff users, then promote the admin (technical role name stays 'director') (SQL in CLAUDE.md §4)
4. Copy `.env.example` to `.env.local` and fill in the Project URL + anon key
5. `npm install`, then `npm run dev` locally, or `npm run build` for a production `dist/`
   (production is deployed automatically on push to `main` — see `.github/workflows/deploy.yml`)

Staff app: `/` · Visitor form: `/checkin` (kiosk mode: `/checkin/?kiosk=1`)

Built with React + Vite + Tailwind CSS v4 — see `CLAUDE.md`'s Architecture section for the
two-entry-point build shape and why it's structured that way.
