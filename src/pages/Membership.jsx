import { useState } from 'react'
import PageHead, { Breadcrumb } from '../components/PageHead.jsx'
import Card from '../components/Card.jsx'
import Badge from '../components/Badge.jsx'
import BtnSm from '../components/BtnSm.jsx'
import Modal from '../components/Modal.jsx'
import Dialog from '../components/Dialog.jsx'
import Field, { Select, TextInput } from '../components/Field.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { CallLink, Chips, TagsInput, Stat, WorkerBadge, departmentsOf, deptsOf, designationsOf, titlesOf } from '../components/followup.jsx'
import { useContactDialogs } from '../components/useContactDialogs.jsx'
import { useMe } from '../context/MeContext.jsx'
import { useAppToast } from '../context/ToastContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { fmtDate, todayStr } from '../lib/format.js'

const blankMember = { full_name: '', phone: '', email: '', member_since: '', worker: false, notMember: false, titles: [], departments: [] }

// The admin adds someone who is already a member (and maybe a worker) but
// never came through Next Steps or a card. Created through add_contact, so
// a phone already on file updates that person instead of making a second.
function AddMemberDialog({ open, departments, designations, onClose, onSaved }) {
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
      // The rare paid worker who is not a member has no member_since.
      member_since: f.worker && f.notMember ? null : f.member_since || todayStr(), is_worker: f.worker,
      worker_titles: f.worker ? f.titles : [], worker_departments: f.worker ? f.departments : [],
      worker_title: null, worker_department: null,
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
        {!(f.worker && f.notMember) && <Field label={<>Member since <span className="font-medium text-muted-label">(empty = today)</span></>} htmlFor="am-since"><TextInput id="am-since" type="date" value={f.member_since} max={todayStr()} onChange={set('member_since')} /></Field>}
      </div>
      <label className="flex items-center gap-2 text-[13px] text-ink mt-4">
        <input type="checkbox" checked={f.worker} onChange={set('worker')} className="w-4 h-4 accent-orange" />
        Serves as a worker
      </label>
      {f.worker && (
        <label className="flex items-center gap-2 text-[13px] text-ink mt-2 ml-6">
          <input type="checkbox" checked={f.notMember} onChange={set('notMember')} className="w-4 h-4 accent-orange" />
          Not a member (a paid worker)
        </label>
      )}
      {f.worker && (
        <div className={g}>
          <Field label="Designations (optional)" htmlFor="am-title">
            <TagsInput id="am-title" value={f.titles} onChange={(v) => setF((x) => ({ ...x, titles: v }))} options={designations} noun="designation" />
          </Field>
          <Field label="Departments (optional)" htmlFor="am-dept">
            <TagsInput id="am-dept" value={f.departments} onChange={(v) => setF((x) => ({ ...x, departments: v }))} options={departments} />
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
  const [stage, setStageRaw] = useState('workers')
  const [dept, setDeptRaw] = useState('all')
  const [recording, setRecording] = useState(null)
  const [date, setDate] = useState(todayStr())
  const [adding, setAdding] = useState(false)
  // Bulk actions (admin only): ticked rows, and which bulk dialog is open.
  const [picked, setPicked] = useState(() => new Set())
  const [bulk, setBulk] = useState(null) // 'record' | 'add-dept' | 'remove-dept' | 'delete'
  const [bulkDept, setBulkDept] = useState('')
  const setStage = (v) => { setStageRaw(v); setPicked(new Set()) }
  const setDept = (v) => { setDeptRaw(v); setPicked(new Set()) }

  const pipeline = contacts.filter((c) => c.steps_done === 4 || c.member_since)
  const stageOf = (c) => (c.member_since ? 'member' : daysSince(c.completed_on) >= WINDOW_DAYS ? 'ready' : 'open')
  const counts = { open: 0, ready: 0, member: 0 }
  pipeline.forEach((c) => { counts[stageOf(c)]++ })
  // Every worker, including the rare paid one who is not a member (and so
  // not in the membership pipeline above).
  const workers = contacts.filter((c) => c.is_worker)
  const departments = departmentsOf(workers)
  const inDept = (c) => dept === 'all' || (dept === 'none' ? !deptsOf(c).length : deptsOf(c).includes(dept))
  const rows = stage === 'workers' ? workers.filter(inDept) : pipeline.filter((c) => stageOf(c) === stage)

  const record = async () => {
    const { error } = await supabase.from('people').update({ member_since: date }).eq('id', recording.id)
    if (error) { toast("Couldn't record that. Check your access."); return false }
    toast(`${recording.full_name} recorded as a member from ${fmtDate(date)}.`)
    refresh()
  }

  // Only ticked rows still on screen count, so a refresh that moves someone
  // to another stage never acts on them by surprise.
  const chosen = rows.filter((c) => picked.has(c.id))
  const allPicked = rows.length > 0 && chosen.length === rows.length
  const toggle = (id) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(rows.map((c) => c.id)))
  const ids = chosen.map((c) => c.id)
  const n = chosen.length
  const people = (k) => `${k} ${k === 1 ? 'person' : 'people'}`

  const bulkUpdate = async (patch, done) => {
    const { error } = await supabase.from('people').update(patch).in('id', ids)
    if (error) { toast(`Couldn't update them: ${error.message}`); return false }
    toast(done); setPicked(new Set()); refresh()
  }
  const bulkSave = async () => {
    if (bulk === 'record') return bulkUpdate({ member_since: date }, `${people(n)} recorded as members from ${fmtDate(date)}.`)
    if (bulk === 'add-dept' || bulk === 'remove-dept') {
      // Departments are a list per person, so each row gets its own new list.
      const d = bulkDept.trim()
      if (!d) { toast('Pick a department.'); return false }
      const adding = bulk === 'add-dept'
      const results = await Promise.all(chosen.map((c) => {
        const now = deptsOf(c)
        const next = adding ? (now.some((x) => x.toLowerCase() === d.toLowerCase()) ? now : [...now, d]) : now.filter((x) => x !== d)
        return supabase.from('people').update({ worker_departments: next }).eq('id', c.id)
      }))
      const failed = results.filter((r) => r.error).length
      if (failed) { toast(`${failed} of ${n} could not be updated.`); refresh(); return false }
      toast(adding ? `${people(n)} added to ${d}.` : `${people(n)} taken out of ${d}.`); setPicked(new Set()); refresh(); return
    }
    if (bulk === 'delete') {
      const { error } = await supabase.from('people').delete().in('id', ids)
      if (error) { toast(`Couldn't delete them: ${error.message}`); return false }
      toast(`${people(n)} deleted.`); setPicked(new Set()); refresh()
    }
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
        <Stat label="Members" value={counts.member} detail="Recorded" />
        <Stat label="Workers" value={workers.length} detail="Members who serve" />
        <Stat label="Window open" value={counts.open} detail="Within 30 days of step 4" />
        <Stat label="Ready for a decision" value={counts.ready} detail="Window has passed" />
      </div>
      <Card>
        <div className="mb-3"><Chips label="Filter by stage" value={stage} onChange={setStage} options={[['member', 'Members'], ['workers', 'Workers'], ['open', 'Window open'], ['ready', 'Ready for a decision']]} /></div>
        {stage === 'workers' && (
          <div className="mb-3">
            <Chips label="Filter workers by department" value={dept} onChange={setDept}
              options={[['all', 'All departments'], ...departments.map((d) => [d, `${d} (${workers.filter((c) => deptsOf(c).includes(d)).length})`]), ...(workers.some((c) => !deptsOf(c).length) ? [['none', 'No department yet']] : [])]} />
          </div>
        )}
        {isDirector && rows.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap py-2.5 px-3 -mx-1 mb-1 rounded-xl bg-row-hover">
            <label className="flex items-center gap-2 text-[12.5px] font-bold text-ink-deep mr-2">
              <input type="checkbox" checked={allPicked} onChange={toggleAll} className="w-4 h-4 accent-orange" />
              {n ? `${n} selected` : 'Select all'}
            </label>
            {n > 0 && <>
              {stage === 'ready' && <BtnSm onClick={() => { setDate(todayStr()); setBulk('record') }}>Record membership</BtnSm>}
              {stage === 'member' && chosen.some((c) => !c.is_worker) && <BtnSm variant="outline" onClick={() => bulkUpdate({ is_worker: true }, `${people(chosen.filter((c) => !c.is_worker).length)} tagged as workers.`)}>Make workers</BtnSm>}
              {(stage === 'workers' || chosen.every((c) => c.is_worker)) && stage !== 'ready' && stage !== 'open' && <>
                <BtnSm variant="outline" onClick={() => { setBulkDept(''); setBulk('add-dept') }}>Add to department</BtnSm>
                {chosen.some((c) => deptsOf(c).length) && <BtnSm variant="outline" onClick={() => { setBulkDept(''); setBulk('remove-dept') }}>Remove from department</BtnSm>}
              </>}
              {stage === 'workers' && <BtnSm variant="outline" onClick={() => bulkUpdate({ is_worker: false, worker_title: null, worker_titles: [], worker_department: null, worker_departments: [] }, `${people(n)} removed from workers.`)}>Remove from workers</BtnSm>}
              <BtnSm variant="outline" className="border-[#E8B4A6]! text-orange-deep!" onClick={() => setBulk('delete')}>Delete</BtnSm>
              <button type="button" onClick={() => setPicked(new Set())} className="text-xs font-bold text-muted-sub underline ml-auto">Clear</button>
            </>}
          </div>
        )}
        {rows.map((c, i) => {
          const s = stageOf(c)
          const left = WINDOW_DAYS - daysSince(c.completed_on)
          return (
            <div key={c.id} className="flex items-center gap-3 py-3 border-b border-[#ECE7DA] last:border-b-0 flex-wrap">
              {isDirector && <input type="checkbox" aria-label={`Select ${c.full_name}`} checked={picked.has(c.id)} onChange={() => toggle(c.id)} className="w-4 h-4 flex-none accent-orange" />}
              <span className="w-7 flex-none text-right font-mono text-[11px] text-muted-label">{i + 1}.</span>
              {c.steps_done === 4
                ? <div className="flex gap-0.75 flex-none" aria-label="All four steps done">{[0, 1, 2, 3].map((i) => <span key={i} className="w-2.25 h-3.25 rounded-arch bg-orange" />)}</div>
                : <div className="w-[45px] flex-none" aria-hidden="true" />}
              <div className="flex-1 min-w-55">
                <div className="text-[13px] font-extrabold text-ink-deep flex items-center gap-1.5 flex-wrap">
                  <button type="button" onClick={() => dlg.openContact(c)} className="underline decoration-line underline-offset-3 hover:text-orange">{c.full_name}</button>
                  {stage === 'workers' ? <>
                    {/* Workers are members as a rule, so their pills are what they do. */}
                    {titlesOf(c).map((t) => <Badge key={t} variant="navy">{t}</Badge>)}
                    {deptsOf(c).map((d) => <Badge key={d} variant="grey">{d}</Badge>)}
                    {!c.member_since && <Badge variant="orange">Not a member</Badge>}
                  </> : <>
                    {/* The tab already says which stage they are at. */}
                    {stage !== 'member' && <Badge variant={s === 'member' ? 'green' : s === 'ready' ? 'orange' : 'navy'}>{s === 'member' ? 'Member' : s === 'ready' ? 'Ready for a decision' : 'Window open'}</Badge>}
                    <WorkerBadge c={c} />
                  </>}
                  {c.hc_interest && <Badge variant="grey">House church</Badge>}
                </div>
                <div className="text-xs text-muted-sub mt-0.5">
                  {stage === 'workers' && !c.member_since ? 'Paid worker'
                    : s === 'member' ? `Member since ${fmtDate(c.member_since)}${c.completed_on && c.steps_done === 4 ? ` · completed ${fmtDate(c.completed_on)}` : ''}`
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
      <Modal
        open={!!bulk}
        title={bulk === 'record' ? `Record membership for ${people(n)}` : bulk === 'add-dept' ? `Add ${people(n)} to a department` : bulk === 'remove-dept' ? `Take ${people(n)} out of a department` : `Delete ${people(n)}?`}
        sub={bulk === 'record' ? 'Only after leadership has decided. This writes the date on each record; it does not make the decision.' : chosen.map((c) => c.full_name).join(', ')}
        saveLabel={bulk === 'delete' ? 'Yes, delete' : bulk === 'record' ? 'Record it' : 'Save'}
        onClose={() => setBulk(null)}
        onSave={bulkSave}
      >
        {bulk === 'record' && <Field label="Member since" htmlFor="bk-date"><TextInput id="bk-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>}
        {bulk === 'add-dept' && (
          <Field label={<>Department <span className="font-medium text-muted-label">(added to the ones they already have)</span></>} htmlFor="bk-dept">
            <TextInput id="bk-dept" list="bk-depts" value={bulkDept} onChange={(e) => setBulkDept(e.target.value)} />
            <datalist id="bk-depts">{departments.map((d) => <option key={d} value={d} />)}</datalist>
          </Field>
        )}
        {bulk === 'remove-dept' && (
          <Field label="Department" htmlFor="bk-dept-out">
            <Select id="bk-dept-out" value={bulkDept} onChange={(e) => setBulkDept(e.target.value)}>
              <option value="">Choose…</option>
              {[...new Set(chosen.flatMap(deptsOf))].sort((a, b) => a.localeCompare(b)).map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
        )}
        {bulk === 'delete' && <p className="text-[13px] text-muted-body mt-3">This removes them from the platform permanently, with their notes, outcomes and any check-ins. It cannot be undone.</p>}
      </Modal>
      <AddMemberDialog open={adding} departments={departmentsOf(contacts)} designations={designationsOf(contacts)} onClose={() => setAdding(false)} onSaved={refresh} />
      {dlg.dialogs}
    </>
  )
}
