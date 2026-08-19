import { useEffect, useMemo, useState } from 'react'
import PageHead from '../components/PageHead.jsx'
import Card, { CardHead } from '../components/Card.jsx'
import BtnSm from '../components/BtnSm.jsx'
import Field, { TextInput } from '../components/Field.jsx'
import Modal from '../components/Modal.jsx'
import ReportDoc from '../components/ReportDoc.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { useMe } from '../context/MeContext.jsx'
import { useAppToast } from '../context/ToastContext.jsx'
import { useReports } from '../hooks/useReports.js'
import { supabase } from '../lib/supabaseClient.js'
import { downloadCSV } from '../lib/csv.js'
import { fmtDate, fmtPhone, waLink } from '../lib/format.js'
import { normPhoneJS } from '../lib/phone.js'
import { REPORT_FIELD_DEFS } from '../config/reportFields.js'
import { LEADER_WHATSAPP, stepOf } from '../config/site.js'

function waLineFor(f, r) {
  if (f.key === 'session_date') return `Date: ${fmtDate(r.session_date)}`
  if (f.key === 'step') return `Step: Step ${r.step} — ${stepOf(r.step).title}`
  if (f.key === 'attendance') return `Attendance: ${r.attendance} people`
  if (f.key === 'first_timers') return `First-timers: ${r.first_timers}`
  if (f.key === 'first_timer_names') return `First-timers (names): ${r.first_timer_names || '—'}`
  if (f.key === 'hc_interest') return `House church interest: ${r.hc_interest}`
  if (f.key === 'hc_interest_names') return `House church interest (names): ${r.hc_interest_names || '—'}`
  if (f.key === 'serving_interest') return `Serving interest: ${r.serving_interest}`
  if (f.key === 'serving_interest_names') return `Serving interest (names): ${r.serving_interest_names || '—'}`
  return ''
}

function isoDate(d) { return d.toISOString().slice(0, 10) }

function currentRange(kind, customFrom, customTo) {
  const now = new Date()
  if (kind === 'week') {
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    return { from: isoDate(monday), to: isoDate(now), label: 'This week' }
  }
  if (kind === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: isoDate(first), to: isoDate(now), label: now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) }
  }
  if (kind === 'quarter') {
    const q = Math.floor(now.getMonth() / 3)
    const first = new Date(now.getFullYear(), q * 3, 1)
    return { from: isoDate(first), to: isoDate(now), label: `Q${q + 1} ${now.getFullYear()}` }
  }
  if (kind === 'all') return { from: null, to: null, label: 'All time' }
  return { from: customFrom || null, to: customTo || null, label: 'Custom range' }
}

export default function Reports({ people }) {
  const me = useMe()
  const isDirector = me?.role === 'director'
  const toast = useAppToast()
  const { reportRows, reportFieldKeys, saveReportFields, updateSession, deleteSession, addCustomField, removeCustomField } = useReports()

  const [selectedIndex, setSelectedIndex] = useState(0)
  const r = reportRows[selectedIndex]

  const [editDate, setEditDate] = useState('')
  const [editStep, setEditStep] = useState(1)
  const [editNotes, setEditNotes] = useState('')
  const [editFacilitator, setEditFacilitator] = useState('')
  useEffect(() => {
    if (!r) return
    setEditDate(r.session_date)
    setEditStep(r.step)
    setEditNotes(r.notes || '')
    setEditFacilitator(r.facilitator || '')
  }, [r?.id])

  const [showCustomize, setShowCustomize] = useState(false)
  const [chosenKeys, setChosenKeys] = useState(reportFieldKeys)
  useEffect(() => { setChosenKeys(reportFieldKeys) }, [reportFieldKeys])
  const [showAddField, setShowAddField] = useState(false)
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldValue, setNewFieldValue] = useState('')
  const [showDelete, setShowDelete] = useState(false)

  const active = useMemo(() => reportFieldKeys.map((k) => REPORT_FIELD_DEFS.find((f) => f.key === k)).filter(Boolean), [reportFieldKeys])
  const customFields = r && Array.isArray(r.custom_fields) ? r.custom_fields : []

  const saveChanges = async () => {
    const upd = {}
    if (reportFieldKeys.includes('notes')) upd.notes = editNotes
    if (reportFieldKeys.includes('facilitator')) upd.facilitator = editFacilitator.trim() || null
    if (isDirector && reportFieldKeys.includes('session_date')) upd.session_date = editDate
    if (isDirector && reportFieldKeys.includes('step')) upd.step = editStep
    if (!Object.keys(upd).length) { toast('Nothing editable is shown — add Notes, Facilitator, Session date, or Step in Customize fields.'); return }
    const { error } = await updateSession(r.id, upd)
    toast(error ? "Couldn't save changes." : 'Changes saved.')
  }

  const sendWhatsApp = () => {
    const lines = active.map((f, idx) => {
      if (f.key === 'notes') return `${idx + 1}. Notes: ${editNotes || r.notes || '—'}`
      if (f.key === 'facilitator') return `${idx + 1}. Facilitator: ${editFacilitator || r.facilitator || '—'}`
      return `${idx + 1}. ${waLineFor(f, r)}`
    })
      .concat(customFields.map((cf, idx) => `${active.length + idx + 1}. ${cf.label}: ${cf.value}`))
      .join('\n')
    const text = `*Next Steps — Session Report*\nRig Church Lagos\n\n${lines}`
    const leader = normPhoneJS(LEADER_WHATSAPP || '')
    window.open(leader ? waLink(leader, text) : `https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  const downloadSessionCSV = async () => {
    // v_session_attendees matches by session date + step, not session_id — a
    // checkin only gets session_id set if a session was already open at that
    // moment, so filtering by session_id here undercounts the same way the
    // old attendance stat used to (see v_session_report in schema.sql).
    const { data: attendees } = await supabase.from('v_session_attendees').select('*')
      .eq('session_date', r.session_date).eq('step', r.step).order('full_name')
    const rows = [['Name', 'Phone', 'Email', 'Step', 'First-timer', 'HC interest', 'Serving interest', 'Time']]
      .concat((attendees || []).map((a) => [a.full_name, fmtPhone(a.phone), a.email || '', r.step, a.is_first_timer_today ? 'Yes' : 'No', a.hc_interest ? 'Yes' : 'No', a.serving_interest ? 'Yes' : 'No', new Date(a.checkin_time).toLocaleString('en-GB')]))
    downloadCSV(`next-steps-${r.session_date}-step${r.step}.csv`, rows)
  }

  // ---- Analytics ----
  const [rangeKind, setRangeKind] = useState('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const { from, to, label } = currentRange(rangeKind, customFrom, customTo)
  const rangeRows = useMemo(
    () => reportRows.filter((row) => (!from || row.session_date >= from) && (!to || row.session_date <= to)).sort((a, b) => (a.session_date < b.session_date ? -1 : 1)),
    [reportRows, from, to],
  )
  const maxAttendance = Math.max(...rangeRows.map((row) => row.attendance), 1)
  const totalAttendance = rangeRows.reduce((a, row) => a + Number(row.attendance), 0)
  const avgAttendance = rangeRows.length ? Math.round(totalAttendance / rangeRows.length) : 0
  const firstTimersTotal = rangeRows.reduce((a, row) => a + Number(row.first_timers), 0)
  const completions = people.filter((p) => p.steps_done === 4 && p.completed_on && (!from || p.completed_on >= from) && (!to || p.completed_on <= to)).length
  const placed = people.filter((p) => p.hc_interest).length

  const downloadMonthCSV = () => {
    const rows = [['Date', 'Step', 'Attendance', 'First-timers', 'HC interest', 'Serving interest', 'Notes']]
      .concat(rangeRows.map((row) => [row.session_date, row.step, row.attendance, row.first_timers, row.hc_interest, row.serving_interest, row.notes || '']))
    downloadCSV(`next-steps-${label.replace(/\s+/g, '-').toLowerCase()}.csv`, rows)
  }

  return (
    <>
      <PageHead title="Reports" sub="What leadership needs — auto-filled from the day's data." />
      <div className="grid grid-cols-2 gap-4.5 max-tablet:grid-cols-1">
        <Card className="mb-0">
          <CardHead
            title="Weekly session report"
            right={reportRows.length > 0 && (
              <select
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(+e.target.value)}
                className="py-2.25 px-3 border-[1.5px] border-line rounded-[10px] bg-white text-[12.5px]"
              >
                {reportRows.map((row, i) => <option key={row.id} value={i}>{fmtDate(row.session_date)} — Step {row.step}</option>)}
              </select>
            )}
          />
          {!r ? (
            <EmptyState>No sessions yet.</EmptyState>
          ) : (
            <ReportDoc
              r={r}
              active={active}
              isDirector={isDirector}
              editDate={editDate} setEditDate={setEditDate}
              editStep={editStep} setEditStep={setEditStep}
              editNotes={editNotes} setEditNotes={setEditNotes}
              editFacilitator={editFacilitator} setEditFacilitator={setEditFacilitator}
              onRemoveCustomField={async (idx) => {
                const { error } = await removeCustomField(r, idx)
                if (error) toast("Couldn't remove — check your access.")
              }}
            />
          )}
          {r && (
            <div className="flex gap-2 mt-3.5 flex-wrap">
              <BtnSm onClick={() => window.print()}>Download PDF</BtnSm>
              <BtnSm variant="outline" onClick={sendWhatsApp}>Send to leader (WhatsApp)</BtnSm>
              <BtnSm variant="outline" onClick={downloadSessionCSV}>Download attendance CSV</BtnSm>
              {isDirector && <BtnSm variant="outline" onClick={saveChanges}>Save changes</BtnSm>}
              {isDirector && <BtnSm variant="outline" onClick={() => setShowCustomize(true)}>Customize fields</BtnSm>}
              {isDirector && <BtnSm variant="outline" onClick={() => setShowAddField(true)}>Add a field</BtnSm>}
              {isDirector && <BtnSm variant="outline" className="text-orange-deep!" onClick={() => setShowDelete(true)}>Delete session</BtnSm>}
            </div>
          )}
        </Card>

        <Card className="mb-0">
          <CardHead title="Analytics" sub={label} right={<BtnSm variant="outline" onClick={downloadMonthCSV}>Download CSV</BtnSm>} />
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <select value={rangeKind} onChange={(e) => setRangeKind(e.target.value)} className="py-2.25 px-3 border-[1.5px] border-line rounded-[10px] bg-white text-[12.5px]">
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="quarter">This quarter</option>
              <option value="all">All time</option>
              <option value="custom">Custom range</option>
            </select>
            {rangeKind === 'custom' && (
              <>
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="py-2.25 px-3 border-[1.5px] border-line rounded-[10px] bg-white text-[12.5px]" />
                <span className="text-muted-label text-[12.5px]">to</span>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="py-2.25 px-3 border-[1.5px] border-line rounded-[10px] bg-white text-[12.5px]" />
              </>
            )}
          </div>
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(52px,1fr))] mt-6.5">
            {rangeRows.length ? rangeRows.map((row) => (
              <div key={row.id} className="text-center">
                <div className="h-24 flex items-end justify-center">
                  <div className="w-[min(44px,80%)] bg-orange rounded-arch relative min-h-2.5 transition-[height_.5s_cubic-bezier(.2,.8,.2,1)]" style={{ height: `${Math.max(10, (row.attendance / maxAttendance) * 100)}%` }}>
                    <div className="absolute -top-5.5 left-0 right-0 font-black text-sm text-ink-deep">{row.attendance}</div>
                  </div>
                </div>
                <div className="font-mono text-[9px] tracking-[.06em] uppercase text-muted-label mt-1.75 font-semibold">{fmtDate(row.session_date).slice(0, 6)} · S{row.step}</div>
              </div>
            )) : <div className="col-span-full"><EmptyState>No sessions in this range.</EmptyState></div>}
          </div>
          <div className="mt-4.5">
            {[
              ['Sessions run', rangeRows.length],
              ['Total attendance', totalAttendance],
              ['Average per session', avgAttendance],
              ['First-timers', firstTimersTotal],
              ['Completed all 4 (in range)', completions],
              ['House church interest (all-time)', placed],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-3 py-2 border-b border-dashed border-line last:border-b-0 text-[13px] flex-wrap">
                <div className="text-muted-label">{k}</div>
                <div className="font-bold text-ink-deep ml-auto">{v}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal
        open={showCustomize}
        title="Customize report fields"
        sub="Choose what shows on the weekly session report"
        saveLabel="Save"
        onClose={() => setShowCustomize(false)}
        onSave={async () => {
          if (!chosenKeys.length) { toast('Pick at least one field.'); return false }
          const { error } = await saveReportFields(chosenKeys)
          if (error) { toast("Couldn't save — check your access."); return false }
          toast('Report fields updated.')
        }}
      >
        {REPORT_FIELD_DEFS.map((f) => (
          <label key={f.key} className="flex items-center gap-2.25 py-2 text-[13.5px] text-ink-deep">
            <input
              type="checkbox"
              checked={chosenKeys.includes(f.key)}
              onChange={(e) => setChosenKeys((keys) => (e.target.checked ? [...keys, f.key] : keys.filter((k) => k !== f.key)))}
              className="w-4 h-4"
            />
            {f.label}
          </label>
        ))}
      </Modal>

      <Modal
        open={showAddField}
        title="Add a field"
        sub="Add something one-off to this week's report"
        saveLabel="Add field"
        onClose={() => setShowAddField(false)}
        onSave={async () => {
          const label = newFieldLabel.trim()
          const value = newFieldValue.trim()
          if (!label || !value) { toast('Enter both a title and a value.'); return false }
          const { error } = await addCustomField(r, label, value)
          if (error) { toast("Couldn't save — check your access."); return false }
          setNewFieldLabel(''); setNewFieldValue('')
          toast('Field added.')
        }}
      >
        <Field label="Field title"><TextInput value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} placeholder="e.g. Guest speaker" maxLength={60} /></Field>
        <Field label="Value"><TextInput value={newFieldValue} onChange={(e) => setNewFieldValue(e.target.value)} placeholder="e.g. Pastor John Doe" maxLength={300} /></Field>
      </Modal>

      <Modal
        open={showDelete}
        title="Delete this session?"
        sub={r ? `${fmtDate(r.session_date)} — Step ${r.step}` : ''}
        saveLabel="Yes, delete"
        onClose={() => setShowDelete(false)}
        onSave={async () => {
          const { error } = await deleteSession(r.id)
          if (error) { toast("Couldn't delete — check your access."); return false }
          setSelectedIndex(0)
          toast('Session deleted.')
        }}
      >
        <p className="text-[13px] text-muted-body mt-3">This removes the session record. Check-ins already logged against it are kept, just no longer linked to a session. It cannot be undone.</p>
      </Modal>
    </>
  )
}
