import { useEffect, useMemo, useState } from 'react'
import Dialog from './Dialog.jsx'
import Avatar from './Avatar.jsx'
import Badge from './Badge.jsx'
import BtnSm from './BtnSm.jsx'
import NotesThread from './NotesThread.jsx'
import Field, { TextInput, Select, Textarea } from './Field.jsx'
import { useMe } from '../context/MeContext.jsx'
import { useAppToast } from '../context/ToastContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { fmtBirthday, fmtDate, fmtPhone, fmtWhen, localDay, telHref, todayStr } from '../lib/format.js'
import { AGE_RANGES, CONTACT_REASONS, CONTACT_SOURCES, MONTHS, OUTCOME_ACTIONS, outcomeLabel } from '../config/site.js'

// Shared pieces for the Follow Up pages (dashboard, Contacts, Outcomes,
// Membership, House Church), so a contact looks and behaves the same
// wherever it appears.

export const checkBadgeClass = 'inline-flex items-center px-2.5 py-0.75 rounded-full text-[10.5px] font-bold whitespace-nowrap bg-amber-bg text-amber-text border border-amber-border'

export function SourceBadge({ c }) {
  const s = CONTACT_SOURCES[c.source] || CONTACT_SOURCES.next_steps
  return <Badge variant={s.variant}>{c.source === 'group' && c.group_name ? c.group_name : s.label}</Badge>
}

export function ReasonBadge({ c }) {
  const r = CONTACT_REASONS[c.reason]
  return r ? <Badge variant={r.variant}>{r.label}</Badge> : null
}

// One line on why someone is in Follow Up's care, from the view's flags.
export function whyLine(c) {
  switch (c.reason) {
    case 'failed': return `The automatic message did not arrive${c.failed_error ? ` (${c.failed_error})` : ''}. Nobody has reached them yet.`
    case 'reply': return c.handover_reason ? `Wrote back: “${c.handover_reason}”` : 'Wrote back to the church number and needs a person.'
    case 'noshow': return `${c.steps_done} of 4 steps done. Last seen ${fmtDate(c.last_seen)}. Monday call, then a text, then the door stays open.`
    case 'completed': return `Finished all four steps ${fmtDate(c.completed_on)}. Worth a congratulations call.`
    case 'card': return `Filled in the welcome card${c.first_visit ? ' on ' + fmtDate(c.first_visit) : ''}${c.referral ? ', invited by ' + c.referral : ''}.`
    case 'group': return `On the ${c.group_name || 'group'} list${c.first_visit ? ', added ' + fmtDate(c.first_visit) : ''}.`
    case 'attended': return 'Checked in on Sunday. The automatic thank-you is on its way.'
    case 'hc': return 'Interested in a house church.'
    default: return c.member_since ? `Member since ${fmtDate(c.member_since)}.` : ''
  }
}

export function CallLink({ phone, className = '' }) {
  if (!phone) return <span className="font-mono text-[11px] text-muted-faint">No phone on file</span>
  return (
    <a href={telHref(phone)} className={`inline-flex items-center gap-1.5 font-mono text-xs text-ink-deep no-underline py-2 px-3 rounded-[10px] border-[1.5px] border-line bg-white whitespace-nowrap hover:border-orange ${className}`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" /></svg>
      {fmtPhone(phone)}
    </a>
  )
}

export function AssigneeBadge({ c, me }) {
  if (!c.assigned_to) return <span className="inline-flex px-2.5 py-0.75 rounded-full text-[10.5px] font-bold border-[1.5px] border-dashed border-line text-muted-label">Nobody yet</span>
  if (c.assigned_to === me?.id) return <Badge variant="orange">Mine</Badge>
  return <Badge variant="grey">{(c.assigned_name || '').split(' ')[0] || 'Assigned'}</Badge>
}

// ---------- Outcome form: log a new one, or edit one ----------
// person: the contact (or null to pick one); outcome: an existing outcome to edit.
export function OutcomeDialog({ open, person, outcome, contacts = [], staff = [], onClose, onSaved }) {
  const me = useMe()
  const toast = useAppToast()
  const isDirector = me?.role === 'director'
  const editing = !!outcome
  const [personId, setPersonId] = useState('')
  const [action, setAction] = useState('called')
  const [note, setNote] = useState('')
  const [by, setBy] = useState('')
  const [day, setDay] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setPersonId(person?.id || outcome?.person_id || '')
    setAction(outcome?.action || 'called')
    setNote(outcome?.note || '')
    setBy(outcome?.logged_by || me?.id || '')
    setDay(localDay(outcome?.created_at))
  }, [open, person, outcome, me])

  const picking = !person && !outcome
  const target = person || contacts.find((c) => c.id === personId)
  const choosable = useMemo(() => contacts.filter((c) => c.waiting).concat(contacts.filter((c) => !c.waiting)), [contacts])

  const save = async () => {
    if (!personId) { toast('Pick who you contacted.'); return }
    if (!day || day > localDay()) { toast('Pick the day it happened, today or earlier.'); return }
    setSaving(true)
    const row = { action, note: note.trim() || null }
    // Today (or an unchanged day on an edit) keeps the real time; another
    // day is recorded at midday Lagos time so it never slips across midnight.
    const unchanged = editing ? day === localDay(outcome.created_at) : day === localDay()
    if (!unchanged) row.created_at = `${day}T12:00:00+01:00`
    if (isDirector) row.logged_by = by || me.id
    const { error } = editing
      ? await supabase.from('outcomes').update(row).eq('id', outcome.id)
      : await supabase.from('outcomes').insert({ ...row, person_id: personId, logged_by: isDirector ? (by || me.id) : me.id })
    setSaving(false)
    if (error) { toast("Couldn't save that. Check your access."); return }
    toast(editing ? 'Outcome updated, and the note on their record with it.' : 'Outcome logged, and saved as a note on their record.')
    onSaved?.()
    onClose()
  }

  return (
    <Dialog
      open={open}
      width={540}
      onClose={onClose}
      title={editing ? `Edit outcome: ${outcome.person_name || target?.full_name || ''}` : picking ? 'Log an outcome' : `Log outcome: ${target?.full_name || ''}`}
      sub={editing ? `Logged by ${outcome.logged_by_name || 'someone before the app'} on ${fmtWhen(outcome.created_at)}.` : target ? whyLine(target) : 'Pick who you contacted, say what you did and what happened. It is saved as a note on their record.'}
      footer={<>
        <BtnSm variant="outline" onClick={onClose}>Cancel</BtnSm>
        <BtnSm disabled={saving} onClick={save}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Log it'}</BtnSm>
      </>}
    >
      {picking && (
        <Field label="Who did you contact?" htmlFor="oc-person" className="mt-0!">
          <Select id="oc-person" value={personId} onChange={(e) => setPersonId(e.target.value)}>
            <option value="">Choose a contact…</option>
            {choosable.map((c) => <option key={c.id} value={c.id}>{c.full_name}{c.waiting ? ' · waiting' : ''}</option>)}
          </Select>
        </Field>
      )}
      <div className={`grid gap-3 grid-cols-2 max-mobile:grid-cols-1 ${picking ? '' : '-mt-4'}`}>
        <Field label="Who made the call?" htmlFor="oc-by">
          {isDirector ? (
            <Select id="oc-by" value={by} onChange={(e) => setBy(e.target.value)}>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}{s.id === me.id ? ' (me)' : ''}</option>)}
            </Select>
          ) : (
            <div id="oc-by" className="py-3.5 px-3.75 border-[1.5px] border-line rounded-xl bg-row-hover text-[15px] font-bold">{me?.full_name} (you)</div>
          )}
        </Field>
        <Field label="What did you do?" htmlFor="oc-action">
          <Select id="oc-action" value={action} onChange={(e) => setAction(e.target.value)}>
            {OUTCOME_ACTIONS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </Select>
        </Field>
        <Field label="When was it?" htmlFor="oc-day">
          <TextInput id="oc-day" type="date" value={day} max={localDay()} onChange={(e) => setDay(e.target.value)} />
        </Field>
      </div>
      {target?.prayer_request && (
        <div className="mt-4 bg-row-hover rounded-xl py-3 px-3.5 text-[13px] text-ink leading-normal">
          <span className="font-mono text-[9.5px] tracking-[.1em] uppercase text-muted-label font-semibold mr-1.5">Their prayer request</span>{target.prayer_request}
        </div>
      )}
      <Field label={<>What happened? <span className="font-medium text-muted-label">(saved as a note all staff can see)</span></>} htmlFor="oc-note">
        <Textarea id="oc-note" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Spoke on the phone, prayed together, coming back for Step 4." />
      </Field>
    </Dialog>
  )
}

export function DeleteOutcomeDialog({ outcome, onClose, onDeleted }) {
  const toast = useAppToast()
  const [busy, setBusy] = useState(false)
  const del = async () => {
    setBusy(true)
    const { error } = await supabase.from('outcomes').delete().eq('id', outcome.id)
    setBusy(false)
    if (error) { toast("Couldn't delete that. Check your access."); return }
    toast('Outcome deleted. If they still need a call, they are back under Waiting.')
    onDeleted?.()
    onClose()
  }
  return (
    <Dialog
      open={!!outcome}
      width={460}
      onClose={onClose}
      title="Delete this outcome?"
      sub={outcome ? `${outcome.person_name}, logged by ${outcome.logged_by_name || 'someone before the app'} ${fmtWhen(outcome.created_at)}.` : ''}
      footer={<>
        <BtnSm variant="outline" onClick={onClose}>Keep it</BtnSm>
        <BtnSm variant="outline" className="border-[#E8B4A6]! text-orange-deep!" disabled={busy} onClick={del}>Delete</BtnSm>
      </>}
    >
      {outcome && (
        <>
          <div className="bg-row-hover rounded-xl py-3 px-3.5 text-[13px] leading-normal"><strong>{outcomeLabel(outcome.action)}.</strong> {outcome.note || 'No note written.'}</div>
          <p className="text-xs text-muted-sub mt-3 leading-normal">The note it saved on the person's record goes with it.</p>
        </>
      )}
    </Dialog>
  )
}

// ---------- Add (or edit) a contact ----------
const blankContact = { full_name: '', phone: '', email: '', source: 'welcome_card', group_name: '', gender: '', birth_day: '', birth_month: '', birth_year: '', age_range: '', address: '', occupation: '', referral: '', prayer_request: '', first_visit: '', needs_check: '', assigned_to: '' }

export function ContactFormDialog({ open, contact, staff = [], onClose, onSaved }) {
  const me = useMe()
  const toast = useAppToast()
  const isDirector = me?.role === 'director'
  const editing = !!contact
  const [f, setF] = useState(blankContact)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (contact) {
      const c = {}
      Object.keys(blankContact).forEach((k) => { c[k] = contact[k] ?? '' })
      c.phone = contact.phone ? fmtPhone(contact.phone) : ''
      setF(c)
    } else setF({ ...blankContact, first_visit: todayStr() })
  }, [open, contact])

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const save = async () => {
    if (!f.full_name.trim()) { toast('Add their name.'); return }
    if (!f.phone.trim() && !f.email.trim()) { toast('Add a phone number or an email.'); return }
    setSaving(true)
    const payload = { ...f }
    if (editing) {
      ;['source', 'group_name', 'first_visit', 'assigned_to'].forEach((k) => delete payload[k])
      const { data, error } = await supabase.rpc('update_contact', { p_id: contact.id, p: payload })
      setSaving(false)
      if (error || data?.ok === false) { toast(data?.error === 'phone_taken' ? 'That phone number belongs to someone else on file.' : "Couldn't save that. Check your access."); return }
      toast('Details saved.')
    } else {
      const { data, error } = await supabase.rpc('add_contact', { p: payload })
      setSaving(false)
      if (error || data?.ok === false) { toast("Couldn't add that contact. Check the name and phone or email."); return }
      toast(data.existing ? 'That number is already on file, so nothing new was added. Search for them in Contacts.' : 'Contact added. They are waiting on a call.')
    }
    onSaved?.()
    onClose()
  }

  const g = 'grid gap-x-3 grid-cols-2 max-mobile:grid-cols-1'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? `Edit details: ${contact.full_name}` : 'Add a contact'}
      sub={editing ? 'Correct what the card said, or clear the check flag once the number or email is confirmed.' : 'Usually what a newcomer wrote on the welcome card. Only the name and a phone or email are required.'}
      footer={<>
        <BtnSm variant="outline" onClick={onClose}>Cancel</BtnSm>
        <BtnSm disabled={saving} onClick={save}>{saving ? 'Saving…' : editing ? 'Save details' : 'Save contact'}</BtnSm>
      </>}
    >
      {!editing && (
        <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Where this contact came from">
          {[['welcome_card', 'Welcome card'], ['group', 'Group list'], ['referral', 'Referred by a member']].map(([k, l]) => (
            <button key={k} type="button" aria-pressed={f.source === k} onClick={() => setF((x) => ({ ...x, source: k }))}
              className={`min-h-9 px-3.5 rounded-full text-xs font-bold border-[1.5px] ${f.source === k ? 'bg-ink-deep border-ink-deep text-white' : 'bg-white border-line text-ink'}`}>{l}</button>
          ))}
        </div>
      )}
      <Field label="Full name" htmlFor="cf-name" className={editing ? 'mt-0!' : ''}><TextInput id="cf-name" value={f.full_name} onChange={set('full_name')} /></Field>
      {!editing && f.source === 'group' && <Field label="Which list?" htmlFor="cf-group"><TextInput id="cf-group" value={f.group_name} onChange={set('group_name')} placeholder="e.g. Law school" /></Field>}
      <div className={g}>
        <Field label="Phone" htmlFor="cf-phone"><TextInput id="cf-phone" type="tel" value={f.phone} onChange={set('phone')} placeholder="0803 000 0000 or +44…" /></Field>
        <Field label="Email" htmlFor="cf-email"><TextInput id="cf-email" type="email" value={f.email} onChange={set('email')} /></Field>
        {!editing && <Field label="Date of visit" htmlFor="cf-visit"><TextInput id="cf-visit" type="date" value={f.first_visit} onChange={set('first_visit')} /></Field>}
        <Field label="Gender" htmlFor="cf-gender"><Select id="cf-gender" value={f.gender} onChange={set('gender')}><option value="">Not given</option><option value="F">Female</option><option value="M">Male</option></Select></Field>
        <Field label="Birthday" htmlFor="cf-bday">
          <div className="flex gap-2">
            <Select id="cf-bday" aria-label="Day" value={f.birth_day} onChange={set('birth_day')}><option value="">Day</option>{Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</Select>
            <Select aria-label="Month" value={f.birth_month} onChange={set('birth_month')}><option value="">Month</option>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</Select>
          </div>
        </Field>
        <Field label="Age range" htmlFor="cf-age"><Select id="cf-age" value={f.age_range} onChange={set('age_range')}><option value="">Not given</option>{AGE_RANGES.map((a) => <option key={a}>{a}</option>)}</Select></Field>
        <Field label="Occupation" htmlFor="cf-occ"><TextInput id="cf-occ" value={f.occupation} onChange={set('occupation')} /></Field>
      </div>
      <Field label="Address or area" htmlFor="cf-addr"><TextInput id="cf-addr" value={f.address} onChange={set('address')} placeholder="e.g. Lekki Phase 1" /></Field>
      <Field label="Who invited them, or how they heard" htmlFor="cf-ref"><TextInput id="cf-ref" value={f.referral} onChange={set('referral')} placeholder="e.g. A friend, YouTube" /></Field>
      <Field label="Prayer request" htmlFor="cf-prayer"><Textarea id="cf-prayer" rows={3} value={f.prayer_request} onChange={set('prayer_request')} /></Field>
      <Field label={<>Needs a check <span className="font-medium text-muted-label">(leave empty when the details are fine)</span></>} htmlFor="cf-check">
        <TextInput id="cf-check" value={f.needs_check} onChange={set('needs_check')} placeholder="e.g. Phone number one digit short" />
      </Field>
      {!editing && isDirector && (
        <Field label="Assign the first call to" htmlFor="cf-assign">
          <Select id="cf-assign" value={f.assigned_to} onChange={set('assigned_to')}>
            <option value="">Nobody yet</option>
            {staff.filter((s) => s.role !== 'leader').map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </Select>
        </Field>
      )}
    </Dialog>
  )
}

// ---------- The contact panel: the whole record in one place ----------
export function ContactPanel({ contact, outcomes = [], staff = [], onClose, onChanged, onLog, onEdit, onEditOutcome, onDeleteOutcome }) {
  const me = useMe()
  const toast = useAppToast()
  const isDirector = me?.role === 'director'
  const canAct = isDirector || me?.role === 'support'
  if (!contact) return null
  const c = contact
  const mine = outcomes.filter((o) => o.person_id === c.id)
  const canEditOutcome = (o) => isDirector || (me?.role === 'support' && o.logged_by === me.id)

  const take = async () => {
    const { data } = await supabase.rpc('take_contact', { p_id: c.id })
    toast(data?.ok ? 'They are yours. They show under My calls.' : 'Someone else has already taken them.')
    onChanged?.()
  }
  const assign = async (e) => {
    const { error } = await supabase.from('people').update({ assigned_to: e.target.value || null }).eq('id', c.id)
    toast(error ? "Couldn't assign. Check your access." : 'Assigned.')
    onChanged?.()
  }

  const fields = [
    ['Came through', `${(CONTACT_SOURCES[c.source] || {}).label || 'Next Steps'}${c.group_name ? ' · ' + c.group_name : ''}${c.first_visit ? ' · first seen ' + fmtDate(c.first_visit) : ''}`],
    ['Phone', c.phone ? fmtPhone(c.phone) : 'Not given'],
    ['Email', c.email || 'Not given'],
    ['Gender', c.gender === 'F' ? 'Female' : c.gender === 'M' ? 'Male' : 'Not given'],
    ['Birthday', fmtBirthday(c, MONTHS) || 'Not given'],
    ['Age range', c.age_range || 'Not given'],
    ['Address or area', c.address || 'Not given'],
    ['Occupation', c.occupation || 'Not given'],
    ['Invited by or heard through', c.referral || 'Not given'],
    ['Next Steps', c.steps_done ? `${c.steps_done} of 4 steps · last seen ${fmtDate(c.last_seen)}` : 'Not started'],
  ]

  return (
    <Dialog
      open
      onClose={onClose}
      title={<span className="flex items-center gap-3"><Avatar name={c.full_name} size={40} fontSize={13} />{c.full_name}</span>}
      sub={<span className="flex gap-1.5 flex-wrap mt-1"><SourceBadge c={c} /><ReasonBadge c={c} />{c.needs_check && <span className={checkBadgeClass}>Needs a check</span>}<AssigneeBadge c={c} me={me} /></span>}
      footer={<>
        {canAct && <BtnSm variant="outline" onClick={() => onEdit?.(c)}>Edit details</BtnSm>}
        {canAct && !c.assigned_to && <BtnSm variant="outline" onClick={take}>Take it</BtnSm>}
        {c.phone && <a href={telHref(c.phone)} className="inline-flex items-center gap-1.5 px-4 py-2.25 rounded-[10px] font-bold text-[12.5px] whitespace-nowrap bg-white border-[1.5px] border-line text-ink hover:border-orange hover:text-orange no-underline">Call {fmtPhone(c.phone)}</a>}
        {canAct && <BtnSm onClick={() => onLog?.(c)}>Log outcome</BtnSm>}
      </>}
    >
      {c.needs_check && <div className="mb-4 bg-amber-bg border border-amber-border text-amber-text rounded-xl py-3 px-3.5 text-[13px] leading-normal"><strong>Needs a check.</strong> {c.needs_check}</div>}
      <p className="text-[13px] text-muted-body leading-normal mb-4">{whyLine(c)}</p>
      <dl className="grid gap-x-4.5 gap-y-3 grid-cols-2 max-mobile:grid-cols-1">
        {fields.map(([k, v]) => (
          <div key={k}><dt className="text-[11px] text-muted-label font-semibold">{k}</dt><dd className="text-[13.5px] text-ink-deep leading-snug">{v}</dd></div>
        ))}
      </dl>
      {isDirector && (
        <Field label="Assigned to" htmlFor="cp-assign">
          <Select id="cp-assign" value={c.assigned_to || ''} onChange={assign}>
            <option value="">Nobody yet</option>
            {staff.filter((s) => s.role !== 'leader').map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </Select>
        </Field>
      )}
      {c.prayer_request && (
        <div className="mt-4 bg-row-hover rounded-xl py-3.5 px-4">
          <div className="font-mono text-[9.5px] tracking-[.12em] uppercase text-muted-label font-semibold mb-1.5">Prayer request</div>
          <div className="text-sm leading-normal">{c.prayer_request}</div>
        </div>
      )}
      <div className="mt-5">
        <div className="font-mono text-[9.5px] tracking-[.12em] uppercase text-muted-label font-semibold mb-1">Follow up so far</div>
        {mine.length ? mine.map((o) => (
          <div key={o.id} className="flex gap-3 items-start py-2.5 border-b border-[#ECE7DA] last:border-b-0">
            <span className="flex-none w-7 h-7 rounded-full bg-green-soft text-green grid place-items-center" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12l5 5 9-10" /></svg></span>
            <div className="flex-1 text-[13px] leading-normal"><strong>{outcomeLabel(o.action)}.</strong> {o.note || 'No note written.'}</div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="font-mono text-[10.5px] text-muted-label whitespace-nowrap">{o.logged_by_name || 'No caller recorded'} · {fmtWhen(o.created_at)}</div>
              {canEditOutcome(o) && (
                <div className="flex gap-1">
                  <button type="button" title="Edit outcome" onClick={() => onEditOutcome?.(o)} className="text-muted-icon text-xs leading-none py-0.75 px-1.25 rounded-md hover:text-orange-deep hover:bg-orange-soft">✎</button>
                  <button type="button" title="Delete outcome" onClick={() => onDeleteOutcome?.(o)} className="text-muted-icon text-[15px] leading-none py-0.5 px-1 rounded-md hover:text-orange-deep hover:bg-orange-soft">✕</button>
                </div>
              )}
            </div>
          </div>
        )) : <div className="text-[13px] text-muted-faint py-2.5">Nothing logged yet.</div>}
      </div>
      <NotesThread personId={c.id} className="mt-4" />
    </Dialog>
  )
}

// A soft stat card, matching Today's tiles.
export function Stat({ label, value, detail }) {
  return (
    <div className="bg-white rounded-[20px] py-4 px-4.5 shadow-card">
      <div className="font-mono text-[9.5px] tracking-[.12em] uppercase text-muted-label font-semibold">{label}</div>
      <div className="text-[30px] font-black tracking-[-.03em] text-ink-deep mt-0.75 leading-none">{value}</div>
      {detail && <div className="text-[11px] text-muted-label mt-1">{detail}</div>}
    </div>
  )
}

export function Chips({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="flex gap-1.5 flex-wrap">
      {options.map(([k, l]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}
          className={`min-h-8.5 px-3 rounded-full text-xs font-bold border-[1.5px] transition-[.15s] ${value === k ? 'bg-ink-deep border-ink-deep text-white' : 'bg-white border-line text-ink hover:border-ink'}`}>{l}</button>
      ))}
    </div>
  )
}
