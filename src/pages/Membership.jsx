import { useState } from 'react'
import PageHead, { Breadcrumb } from '../components/PageHead.jsx'
import Card from '../components/Card.jsx'
import Badge from '../components/Badge.jsx'
import BtnSm from '../components/BtnSm.jsx'
import Modal from '../components/Modal.jsx'
import Dialog from '../components/Dialog.jsx'
import Field, { TextInput } from '../components/Field.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { CallLink, Chips, Stat, WorkerBadge, departmentsOf } from '../components/followup.jsx'
import { useContactDialogs } from '../components/useContactDialogs.jsx'
import { useMe } from '../context/MeContext.jsx'
import { useAppToast } from '../context/ToastContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { fmtDate, todayStr } from '../lib/format.js'

const blankMember = { full_name: '', phone: '', email: '', member_since: '', worker: false, title: '', department: '' }

// The admin adds someone who is already a member (and maybe a worker) but
// never came through Next Steps or a card. Created through add_contact, so
// a phone already on file updates that person instead of making a second.
function AddMemberDialog({ open, departments, onClose, onSaved }) {
  const toast = useAppToast()
  const [f, setF] = useState(blankMember)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const close = () => { setF(blankMember); onClose() }

  const save = async () => {
    if (!f.full_name.trim()) { toast('Add their name.'); return }
    if (!f.phone.trim() && !f.email.trim()) { toast('Add a phone number or an email.'); return }
    setSaving(true)
    const { data, error } = await supabase.rpc('add_contact', { p: {
      full_name: f.full_name.trim(), phone: f.phone, email: f.email,
      source: 'group', group_name: f.worker ? 'Workers' : 'Members',
    } })
    if (error || data?.ok === false) { setSaving(false); toast("Couldn't add them. Check the name and phone or email."); return }
    const { error: e2 } = await supabase.from('people').update({
      member_since: f.member_since || todayStr(), is_worker: f.worker,
      worker_title: f.worker ? f.title.trim() || null : null, worker_department: f.worker ? f.department.trim() || null : null,
    }).eq('id', data.id)
    setSaving(false)
    if (e2) { toast(`Added, but not as a member: ${e2.message}`); onSaved(); return }
    toast(data.existing
      ? `That number was already on file, so their record is now marked as a ${f.worker ? 'worker' : 'member'}.`
      : `${f.full_name.trim()} added as a ${f.worker ? 'worker' : 'member'}.`)
    onSaved(); close()
  }

  const g = 'grid gap-x-3 grid-cols-2 max-mobile:grid-cols-1'
  return (
    <Dialog
      open={open}
      width={560}
      onClose={close}
      title="Add a member or worker"
      sub="For someone leadership already counts as a member who is not on the platform yet. Only the name and a phone or email are required."
      footer={<>
        <BtnSm variant="outline" onClick={close}>Cancel</BtnSm>
        <BtnSm disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Add them'}</BtnSm>
      </>}
    >
      <Field label="Full name" htmlFor="am-name" className="mt-0!"><TextInput id="am-name" value={f.full_name} onChange={set('full_name')} /></Field>
      <div className={g}>
        <Field label="Phone" htmlFor="am-phone"><TextInput id="am-phone" type="tel" value={f.phone} onChange={set('phone')} placeholder="0803 000 0000 or +44…" /></Field>
        <Field label="Email" htmlFor="am-email"><TextInput id="am-email" type="email" value={f.email} onChange={set('email')} /></Field>
        <Field label={<>Member since <span className="font-medium text-muted-label">(empty = today)</span></>} htmlFor="am-since"><TextInput id="am-since" type="date" value={f.member_since} max={todayStr()} onChange={set('member_since')} /></Field>
      </div>
      <label className="flex items-center gap-2 text-[13px] text-ink mt-4">
        <input type="checkbox" checked={f.worker} onChange={set('worker')} className="w-4 h-4 accent-orange" />
        Serves as a worker
      </label>
      {f.worker && (
        <div className={g}>
          <Field label="Title (optional)" htmlFor="am-title"><TextInput id="am-title" value={f.title} onChange={set('title')} placeholder="e.g. Prophetic Lead" /></Field>
          <Field label="Department (optional)" htmlFor="am-dept">
            <TextInput id="am-dept" list="am-depts" value={f.department} onChange={set('department')} />
            <datalist id="am-depts">{departments.map((d) => <option key={d} value={d} />)}</datalist>
          </Field>
        </div>
      )}
    </Dialog>
  )
}

const WINDOW_DAYS = 30
const daysSince = (d) => (d ? Math.floor((Date.now() - new Date(d + 'T00:00:00').getTime()) / 86400000) : 0)

// Everyone who has finished all four steps. The 30-day window is a waiting
// period, not a decision: leadership decides, and the admin records what
// they decided (people.member_since). Nothing here ever makes someone a
// member automatically. Workers (members who serve, tagged by the admin
// from the contact panel) have their own filter.
export default function Membership({ contacts, outcomes, staff, refresh }) {
  const me = useMe()
  const toast = useAppToast()
  const isDirector = me?.role === 'director'
  const canLog = isDirector || me?.role === 'support'
  const dlg = useContactDialogs({ contacts, outcomes, staff, refresh })
  const [stage, setStage] = useState('ready')
  const [dept, setDept] = useState('all')
  const [recording, setRecording] = useState(null)
  const [date, setDate] = useState(todayStr())
  const [adding, setAdding] = useState(false)

  const pipeline = contacts.filter((c) => c.steps_done === 4 || c.member_since)
  const stageOf = (c) => (c.member_since ? 'member' : daysSince(c.completed_on) >= WINDOW_DAYS ? 'ready' : 'open')
  const counts = { open: 0, ready: 0, member: 0 }
  pipeline.forEach((c) => { counts[stageOf(c)]++ })
  const workers = pipeline.filter((c) => c.is_worker)
  const departments = departmentsOf(workers)
  const inDept = (c) => dept === 'all' || (dept === 'none' ? !c.worker_department : c.worker_department === dept)
  const rows = stage === 'workers' ? workers.filter(inDept) : pipeline.filter((c) => stageOf(c) === stage)

  const record = async () => {
    const { error } = await supabase.from('people').update({ member_since: date }).eq('id', recording.id)
    if (error) { toast("Couldn't record that. Check your access."); return false }
    toast(`${recording.full_name} recorded as a member from ${fmtDate(date)}.`)
    refresh()
  }

  return (
    <>
      <PageHead
        crumb={<Breadcrumb>Follow Up</Breadcrumb>}
        title="Membership"
        sub="Everyone who has finished all four steps. The 30-day window is a waiting period, not a decision: leadership decides, and the app only records what they decided."
        right={isDirector && <BtnSm onClick={() => setAdding(true)}>+ Add a member or worker</BtnSm>}
      />
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr))] mb-5.5">
        <Stat label="Window open" value={counts.open} detail="Within 30 days of step 4" />
        <Stat label="Ready for a decision" value={counts.ready} detail="Window has passed" />
        <Stat label="Members" value={counts.member} detail="Recorded" />
        <Stat label="Workers" value={workers.length} detail="Members who serve" />
      </div>
      <Card>
        <div className="mb-3"><Chips label="Filter by stage" value={stage} onChange={setStage} options={[['open', 'Window open'], ['ready', 'Ready for a decision'], ['member', 'Members'], ['workers', 'Workers']]} /></div>
        {stage === 'workers' && (
          <div className="mb-3">
            <Chips label="Filter workers by department" value={dept} onChange={setDept}
              options={[['all', 'All departments'], ...departments.map((d) => [d, `${d} (${workers.filter((c) => c.worker_department === d).length})`]), ...(workers.some((c) => !c.worker_department) ? [['none', 'No department yet']] : [])]} />
          </div>
        )}
        {rows.map((c) => {
          const s = stageOf(c)
          const left = WINDOW_DAYS - daysSince(c.completed_on)
          return (
            <div key={c.id} className="flex items-center gap-3 py-3 border-b border-[#ECE7DA] last:border-b-0 flex-wrap">
              {c.steps_done === 4
                ? <div className="flex gap-0.75 flex-none" aria-label="All four steps done">{[0, 1, 2, 3].map((i) => <span key={i} className="w-2.25 h-3.25 rounded-arch bg-orange" />)}</div>
                : <div className="w-[45px] flex-none" aria-hidden="true" />}
              <div className="flex-1 min-w-55">
                <div className="text-[13px] font-extrabold text-ink-deep flex items-center gap-1.5 flex-wrap">
                  <button type="button" onClick={() => dlg.openContact(c)} className="underline decoration-line underline-offset-3 hover:text-orange">{c.full_name}</button>
                  <Badge variant={s === 'member' ? 'green' : s === 'ready' ? 'orange' : 'navy'}>{s === 'member' ? 'Member' : s === 'ready' ? 'Ready for a decision' : 'Window open'}</Badge>
                  <WorkerBadge c={c} />
                  {c.hc_interest && <Badge variant="grey">House church</Badge>}
                </div>
                <div className="text-xs text-muted-sub mt-0.5">
                  {stage === 'workers' && c.worker_department && <span className="font-semibold text-ink">{c.worker_department} · </span>}
                  {s === 'member' ? `Member since ${fmtDate(c.member_since)}${c.completed_on && c.steps_done === 4 ? ` · completed ${fmtDate(c.completed_on)}` : ''}`
                    : s === 'ready' ? `Completed ${fmtDate(c.completed_on)} · window passed ${-left} days ago · waiting on leadership`
                    : `Completed ${fmtDate(c.completed_on)} · ${left} days left in the window`}
                </div>
              </div>
              <CallLink phone={c.phone} />
              <div className="flex gap-1.5">
                {c.is_worker
                  ? <BtnSm onClick={() => dlg.addNote(c)}>Add a note</BtnSm>
                  : canLog && <BtnSm variant="outline" onClick={() => dlg.logOutcome(c)}>Log a call</BtnSm>}
                {isDirector && s === 'ready' && <BtnSm onClick={() => { setDate(todayStr()); setRecording(c) }}>Record membership</BtnSm>}
              </div>
            </div>
          )
        })}
        {!rows.length && <EmptyState>Nobody at this stage.</EmptyState>}
        {!isDirector && counts.ready > 0 && <div className="text-xs text-muted-label pt-3">Recording a membership decision is done by an admin, after leadership has decided.</div>}
      </Card>

      <Modal
        open={!!recording}
        title={`Record membership: ${recording?.full_name || ''}`}
        sub="Only after leadership has decided. This writes the date on their record; it does not make the decision."
        saveLabel="Record it"
        onClose={() => setRecording(null)}
        onSave={record}
      >
        <Field label="Member since" htmlFor="ms-date"><TextInput id="ms-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      </Modal>
      <AddMemberDialog open={adding} departments={departmentsOf(contacts)} onClose={() => setAdding(false)} onSaved={refresh} />
      {dlg.dialogs}
    </>
  )
}
