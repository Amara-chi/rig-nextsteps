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

// State of residence on the check-in form: Lagos first (most of the church),
// then the other 35 states and the FCT alphabetically, then a way out for
// someone visiting from abroad. Stored as the text shown here.
export const NG_STATES = [
  'Lagos',
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT (Abuja)', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
  'Outside Nigeria',
]

// Your leader's WhatsApp number for the one-tap weekly report
// (e.g. "0803 000 0000"). Leave "" to pick the contact each time.
export const LEADER_WHATSAPP = ''

// The one named account that gets the powers no other admin has: re-roling
// another admin (Team), and exporting the People list as a spreadsheet.
// Must match manage-staff's own SUPER_ADMIN_EMAIL. Note this only decides
// what the UI OFFERS — Team's real permission is enforced in the Edge
// Function, and the People export is a convenience gate, not a security
// boundary (RLS lets every admin read the same rows either way).
export const SUPER_ADMIN_EMAIL = 'adewale.jody@gmail.com'

export const isSuperAdmin = (me) => (me?.email || '').toLowerCase() === SUPER_ADMIN_EMAIL

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
export const MSG_ATTENDED = 'Hi [Name], this is Rig Church Lagos. We are glad you joined us at Next Steps. We really hope you enjoyed your time with us, and we would love to see you again soon. Have a wonderful week!'
export const MSG_COMPLETED = "[Name], congratulations on completing Next Steps! We're celebrating you. Someone from leadership will be in touch about what comes next."
export const MSG_NOSHOW = "Hi [Name], it's the Next Steps team at RIG Church. Just wanted to check in and see how you're doing — we missed you this Sunday. No pressure, just wanted to connect."

// ---------- Redesign (29 Oct 2026): roles, outcomes, messaging, contacts ----------

// The technical role names stay as they are in the database ('director',
// 'leader', 'support'); this is only what people see. 'support' is the
// Follow Up team.
export const ROLE_LABELS = { director: 'Admin', leader: 'Leadership', support: 'Follow Up' }
const ROLE_SUBS = {
  director: 'Admin · full access',
  leader: 'Leadership · read-only',
  support: 'Follow Up · calls and welcome cards',
}
export const roleLabel = (role, long = false) => (long ? ROLE_SUBS[role] : ROLE_LABELS[role]) || role || ''

// What a caller did, as stored in outcomes.action (same four values the
// old outcome modal used, so history before and after reads the same).
export const OUTCOME_ACTIONS = [
  { id: 'called', label: 'Called' },
  { id: 'sent', label: 'Sent a message (WhatsApp/SMS)' },
  { id: 'texted', label: 'Texted after no answer' },
  { id: 'door_open', label: 'No response, door open' },
]
export const outcomeLabel = (id) => ({ called: 'Called', sent: 'Sent a message', texted: 'Texted after no answer', door_open: 'No response, door open' }[id] || id)

// Why someone is in Follow Up's care, from v_contacts.reason.
export const CONTACT_REASONS = {
  failed: { label: 'Message failed', variant: 'orange' },
  reply: { label: 'From a reply', variant: 'green' },
  noshow: { label: 'Missed a Sunday', variant: 'grey' },
  completed: { label: 'Finished all 4', variant: 'navy' },
  card: { label: 'New visitor', variant: 'green' },
  group: { label: 'Group list', variant: 'grey' },
  attended: { label: 'Just attended', variant: 'grey' },
  hc: { label: 'House church', variant: 'grey' },
  member: { label: 'Member', variant: 'green' },
  worker: { label: 'Worker', variant: 'navy' },
}
export const CONTACT_SOURCES = {
  next_steps: { label: 'Next Steps', variant: 'orange' },
  welcome_card: { label: 'Welcome card', variant: 'navy' },
  group: { label: 'Group list', variant: 'grey' },
  referral: { label: 'Referred', variant: 'grey' },
}

// The three automatic messages, as Messaging shows them. `approved` mirrors
// what Meta has approved: flip it to true once WHATSAPP_TEMPLATE_COMPLETED /
// WHATSAPP_TEMPLATE_NOSHOW are set for the whatsapp-send function. It only
// changes what the page says; the function refuses unapproved templates
// regardless.
export const MESSAGE_TEMPLATES = [
  { key: 'attended', name: 'After a session', when: 'Within 24 hours of a Sunday check-in, to everyone who attended.', text: MSG_ATTENDED, approved: true },
  { key: 'completed', name: 'Finished all 4', when: 'The Sunday someone completes their fourth step.', text: MSG_COMPLETED, approved: false },
  { key: 'noshow', name: 'Missed a Sunday', when: 'Monday morning, to anyone with 1 to 3 steps done who missed the Sunday before.', text: MSG_NOSHOW, approved: false },
]
// Which kind a sent message was, from its stored template name: one of the
// three automatic messages, or an announcement sent to everyone through
// whatsapp-broadcast (any other approved template).
export const templateKeyOf = (name) => (/noshow|missed/i.test(name || '') ? 'noshow' : /complete/i.test(name || '') ? 'completed' : /followup|attended/i.test(name || '') ? 'attended' : 'announcement')

// The announcement the Send an announcement dialog starts from: the
// WhatsApp Business training, 29 Nov 2026. These words must be submitted
// to Meta as a MARKETING template under exactly this name, with the flyer
// as an image header, {{1}} where [Name] is, and a "Register now" URL
// button to the form; the dialog sends the template, and these words are
// only what the chat shows. Edit both together, or the chat shows people
// something they never received.
export const ANNOUNCEMENT_DRAFT = {
  template: 'whatsapp_business_training_nov26',
  image_url: 'https://nextsteps.rigchurchlagos.org/images/events/whatsapp-business-training-2026-11-29.jpg',
  text: `Hello [Name], you're invited to a free WhatsApp Business training at Rig Church Lagos on Sunday 29 November, 12:00 PM to 2:00 PM. The details are on the flyer. Register with the button below.`,
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const AGE_RANGES = ['Under 20', '20 to 30', '30 to 40', '40 to 50', '50 and over']
