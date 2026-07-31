# Next Steps Platform — Rig Church Lagos

Sunday check-in, journey tracking, follow-up, and reporting for the Next Steps programme.
**Start with `CLAUDE.md`** — it explains the architecture, business rules, and security model.

## Quick start (fresh environment)
1. Create a Supabase project → SQL Editor → run `supabase/schema.sql`
2. Run `supabase/import-history.sql` (loads the Mar–Jul 2026 history; safe to re-run)
3. Supabase → Authentication → add staff users, then promote the admin (technical role name stays 'director') (SQL in CLAUDE.md §4)
4. Copy the Project URL + anon key into `config.js`
5. Serve the folder statically — locally: `python3 -m http.server 8080`; production: upload to
   the Hostinger subdomain

Staff app: `/` · Visitor form: `/checkin` (kiosk mode: `/checkin/?kiosk=1`)
