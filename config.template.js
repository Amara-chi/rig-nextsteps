// ============================================================
// RIG CHURCH LAGOS — NEXT STEPS · CONFIGURATION (TEMPLATE)
// This is the git-tracked template. SUPABASE_URL and SUPABASE_ANON_KEY
// stay as placeholders here per CLAUDE.md ("real keys are never
// committed") — the deploy workflow fills them in from GitHub secrets
// at deploy time, into a config.js that is never committed.
//
// For local development, copy this file to config.js and fill in the
// two Supabase placeholders yourself (see supabase project settings > API).
// ============================================================
// Auto-deploy pipeline test: 2026-07-22.
window.RIG_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",
  SUPABASE_ANON_KEY: "PASTE-YOUR-ANON-PUBLIC-KEY-HERE",

  // Shown in the app and used for the QR code on the TV.
  // The admin app is served at the domain root; the visitor check-in form
  // (what the QR code must point to) lives at /checkin.
  CHECKIN_URL: "https://nextsteps.rigchurchlagos.org/checkin",

  CHURCH_NAME: "Rig Church Lagos",

  // ---- PHASE 2 SETTINGS ----
  // Your leader's WhatsApp number for the one-tap weekly report
  // (e.g. "0803 000 0000"). Leave "" to pick the contact each time.
  LEADER_WHATSAPP: "",

  // Set to true ONLY after deploying the optional email-report add-on
  // (see PHASE2-GUIDE). Emails the weekly report to leadership
  // automatically when the director ends a session.
  EMAIL_REPORTS: false,

  // The four steps (from the Next Steps Director SOP).
  // Paste each step's video into "url" — YouTube (unlisted is fine), Vimeo,
  // or a direct video file path (e.g. "/videos/session-1.mp4") if the file
  // is hosted on this server instead. It will play inside Session Mode on the TV.
  // Optional "youtubeUrl": when "url" is a self-hosted file, this shows a
  // "Stream from YouTube instead" button that pops the YouTube version up
  // on screen as a fallback (e.g. if the local file buffers or won't play).
  STEPS: [
    { n: 1, title: "Why God Put You on the Earth", video: "Session 1 — Encounter & Identity",              url: "/videos/session-1.mp4", youtubeUrl: "https://youtu.be/ak45wQUWpTo" },
    { n: 2, title: "The House You're Walking Into", video: "Session 2 — Vision, Mission & Values",         url: "/videos/session-2.mp4", youtubeUrl: "https://youtu.be/A6-clb0SnvA" },
    { n: 3, title: "Find Your Place",               video: "Session 3 — Gifts, Serving & Community",       url: "/videos/session-3.mp4", youtubeUrl: "https://youtu.be/ZVNXobWbjL0" },
    // n:4 stays on YouTube for now — self-hosted upload for this one is still
    // in progress (hit a couple of connection resets); switch its "url" to
    // "/videos/session-4.mp4" once that upload succeeds and is verified live.
    { n: 4, title: "All In",                        video: "Session 4 — Covenant, Commitment & Commissioning", url: "https://youtu.be/I4sA1zJiIPc" }
  ],

  // Follow-up message templates. [Name] and [Step] are filled in automatically.
  MSG_ATTENDED: "Hi [Name], it was great meeting you today at Step [Step]. Really glad you came. Looking forward to seeing you next Sunday!",
  MSG_COMPLETED: "[Name], congratulations on completing Next Steps! We're celebrating you. Someone from leadership will be in touch about what comes next.",
  MSG_NOSHOW: "Hi [Name], it's the Next Steps team at RIG Church. Just wanted to check in and see how you're doing — we missed you this Sunday. No pressure, just wanted to connect."
};
