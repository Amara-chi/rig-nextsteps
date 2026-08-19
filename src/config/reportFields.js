// Every field the weekly report can show. Order here is the canonical order
// they're numbered in for WhatsApp text, regardless of the order they were
// toggled on in "Customize fields".
export const REPORT_FIELD_DEFS = [
  { key: 'session_date', label: 'Session date', kind: 'detail' },
  { key: 'step', label: 'Step facilitated', kind: 'detail' },
  { key: 'facilitator', label: 'Facilitator / leader', kind: 'text' },
  { key: 'attendance', label: 'Attendance', kind: 'stat' },
  { key: 'first_timers', label: 'First-timers', kind: 'stat' },
  { key: 'first_timer_names', label: 'First-timers — names', kind: 'names' },
  { key: 'hc_interest', label: 'House church interest', kind: 'stat' },
  { key: 'hc_interest_names', label: 'House church interest — names', kind: 'names' },
  { key: 'serving_interest', label: 'Serving interest', kind: 'stat' },
  { key: 'serving_interest_names', label: 'Serving interest — names', kind: 'names' },
  { key: 'notes', label: 'Notes for leadership', kind: 'notes' },
]

export const DEFAULT_REPORT_FIELDS = REPORT_FIELD_DEFS.map((f) => f.key)
