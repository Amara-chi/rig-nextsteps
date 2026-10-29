import { useState } from 'react'
import Dialog from './Dialog.jsx'
import BtnSm from './BtnSm.jsx'
import Field, { TextInput } from './Field.jsx'
import { useAppToast } from '../context/ToastContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { MONTHS } from '../config/site.js'

// Admin-only spreadsheet import for Follow Up. Built around the church's own
// follow-up sheet (DATE, NAME, GENDER, DOB, AGE RANGE, PHONE NO, ADDRESS,
// OCCUPATION, EMAIL ADD, PRAYER REQUESTS, REFERRAL, NOTES, TO CHECK) and its
// separate Call feedbacks sheet, but any CSV with a name and a phone or
// email column works. Everything is parsed in the browser and sent in one
// import_contacts() call, which applies add_contact's rules to each row.

// Minimal RFC 4180 CSV parser: quoted fields, doubled quotes, CRLF.
export function parseCSV(text) {
  const rows = []
  let row = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') q = false
      else cell += ch
    } else if (ch === '"') q = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

const norm = (h) => h.toUpperCase().replace(/[^A-Z]/g, '')
const FIELD_OF = {
  DATE: 'first_visit', NAME: 'full_name', FULLNAME: 'full_name', GENDER: 'gender', DOB: 'dob', BIRTHDAY: 'dob',
  AGERANGE: 'age_range', AGE: 'age_range', PHONENO: 'phone', PHONE: 'phone', PHONENUMBER: 'phone', ADDRESS: 'address',
  OCCUPATION: 'occupation', EMAILADD: 'email', EMAIL: 'email', PRAYERREQUESTS: 'prayer_request', PRAYERREQUEST: 'prayer_request',
  REFERRAL: 'referral', NOTES: 'notes', NOTE: 'notes', TOCHECK: 'needs_check', FEEDBACKS: 'feedback', FEEDBACK: 'feedback',
}
export const FIELD_LABEL = {
  first_visit: 'Date of first visit', full_name: 'Full name', gender: 'Gender', dob: 'Birthday', age_range: 'Age range',
  phone: 'Phone', address: 'Address or area', occupation: 'Occupation', email: 'Email', prayer_request: 'Prayer request',
  referral: 'Invited by or heard through', notes: 'First logged outcome (if no feedback)', needs_check: 'Needs a check flag', feedback: 'First logged outcome',
}

// The header row is not always the first row (the cleaned sheet has a title
// line above it), so take the first row that names a NAME and PHONE column.
function tableOf(text) {
  const rows = parseCSV(text)
  const hi = rows.findIndex((r) => r.some((c) => FIELD_OF[norm(c)] === 'full_name') && r.some((c) => ['phone', 'email'].includes(FIELD_OF[norm(c)])))
  if (hi < 0) return null
  const headers = rows[hi]
  return { headers, cols: headers.map((h) => FIELD_OF[norm(h)] || null), rows: rows.slice(hi + 1) }
}

const dmy = (s) => {
  const m = (s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''
}
const birthday = (s) => {
  const m = (s || '').trim().match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?(?:\s+(\d{4}))?$/)
  if (!m) return {}
  const mi = MONTHS.findIndex((x) => x.toLowerCase() === m[2].toLowerCase())
  return mi < 0 ? {} : { birth_day: String(Number(m[1])), birth_month: String(mi + 1), birth_year: m[3] || '' }
}
const firstPhone = (s) => (s || '').split('/')[0].trim()
const digits = (s) => (s || '').replace(/\D/g, '').replace(/^0/, '234')

function toRows(main, feedback, opts) {
  const fbBy = new Map()
  if (feedback) {
    feedback.rows.forEach((r) => {
      const get = (k) => r[feedback.cols.indexOf(k)] || ''
      const text = get('feedback').trim()
      if (!text) return
      const ph = digits(firstPhone(get('phone')))
      if (ph) fbBy.set('p' + ph, text)
      fbBy.set('n' + get('full_name').trim().toLowerCase(), text)
    })
  }
  return main.rows.map((r) => {
    const get = (k) => (main.cols.indexOf(k) >= 0 ? (r[main.cols.indexOf(k)] || '').trim() : '')
    const name = get('full_name')
    const phone = firstPhone(get('phone'))
    const g = get('gender').toUpperCase()
    const fb = get('feedback') || fbBy.get('p' + digits(phone)) || fbBy.get('n' + name.toLowerCase()) || ''
    return {
      full_name: name || 'Name not recorded',
      phone, email: get('email'), gender: g === 'F' || g === 'M' ? g : '',
      ...birthday(get('dob')),
      age_range: get('age_range'), address: get('address'), occupation: get('occupation'),
      prayer_request: get('prayer_request'), referral: get('referral'),
      first_visit: dmy(get('first_visit')),
      needs_check: [name ? '' : 'Name not recorded', get('needs_check')].filter(Boolean).join('. '),
      feedback: fb || get('notes'),
      source: opts.group ? 'group' : 'welcome_card',
      group_name: opts.group,
    }
  }).filter((x) => x.phone || x.email)
}

export default function ImportContacts({ open, onClose, onDone }) {
  const toast = useAppToast()
  const [main, setMain] = useState(null)
  const [mainName, setMainName] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [feedbackName, setFeedbackName] = useState('')
  const [group, setGroup] = useState('')
  const [busy, setBusy] = useState(false)

  const read = (setT, setN) => (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then((t) => {
      const tbl = tableOf(t)
      if (!tbl) { toast("Couldn't find a name and phone column in that file."); return }
      setT(tbl); setN(file.name)
    })
  }

  const rows = main ? toRows(main, feedback, { group: group.trim() }) : []
  const skipped = main ? main.rows.length - rows.length : 0

  const run = async () => {
    setBusy(true)
    const { data, error } = await supabase.rpc('import_contacts', { rows })
    setBusy(false)
    if (error || data?.ok === false) { toast("The import didn't go through. Check your access."); return }
    toast(`Imported: ${data.added} new, ${data.merged} already on file, ${data.outcomes} call notes carried over${data.failed ? `, ${data.failed} rows skipped` : ''}.`)
    onDone?.()
    setMain(null); setFeedback(null); setMainName(''); setFeedbackName(''); setGroup('')
    onClose()
  }

  const fileBox = 'flex flex-col items-center justify-center gap-1 min-h-22 border-[1.5px] border-dashed border-line rounded-xl bg-row-hover cursor-pointer text-center p-4'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Import a spreadsheet"
      sub="CSV from the follow-up sheet. Columns are matched to the contact record; check the matches, then import."
      footer={<>
        <BtnSm variant="outline" onClick={onClose}>Cancel</BtnSm>
        <BtnSm disabled={!rows.length || busy} onClick={run}>{busy ? 'Importing…' : rows.length ? `Import ${rows.length} contacts` : 'Import'}</BtnSm>
      </>}
    >
      <div className="grid gap-3 grid-cols-2 max-mobile:grid-cols-1">
        <label className={fileBox}>
          <span className="font-extrabold text-sm">{mainName || 'Choose the contacts sheet'}</span>
          <span className="text-xs text-muted-label">The main sheet, as CSV</span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={read(setMain, setMainName)} />
        </label>
        <label className={fileBox}>
          <span className="font-extrabold text-sm">{feedbackName || 'Call feedback sheet (optional)'}</span>
          <span className="text-xs text-muted-label">Matched by phone, then by name</span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={read(setFeedback, setFeedbackName)} />
        </label>
      </div>
      <Field label={<>Group list name <span className="font-medium text-muted-label">(only for a list like Law school; leave empty for welcome cards)</span></>} htmlFor="im-group">
        <TextInput id="im-group" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="e.g. Law school" />
      </Field>

      {main && (
        <div className="mt-5">
          <div className="font-mono text-[9.5px] tracking-[.12em] uppercase text-muted-label font-semibold mb-2">Columns found, and where each one goes</div>
          {main.headers.map((h, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)] gap-2.5 items-center py-2 border-b border-[#ECE7DA] text-[13px]">
              <span className="font-mono text-xs text-muted-body truncate">{h || '(blank)'}</span>
              <span aria-hidden="true" className="text-muted-faint">→</span>
              <span className={main.cols[i] ? 'font-bold text-ink-deep' : 'text-muted-faint'}>{main.cols[i] ? FIELD_LABEL[main.cols[i]] : 'Not imported'}</span>
            </div>
          ))}
          <div className="mt-4 bg-row-hover rounded-xl py-3 px-3.5 text-[13px] leading-normal flex flex-col gap-1">
            <span><strong>{rows.length}</strong> contacts ready{skipped ? `, ${skipped} rows skipped because they have neither a phone nor an email` : ''}.</span>
            <span>Each is tagged <strong>{group.trim() ? group.trim() : 'Welcome card'}</strong> and waits on a call, unless the sheet already has call feedback for them, which becomes their first logged outcome.</span>
            <span>A phone number already on file is not added twice. Rows with a TO CHECK note arrive flagged Needs a check, never skipped.</span>
          </div>
        </div>
      )}
    </Dialog>
  )
}
