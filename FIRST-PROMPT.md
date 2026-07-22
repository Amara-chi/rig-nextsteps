# FIRST PROMPT — paste this into Claude Code on your first session

How to start: install Claude Code (docs.claude.com/en/docs/claude-code), open a terminal,
`cd` into this folder, run `claude`, then paste everything between the lines below.

---------------------------------------------------------------

Read CLAUDE.md and README.md in full before doing anything else. They explain the
architecture, the church's business rules, the security model, and the brand rules.
Treat CLAUDE.md as authoritative.

Context: This is a finished, working v1 platform for Rig Church Lagos's Next Steps
programme, built and tested elsewhere. You are inheriting it, not rebuilding it.

Ground rules for this codebase:
1. Do not restructure the architecture. It is deliberately a static frontend (plain
   HTML/CSS/JS, no framework, no build step, no npm) plus Supabase. Keep it that way.
2. All authorization lives in the database (RLS), never in frontend checks. Any schema
   change must come with matching RLS policies and must not weaken the rules in
   CLAUDE.md's security section.
3. Business rules in CLAUDE.md (4-step journey, all-4-steps house church eligibility,
   the 30-day membership window, "the app records leadership's decisions, never makes
   them") are fixed unless I explicitly say the church has changed a policy.
4. Match the existing brand and code conventions (colours, arch motif, phone
   normalisation, one-check-in-per-day constraint).
5. UI language: the full-access role is displayed as "Admin" everywhere users can see,
   but the technical role value in the database remains 'director'. Keep both as they are.

Your first task, before writing any code: interview me to establish current deployment
state, one question at a time:
- Has the Supabase project been created, and have schema.sql and import-history.sql
  been run? (If unsure, help me check.)
- Are the staff logins created and the admin promoted?
- Is config.js filled in, and are the files live on the Hostinger subdomain?
- How far along is the WhatsApp automation (stages in the setup guide PDFs)?
Then produce a short gap checklist of what remains, and work through it with me,
verifying each step actually worked before moving to the next (e.g. after running the
import, run the verification query and show me the milestones).

After the platform is confirmed live and tested end to end, stop and ask me before
starting anything from the roadmap section of CLAUDE.md.

---------------------------------------------------------------
