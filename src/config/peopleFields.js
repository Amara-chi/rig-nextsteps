import { fmtDate, fmtPhone } from '../lib/format.js'

const yn = (v) => (v ? 'Yes' : 'No')

const MILESTONE_LABELS = {
  member: 'Member',
  membership_ready: 'Ready for membership',
  membership_window: 'In membership window',
  in_journey: 'In journey',
  new: 'New',
}

// Every column the People export can include, in the order they appear in a
// downloaded sheet regardless of the order they were ticked. Same shape and
// spirit as REPORT_FIELD_DEFS: the list here is the single place a new column
// gets added, so the dropdown and the file can never drift apart.
export const PEOPLE_FIELD_DEFS = [
  { key: 'full_name', label: 'Name', value: (p) => p.full_name },
  { key: 'phone', label: 'Phone', value: (p) => fmtPhone(p.phone) },
  { key: 'email', label: 'Email', value: (p) => p.email || '' },
  { key: 'first_time', label: 'First time', value: (p) => yn(p.first_time) },
  { key: 'heard_about', label: 'How they heard', value: (p) => p.heard_about || '' },
  { key: 'steps_done', label: 'Steps done', value: (p) => p.steps_done ?? 0 },
  { key: 'steps', label: 'Steps attended', value: (p) => (p.steps || []).join(', ') },
  // Dates go out as day-month-year, the way they read everywhere else in the
  // app, rather than the raw ISO the view stores.
  { key: 'last_seen', label: 'Last seen', value: (p) => (p.last_seen ? new Date(p.last_seen).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '') },
  { key: 'completed_on', label: 'Completed on', value: (p) => (p.completed_on ? fmtDate(p.completed_on) : '') },
  { key: 'milestone', label: 'Status', value: (p) => MILESTONE_LABELS[p.milestone] || p.milestone || '' },
  { key: 'hc_interest', label: 'House church interest', value: (p) => yn(p.hc_interest) },
  { key: 'hc_eligible', label: 'House church eligible', value: (p) => yn(p.hc_eligible) },
  { key: 'serving_interest', label: 'Serving interest', value: (p) => yn(p.serving_interest) },
  { key: 'member_since', label: 'Member since', value: (p) => (p.member_since ? fmtDate(p.member_since) : '') },
  { key: 'created_at', label: 'Added on', value: (p) => (p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '') },
]

// What a first-time export gives you: the details that answer "who is this
// person and where are they in the journey", without the extra columns most
// weeks don't need.
export const DEFAULT_PEOPLE_FIELDS = [
  'full_name', 'phone', 'email', 'steps_done', 'steps', 'last_seen', 'milestone',
  'hc_interest', 'serving_interest',
]
