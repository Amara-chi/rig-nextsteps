import { useState } from 'react'
import PageHead, { Breadcrumb } from '../components/PageHead.jsx'
import Card from '../components/Card.jsx'
import Badge from '../components/Badge.jsx'
import BtnSm from '../components/BtnSm.jsx'
import Modal from '../components/Modal.jsx'
import Field, { TextInput } from '../components/Field.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { CallLink, Chips, Stat } from '../components/followup.jsx'
import { useContactDialogs } from '../components/useContactDialogs.jsx'
import { useMe } from '../context/MeContext.jsx'
import { useAppToast } from '../context/ToastContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { fmtDate, todayStr } from '../lib/format.js'

const WINDOW_DAYS = 30
const daysSince = (d) => (d ? Math.floor((Date.now() - new Date(d + 'T00:00:00').getTime()) / 86400000) : 0)

// Everyone who has finished all four steps. The 30-day window is a waiting
// period, not a decision: leadership decides, and the admin records what
// they decided (people.member_since). Nothing here ever makes someone a
// member automatically.
export default function Membership({ contacts, outcomes, staff, refresh }) {
  const me = useMe()
  const toast = useAppToast()
  const isDirector = me?.role === 'director'
  const canLog = isDirector || me?.role === 'support'
  const dlg = useContactDialogs({ contacts, outcomes, staff, refresh })
  const [stage, setStage] = useState('ready')
  const [recording, setRecording] = useState(null)
  const [date, setDate] = useState(todayStr())

  const pipeline = contacts.filter((c) => c.steps_done === 4 || c.member_since)
  const stageOf = (c) => (c.member_since ? 'member' : daysSince(c.completed_on) >= WINDOW_DAYS ? 'ready' : 'open')
  const counts = { open: 0, ready: 0, member: 0 }
  pipeline.forEach((c) => { counts[stageOf(c)]++ })
  const rows = pipeline.filter((c) => stageOf(c) === stage)

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
      />
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr))] mb-5.5">
        <Stat label="Window open" value={counts.open} detail="Within 30 days of step 4" />
        <Stat label="Ready for a decision" value={counts.ready} detail="Window has passed" />
        <Stat label="Members" value={counts.member} detail="Recorded" />
      </div>
      <Card>
        <div className="mb-3"><Chips label="Filter by stage" value={stage} onChange={setStage} options={[['open', 'Window open'], ['ready', 'Ready for a decision'], ['member', 'Members']]} /></div>
        {rows.map((c) => {
          const s = stageOf(c)
          const left = WINDOW_DAYS - daysSince(c.completed_on)
          return (
            <div key={c.id} className="flex items-center gap-3 py-3 border-b border-[#ECE7DA] last:border-b-0 flex-wrap">
              <div className="flex gap-0.75 flex-none" aria-label="All four steps done">{[0, 1, 2, 3].map((i) => <span key={i} className="w-2.25 h-3.25 rounded-arch bg-orange" />)}</div>
              <div className="flex-1 min-w-55">
                <div className="text-[13px] font-extrabold text-ink-deep flex items-center gap-1.5 flex-wrap">
                  <button type="button" onClick={() => dlg.openContact(c)} className="underline decoration-line underline-offset-3 hover:text-orange">{c.full_name}</button>
                  <Badge variant={s === 'member' ? 'green' : s === 'ready' ? 'orange' : 'navy'}>{s === 'member' ? 'Member' : s === 'ready' ? 'Ready for a decision' : 'Window open'}</Badge>
                  {c.hc_interest && <Badge variant="grey">House church</Badge>}
                </div>
                <div className="text-xs text-muted-sub mt-0.5">
                  {s === 'member' ? `Member since ${fmtDate(c.member_since)} · completed ${fmtDate(c.completed_on)}`
                    : s === 'ready' ? `Completed ${fmtDate(c.completed_on)} · window passed ${-left} days ago · waiting on leadership`
                    : `Completed ${fmtDate(c.completed_on)} · ${left} days left in the window`}
                </div>
              </div>
              <CallLink phone={c.phone} />
              <div className="flex gap-1.5">
                {canLog && <BtnSm variant="outline" onClick={() => dlg.logOutcome(c)}>Log a call</BtnSm>}
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
      {dlg.dialogs}
    </>
  )
}
