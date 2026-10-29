import { useState } from 'react'
import PageHead, { Breadcrumb } from '../components/PageHead.jsx'
import Card, { CardHead } from '../components/Card.jsx'
import Avatar from '../components/Avatar.jsx'
import Badge from '../components/Badge.jsx'
import BtnSm from '../components/BtnSm.jsx'
import Modal from '../components/Modal.jsx'
import Field, { TextInput } from '../components/Field.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { CallLink, SourceBadge, Stat } from '../components/followup.jsx'
import { useContactDialogs } from '../components/useContactDialogs.jsx'
import { useMe } from '../context/MeContext.jsx'
import { useAppToast } from '../context/ToastContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { fmtDate, todayStr } from '../lib/format.js'

// House church interest. Eligibility needs all four steps (SOP, Jul 2026);
// placement belongs to the overseer. The app records interest, eligibility
// and, once the overseer has placed someone, where they went.
export default function HouseChurch({ contacts, outcomes, staff, refresh }) {
  const me = useMe()
  const toast = useAppToast()
  const isDirector = me?.role === 'director'
  const canLog = isDirector || me?.role === 'support'
  const dlg = useContactDialogs({ contacts, outcomes, staff, refresh })
  const [placing, setPlacing] = useState(null)
  const [where, setWhere] = useState('')
  const [when, setWhen] = useState(todayStr())

  const interested = contacts.filter((c) => c.hc_interest)
  const waiting = interested.filter((c) => c.steps_done === 4 && !c.hc_placed_in)
  const placed = interested.filter((c) => c.hc_placed_in)
  const notYet = interested.filter((c) => c.steps_done < 4 && !c.hc_placed_in)

  const place = async () => {
    if (!where.trim()) { toast('Say which house church.'); return false }
    const { error } = await supabase.from('people').update({ hc_placed_in: where.trim(), hc_placed_on: when }).eq('id', placing.id)
    if (error) { toast("Couldn't record that. Check your access."); return false }
    toast(`${placing.full_name} recorded as placed in ${where.trim()}.`)
    refresh()
  }

  const Row = ({ c, children }) => (
    <div className="flex items-center gap-3 py-3 border-b border-[#ECE7DA] last:border-b-0 flex-wrap">
      <Avatar name={c.full_name} />
      <div className="flex-1 min-w-45">
        <div className="text-[13px] font-extrabold text-ink-deep flex items-center gap-1.5 flex-wrap">
          <button type="button" onClick={() => dlg.openContact(c)} className="underline decoration-line underline-offset-3 hover:text-orange">{c.full_name}</button>
          <SourceBadge c={c} />
        </div>
        {children}
      </div>
    </div>
  )

  return (
    <>
      <PageHead
        crumb={<Breadcrumb>Follow Up</Breadcrumb>}
        title="House Church"
        sub="People who asked to join a house church. Placement belongs to the overseer; the app records interest, eligibility, and where someone was placed."
      />
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr))] mb-5.5">
        <Stat label="Waiting on the overseer" value={waiting.length} detail="Eligible and interested" />
        <Stat label="Placed" value={placed.length} detail="Recorded" />
        <Stat label="Not yet eligible" value={notYet.length} detail="Steps still to finish" />
      </div>
      <div className="grid gap-4.5 [grid-template-columns:repeat(auto-fit,minmax(min(440px,100%),1fr))] items-start">
        <Card>
          <CardHead title="Waiting on the overseer" sub="Interested and eligible: all four steps done." />
          {waiting.map((c) => (
            <Row key={c.id} c={c}>
              <div className="text-xs text-muted-sub mt-0.5">{c.address || 'Area not given'} · completed {fmtDate(c.completed_on)}</div>
              <div className="flex gap-1.5 flex-wrap mt-2 items-center">
                <CallLink phone={c.phone} />
                {canLog && <BtnSm variant="outline" onClick={() => dlg.logOutcome(c)}>Log a call</BtnSm>}
                {isDirector && <BtnSm onClick={() => { setWhere(''); setWhen(todayStr()); setPlacing(c) }}>Record placement</BtnSm>}
              </div>
            </Row>
          ))}
          {!waiting.length && <EmptyState>Nobody waiting on placement.</EmptyState>}
          {!isDirector && waiting.length > 0 && <div className="text-xs text-muted-label pt-3">Placements are recorded by an admin once the overseer has placed someone.</div>}
        </Card>
        <div className="flex flex-col gap-4.5">
          <Card>
            <CardHead title="Interested, not yet eligible" sub="House church needs all four Next Steps. The next move is getting them to a Sunday." />
            {notYet.map((c) => (
              <Row key={c.id} c={c}>
                <div className="flex items-center gap-1.5 mt-1"><Badge variant="grey">{c.steps_done ? `${c.steps_done} of 4 steps` : 'No steps yet'}</Badge><span className="text-xs text-muted-sub">{c.address || ''}</span></div>
              </Row>
            ))}
            {!notYet.length && <EmptyState>Nobody here.</EmptyState>}
          </Card>
          <Card>
            <CardHead title="Placed" sub="Where the overseer placed them." />
            {placed.map((c) => (
              <Row key={c.id} c={c}><div className="text-xs text-muted-sub mt-0.5">{c.hc_placed_in}{c.hc_placed_on ? ` · ${fmtDate(c.hc_placed_on)}` : ''}</div></Row>
            ))}
            {!placed.length && <EmptyState>No placements recorded yet.</EmptyState>}
          </Card>
        </div>
      </div>

      <Modal
        open={!!placing}
        title={`Record placement: ${placing?.full_name || ''}`}
        sub="Only after the overseer has placed them. This records which house church they joined."
        saveLabel="Record it"
        onClose={() => setPlacing(null)}
        onSave={place}
      >
        <Field label="Placed in" htmlFor="hc-where"><TextInput id="hc-where" value={where} onChange={(e) => setWhere(e.target.value)} placeholder="e.g. Ajah house church" /></Field>
        <Field label="Date" htmlFor="hc-when"><TextInput id="hc-when" type="date" value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
      </Modal>
      {dlg.dialogs}
    </>
  )
}
