import { useMemo, useState } from 'react'
import PageHead, { Breadcrumb } from '../components/PageHead.jsx'
import Card from '../components/Card.jsx'
import Avatar from '../components/Avatar.jsx'
import BtnSm from '../components/BtnSm.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { AssigneeBadge, CallLink, Chips, NeedsCheckBadge, ReasonBadge, SourceBadge, WorkerBadge, isMember, whyLine } from '../components/followup.jsx'
import { useContactDialogs } from '../components/useContactDialogs.jsx'
import { useMe } from '../context/MeContext.jsx'
import { useAppToast } from '../context/ToastContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { fmtDate, fmtWhen } from '../lib/format.js'
import { outcomeLabel } from '../config/site.js'

const th = 'py-1.5 px-2 pb-2.5 font-semibold border-b border-[#ECE7DA] text-left'
const td = 'py-2.75 px-2 border-b border-[#ECE7DA] align-top'

// Follow Up's contacts book: everyone in its care, searchable, with where
// they came from, why they are here, who has them, and what happened last.
export default function Contacts({ contacts, outcomes, staff, refresh }) {
  const me = useMe()
  const isDirector = me?.role === 'director'
  const canAct = isDirector || me?.role === 'support'
  const toast = useAppToast()
  const dlg = useContactDialogs({ contacts, outcomes, staff, refresh })
  const [q, setQ] = useState('')
  // Only the admin assigns, and only to people on the current team who make
  // calls (admins and Follow Up). The list comes from staff_names(), i.e. the
  // Team page, so removing someone from the team removes them here too.
  const callers = staff.filter((s) => s.role === 'director' || s.role === 'support')
  const assign = async (c, id) => {
    const { error } = await supabase.from('people').update({ assigned_to: id || null }).eq('id', c.id)
    if (error) { toast("Couldn't assign. Check your access."); return }
    toast(id ? `${c.full_name} assigned to ${callers.find((s) => s.id === id)?.full_name || 'them'}.` : `${c.full_name} is unassigned.`)
    refresh()
  }
  const [source, setSource] = useState('all')
  // Callers open on everyone waiting rather than "My calls": with nothing
  // assigned yet, "My calls" would be an empty page. The dashboard already
  // puts their own calls first.
  const [status, setStatus] = useState(me?.role === 'support' ? 'waiting' : 'all')

  const groups = useMemo(() => [...new Set(contacts.filter((c) => c.source === 'group' && c.group_name).map((c) => c.group_name))], [contacts])
  const sourceOpts = [['all', 'All sources'], ['next_steps', 'Next Steps'], ['welcome_card', 'Welcome card'], ...groups.map((g) => ['g:' + g, g])]
  const statusOpts = [['all', 'Everyone'], ['mine', 'My calls'], ['waiting', 'Waiting on a call'], ['contacted', 'Contacted'], ['check', 'Needs a check'], ['unassigned', 'Nobody assigned']]

  const needle = q.trim().toLowerCase()
  const nDigits = needle.replace(/\D/g, '').replace(/^0/, '')
  const list = contacts.filter((c) => {
    if (source !== 'all') {
      if (source.startsWith('g:')) { if (c.group_name !== source.slice(2)) return false }
      else if (source === 'welcome_card' ? !['welcome_card', 'referral'].includes(c.source) : c.source !== source) return false
    }
    if (needle && !((c.full_name || '').toLowerCase().includes(needle) || (c.email || '').toLowerCase().includes(needle) || (nDigits.length > 3 && (c.phone || '').includes(nDigits)))) return false
    if (status === 'mine') return c.assigned_to === me?.id && c.waiting
    if (status === 'waiting') return c.waiting
    if (status === 'contacted') return !!c.last_outcome_at
    if (status === 'check') return !!c.needs_check && !isMember(c)
    if (status === 'unassigned') return !c.assigned_to && c.waiting
    return true
  })

  return (
    <>
      <PageHead
        crumb={<Breadcrumb>Follow Up</Breadcrumb>}
        title="Contacts"
        sub="Everyone Follow Up looks after: welcome cards, people handed over from Next Steps, and group lists. Tap a name for their full record."
        right={canAct && (
          <div className="flex gap-2 flex-wrap">
            {isDirector && <BtnSm variant="outline" onClick={dlg.importSheet}>Import a spreadsheet</BtnSm>}
            <BtnSm onClick={dlg.addContact}>+ Add a contact</BtnSm>
          </div>
        )}
      />
      <Card>
        <div className="flex flex-col gap-2.5 mb-3.5">
          <div className="flex gap-2.5 flex-wrap items-center">
            <label htmlFor="ct-search" className="sr-only">Search contacts</label>
            <input id="ct-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, phone or email"
              className="flex-[1_1_260px] min-h-10.5 px-3.5 border-[1.5px] border-line rounded-[10px] text-sm bg-white outline-none focus:border-orange" />
            <Chips options={sourceOpts} value={source} onChange={setSource} label="Filter by source" />
          </div>
          <Chips options={statusOpts} value={status} onChange={setStatus} label="Filter by status" />
          <div className="font-mono text-[10.5px] text-muted-label">{list.length} of {contacts.length} contacts</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-190">
            <thead>
              <tr className="font-mono text-[9.5px] tracking-widest uppercase text-muted-label">
                <th className={th + ' pl-0'}>Person</th><th className={th}>Why they are here</th><th className={th}>Assigned</th><th className={th}>Contact</th><th className={th + ' pr-0'}>Last outcome</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td className={td + ' pl-0'}>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={c.full_name} size={32} fontSize={11} />
                      <div>
                        <button type="button" onClick={() => dlg.openContact(c)} className="text-[13px] font-extrabold text-ink-deep text-left underline decoration-line underline-offset-3 hover:text-orange">{c.full_name}</button>
                        <div className="flex gap-1.5 flex-wrap mt-1"><SourceBadge c={c} /><WorkerBadge c={c} /><NeedsCheckBadge c={c} /></div>
                      </div>
                    </div>
                  </td>
                  <td className={td}>
                    <ReasonBadge c={c} />
                    <div className="text-xs text-muted-body mt-1 leading-snug max-w-80">{whyLine(c)}</div>
                    {c.needs_check && !isMember(c) && <div className="text-[11.5px] text-amber-text mt-1 max-w-80">{c.needs_check}</div>}
                  </td>
                  <td className={td + ' whitespace-nowrap'}>
                    {isDirector && !isMember(c) ? (
                      <select
                        aria-label={`Assign ${c.full_name}`}
                        value={c.assigned_to || ''}
                        onChange={(e) => assign(c, e.target.value)}
                        className={`min-h-9 max-w-40 px-2.5 rounded-[10px] border-[1.5px] text-[12.5px] font-bold bg-white outline-none focus:border-orange ${c.assigned_to ? 'border-line text-ink-deep' : 'border-dashed border-line text-muted-label'}`}
                      >
                        <option value="">Nobody yet</option>
                        {callers.map((s) => <option key={s.id} value={s.id}>{s.full_name}{s.id === me.id ? ' (me)' : ''}</option>)}
                      </select>
                    ) : <AssigneeBadge c={c} me={me} />}
                  </td>
                  <td className={td}>
                    <div className="flex flex-col gap-1">
                      <CallLink phone={c.phone} />
                      {c.email ? <a href={`mailto:${c.email}`} className="font-mono text-[11px] text-muted-body">{c.email}</a> : <span className="font-mono text-[11px] text-muted-faint">No email on file</span>}
                    </div>
                  </td>
                  <td className={td + ' pr-0'}>
                    {c.last_outcome_at
                      ? <div className="text-xs max-w-60 leading-snug"><span className="font-bold text-green">{outcomeLabel(c.last_action)}</span> · {c.last_outcome_by || 'No caller recorded'}, {fmtWhen(c.last_outcome_at)}</div>
                      : <span className="text-xs text-muted-faint">Nothing yet{c.first_visit ? ` · since ${fmtDate(c.first_visit)}` : ''}</span>}
                    {canAct && c.waiting && <BtnSm className="mt-2" onClick={() => dlg.logOutcome(c)}>Log outcome</BtnSm>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!list.length && <EmptyState>Nobody matches these filters.</EmptyState>}
      </Card>
      {dlg.dialogs}
    </>
  )
}
