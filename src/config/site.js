// Ported from config.template.js's window.RIG_CONFIG. None of this is
// secret — the old template already committed real production values for
// all of it — so unlike the Supabase URL/anon key (see lib/supabaseClient.js,
// which reads those from Vite env vars instead), this is a plain committed
// module.

// Shown in the app and used for the QR code on the TV. The admin app is
// served at the domain root; the visitor check-in form lives at /checkin.
export const CHECKIN_URL = 'https://nextsteps.rigchurchlagos.org/checkin'

export const CHURCH_NAME = 'Rig Church Lagos'

// Your leader's WhatsApp number for the one-tap weekly report
// (e.g. "0803 000 0000"). Leave "" to pick the contact each time.
export const LEADER_WHATSAPP = ''

// Set to true ONLY after deploying the optional email-report add-on
// (see PHASE2-GUIDE). Emails the weekly report to leadership automatically
// when the director ends a session.
export const EMAIL_REPORTS = false

// The four steps (from the Next Steps Director SOP). Paste each step's
// video into "url" — YouTube (unlisted is fine), Vimeo, or a direct video
// file path (e.g. "/videos/session-1.mp4") if the file is hosted on this
// server instead. It will play inside Session Mode on the TV. Optional
// "fallbackUrl": a second source shown as a button under the player
// ("Stream from YouTube instead" / "Play local copy instead", whichever
// fits), in case the primary source buffers or won't play.
export const STEPS = [
  { n: 1, title: 'Why God Put You on the Earth', video: 'Session 1 — Encounter & Identity', url: 'https://youtu.be/A6-clb0SnvA', fallbackUrl: '/videos/session-1.mp4' },
  { n: 2, title: "The House You're Walking Into", video: 'Session 2 — Vision, Mission & Values', url: 'https://youtu.be/ak45wQUWpTo', fallbackUrl: '/videos/session-2.mp4' },
  { n: 3, title: 'Find Your Place', video: 'Session 3 — Gifts, Serving & Community', url: 'https://youtu.be/ZVNXobWbjL0', fallbackUrl: '/videos/session-3.mp4' },
  { n: 4, title: 'All In', video: 'Session 4 — Covenant, Commitment & Commissioning', url: 'https://youtu.be/I4sA1zJiIPc' },
]

export const stepOf = (n) => STEPS[n - 1] || { title: '?', video: '' }

// Follow-up message templates. [Name] and [Step] are filled in automatically.
export const MSG_ATTENDED = 'Hi [Name], it was great meeting you today at Step [Step]. Really glad you came. Looking forward to seeing you next Sunday!'
export const MSG_COMPLETED = "[Name], congratulations on completing Next Steps! We're celebrating you. Someone from leadership will be in touch about what comes next."
export const MSG_NOSHOW = "Hi [Name], it's the Next Steps team at RIG Church. Just wanted to check in and see how you're doing — we missed you this Sunday. No pressure, just wanted to connect."
