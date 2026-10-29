import { useState } from 'react'
import PageHead, { Breadcrumb } from '../components/PageHead.jsx'
import Card from '../components/Card.jsx'
import Avatar from '../components/Avatar.jsx'
import Badge from '../components/Badge.jsx'
import BtnSm from '../components/BtnSm.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { Chips, Stat } from '../components/followup.jsx'
import { useContactDialogs } from '../components/useContactDialogs.jsx'
import { useMe } from '../context/MeContext.jsx'
import { useAppToast } from '../context/ToastContext.jsx'
import { downloadCSV } from '../lib/csv.js'
import { fmtWhen } from '../lib/format.js'
import { CONTACT_SOURCES, OUTCOME_ACTIONS, outcomeLabel } from '../config/site.js'

const th = 'py-1.5 px-2 pb-2.5 font-semibold border-b border-[#ECE7DA] text-left'
const td = 'py-2.75 px-2 border-b border-[#ECE7DA] align-top'
const ACTION_VARIANT = { called: 'green', sent: 'navy', texted: 'navy', door_open: 'grey' }

const startOfWeek = (offset = 0) => {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - offset * 7) // Monday
  return d
}

// Every call, text and visit anyone has logged, with full control: log a
// new one, edit or delete. Follow Up edits and deletes its own; the admin
// any. The database enforces the same rule (outcomes RLS), so the buttons
// only reflect it.
export default function Outcomes({ contacts, outcomes, staff, refresh }) {
  const me = useMe()
  const toast = useAppToast()
  const isDirector = me?.role === 'director'
  const canLog = isDirector || me?.role === 'support'
  const dlg = useContactDialogs({ contacts, outcomes, staff, refresh })
  const [week, setWeek] = useState('this')
  const [who, setWho] = useState('all')
  const [what, setWhat] = useState('all')

  const thisMon = startOfWeek(0), lastMon = startOfWeek(1)
  const inWeek = (o, w) => {
    const t = new Date(o.created_at)
    return w === 'all' || (w === 'this' ? t >= thisMon : t >= lastMon && t < thisMon)
  }
  const callers = [...new Map(outcomes.filter((o) => o.logged_by).map((o) => [o.logged_by, o.logged_by_name])).entries()]
  const rows = outcomes.filter((o) => inWeek(o, week)
    && (who === 'all' || (who === 'mine' ? o.logged_by === me?.id : o.logged_by === who))
    && (what === 'all' || o.action === what))
  const thisWeek = outcomes.filter((o) => inWeek(o, 'this'))
  const count = (a) => thisWeek.filter((o) => o.action === a).length
  const canEdit = (o) => isDirector || (me?.role === 'support' && o.logged_by === me.id)

  const exportRows = () => {
    downloadCSV(`outcomes-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Person', 'Source', 'What was done', 'What happened', 'Logged by', 'When'],
      ...rows.map((o) => [o.person_name, (CONTACT_SOURCES[o.person_source] || {}).label || '', outcomeLabel(o.action), o.note || '', o.logged_by_name || 'No caller recorded', new Date(o.created_at).toLocaleString('en-GB')]),
    ])
    toast(`Exported ${rows.length} outcomes.`)
  }

  return (
    <>
      <PageHead
        crumb={<Breadcrumb>Follow Up</Breadcrumb>}
        title="Outcomes"
        sub={`Every call, text and visit anyone has logged. ${isDirector ? 'As admin you can edit or delete any of them.' : me?.role === 'support' ? 'You can edit or delete the ones you logged; the rest are read-only.' : 'Read-only.'}`}
        right={<div className="flex gap-2 flex-wrap">
          {isDirector && <BtnSm variant="outline" onClick={exportRows}>Export these</BtnSm>}
          {canLog && <BtnSm onClick={dlg.logAny}>+ Log an outcome</BtnSm>}
        </div>}
      />

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr))] mb-5.5">
        <Stat label="Logged this week" value={thisWeek.length} detail="Since Monday" />
        <Stat label="By you" value={thisWeek.filter((o) => o.logged_by === me?.id).length} detail="This week" />
        <Stat label="Called" value={count('called')} detail="Spoke on the phone" />
        <Stat label="Messaged" value={count('sent') + count('texted')} detail="Sent or texted" />
        <Stat label="Door open" value={count('door_open')} detail="No response, not chased" />
      </div>

      <Card>
        <div className="flex flex-col gap-2.5 mb-3.5">
          <div className="flex gap-3.5 flex-wrap">
            <Chips label="Filter by week" value={week} onChange={setWeek} options={[['this', 'This week'], ['last', 'Last week'], ['all', 'All time']]} />
            <Chips label="Filter by who logged it" value={who} onChange={setWho}
              options={[['all', 'Everyone'], ['mine', 'Mine'], ...callers.filter(([id]) => id !== me?.id).map(([id, n]) => [id, (n || '').split(' ')[0] || 'Someone'])]} />
          </div>
          <Chips label="Filter by what was done" value={what} onChange={setWhat} options={[['all', 'Anything'], ...OUTCOME_ACTIONS.map((a) => [a.id, outcomeLabel(a.id)])]} />
          <div className="font-mono text-[10.5px] text-muted-label">{rows.length} of {outcomes.length} outcomes</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-190">
            <thead>
              <tr className="font-mono text-[9.5px] tracking-widest uppercase text-muted-label">
                <th className={th + ' pl-0'}>Person</th><th className={th}>What was done</th><th className={th}>What happened</th><th className={th}>By</th><th className={th}>When</th><th className={th + ' pr-0'}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const c = contacts.find((x) => x.id === o.person_id)
                return (
                  <tr key={o.id}>
                    <td className={td + ' pl-0'}>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={o.person_name} size={32} fontSize={11} />
                        <div>
                          {c ? <button type="button" onClick={() => dlg.openContact(c)} className="text-[13px] font-extrabold text-ink-deep text-left underline decoration-line underline-offset-3 hover:text-orange">{o.person_name}</button>
                            : <span className="text-[13px] font-extrabold text-ink-deep">{o.person_name}</span>}
                          <div className="mt-1"><Badge variant={(CONTACT_SOURCES[o.person_source] || CONTACT_SOURCES.next_steps).variant}>{(CONTACT_SOURCES[o.person_source] || CONTACT_SOURCES.next_steps).label}</Badge></div>
                        </div>
                      </div>
                    </td>
                    <td className={td}><Badge variant={ACTION_VARIANT[o.action]}>{outcomeLabel(o.action)}</Badge></td>
                    <td className={td + ' text-[12.5px] leading-snug max-w-90'}>{o.note || <span className="text-muted-faint">No note written.</span>}</td>
                    <td className={td + ' whitespace-nowrap text-[12.5px] font-bold text-ink-deep'}>{o.logged_by_name || <span className="text-muted-faint font-normal">No caller recorded</span>}</td>
                    <td className={td + ' font-mono text-[11px] text-muted-body whitespace-nowrap'}>{fmtWhen(o.created_at)}</td>
                    <td className={td + ' pr-0 whitespace-nowrap'}>
                      {canEdit(o) ? (
                        <div className="flex gap-1.5 justify-end">
                          <BtnSm variant="outline" onClick={() => dlg.editOutcome(o)}>Edit</BtnSm>
                          <BtnSm variant="outline" className="border-[#E8B4A6]! text-orange-deep!" onClick={() => dlg.deleteOutcome(o)}>Delete</BtnSm>
                        </div>
                      ) : <span className="text-[11.5px] text-muted-faint">{o.logged_by_name ? `Logged by ${o.logged_by_name.split(' ')[0]}` : ''}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && <EmptyState>Nothing logged that matches these filters.</EmptyState>}
      </Card>
      {dlg.dialogs}
    </>
  )
}
