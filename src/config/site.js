// Ported from config.template.js's window.RIG_CONFIG. None of this is
// secret — the old template already committed real production values for
// all of it — so unlike the Supabase URL/anon key (see lib/supabaseClient.js,
// which reads those from Vite env vars instead), this is a plain committed
// module.

// Shown in the app and used for the QR code on the TV. The admin app is
// served at the domain root; the visitor check-in form lives at /checkin.
export const CHECKIN_URL = 'https://nextsteps.rigchurchlagos.org/checkin'

export const CHURCH_NAME = 'Rig Church Lagos'

// The "How did you hear about us?" answers. Shared by the visitor check-in
// form (where a first-timer picks one) and People's Edit details modal
// (where a director corrects it), so the two can never drift apart.
// Imported history predates this list, so some people hold a value that
// isn't in it — the edit modal keeps such a value as an extra option rather
// than silently overwriting it.
export const HEARD_OPTIONS = ['A friend or family member', 'Instagram', 'WhatsApp', 'Walked past / neighbourhood', 'Google search', 'Other']

// Your leader's WhatsApp number for the one-tap weekly report
// (e.g. "0803 000 0000"). Leave "" to pick the contact each time.
export const LEADER_WHATSAPP = ''

// Set to true ONLY after deploying the optional email-report add-on
// (see PHASE2-GUIDE). Emails the weekly report to leadership automatically
// when the director ends a session.
export const EMAIL_REPORTS = false

// The four steps (from the Next Steps Director SOP). Paste each step's
// video into "url" — a Google Drive share link (paste it exactly as Drive
// gives it: the /file/d/<id>/view, /open?id= and /uc?id= shapes all work,
// the player converts it to Drive's own /preview embed itself), YouTube
// (unlisted is fine), Vimeo, or a direct video file path
// (e.g. "/videos/session-1.mp4") if the file is hosted on this server
// instead. A Drive video MUST be shared as "Anyone with the link, Viewer",
// or staff get a Google sign-in wall where the player should be. Whichever
// source is used, it plays inside Session Mode on the TV. Optional
// "fallbackUrl": a second source shown as a button under the player
// ("Play local copy instead" / "Stream from Google Drive instead", named
// after whatever the fallback actually is), in case the primary source
// buffers or won't play.
export const STEPS = [
  { n: 1, title: 'Why God Put You on the Earth', video: 'Session 1 — Encounter & Identity', url: 'https://drive.google.com/file/d/19dSevBTHO7-Qq5CogEv9H2bWHlszVi4O/view?usp=sharing', fallbackUrl: 'https://youtu.be/A6-clb0SnvA' },
  { n: 2, title: "The House You're Walking Into", video: 'Session 2 — Vision, Mission & Values', url: 'https://drive.google.com/file/d/1H2evqrfdkwOxVWIyPRDqPP2EKKMMmJ7-/view?usp=drive_link', fallbackUrl: 'https://youtu.be/ak45wQUWpTo' },
  { n: 3, title: 'Find Your Place', video: 'Session 3 — Gifts, Serving & Community', url: 'https://drive.google.com/file/d/1-9fwbEUj7J_TMmWbo_vdy6SaL5GnYeGz/view?usp=drive_link', fallbackUrl: 'https://youtu.be/ZVNXobWbjL0' },
  { n: 4, title: 'All In', video: 'Session 4 — Covenant, Commitment & Commissioning', url: 'https://drive.google.com/file/d/19cUsWx81Kd6TcFMypOnutJVz7SK5jb6Y/view?usp=drive_link', fallbackUrl: 'https://youtu.be/I4sA1zJiIPc' },
]

export const stepOf = (n) => STEPS[n - 1] || { title: '?', video: '' }

// Follow-up message templates. [Name] and [Step] are filled in automatically.
// MSG_ATTENDED must stay word for word identical to the approved WhatsApp
// template "next_steps_followup", so the one-tap send and the optional
// scheduled send read as the same church. It takes no [Step], so the approved
// template has a single variable, {{1}} = first name.
export const MSG_ATTENDED = 'Hi [Name], this is Rig Church Lagos. We are glad you joined us at Next Steps today. We really hope you enjoyed your time with us, and we would love to see you again soon. Have a wonderful week!'
export const MSG_COMPLETED = "[Name], congratulations on completing Next Steps! We're celebrating you. Someone from leadership will be in touch about what comes next."
export const MSG_NOSHOW = "Hi [Name], it's the Next Steps team at RIG Church. Just wanted to check in and see how you're doing — we missed you this Sunday. No pressure, just wanted to connect."
