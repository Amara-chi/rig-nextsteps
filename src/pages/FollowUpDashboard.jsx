import { useMemo } from 'react'
import PageHead, { Breadcrumb } from '../components/PageHead.jsx'
import Card, { CardHead } from '../components/Card.jsx'
import Avatar from '../components/Avatar.jsx'
import Badge from '../components/Badge.jsx'
import BtnSm from '../components/BtnSm.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { AssigneeBadge, CallLink, ReasonBadge, SourceBadge, Stat, WorkerBadge, checkBadgeClass, whyLine } from '../components/followup.jsx'
import { useContactDialogs } from '../components/useContactDialogs.jsx'
import { useMe } from '../context/MeContext.jsx'
import { fmtDate, fmtWhen, telHref, fmtPhone } from '../lib/format.js'
import { MONTHS, outcomeLabel } from '../config/site.js'

const HOW = [
  { d: 'M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2zM7 10a2 2 0 104 0 2 2 0 00-4 0zM5 17a4 4 0 018 0M14 9h5M14 13h5', t: 'Filled in a welcome card', s: 'A first-time visitor at a service, with their prayer request and who invited them.' },
  { d: 'M12 3a9 9 0 110 18 9 9 0 010-18zM8 12l3 3 5-6', t: 'Finished all four steps', s: 'From Next Steps. The membership window opens. Leadership decides; the app records it.' },
  { d: 'M4 5h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM3 10h18M8 3v4M16 3v4M10 14l4 4M14 14l-4 4', t: 'Missed a Sunday with steps left', s: 'From Next Steps. Monday call, then a text, then the door stays open. Never chased.' },
  { d: 'M4 4h16a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 4zM12 8v4M12 15h.01', t: 'The automatic message failed', s: 'Not on WhatsApp, or a wording not yet approved. Nobody has reached them.' },
  { d: 'M9 14L4 9l5-5M4 9h9a7 7 0 017 7v4', t: 'Asked for something in a reply', s: 'Passed over from Messaging because a reply needs a person.' },
]

// Birthdays in the next 7 days, from the contact's birthday fields.
function upcomingBirthdays(contacts) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return contacts.filter((c) => c.birth_day && c.birth_month).map((c) => {
    let d = new Date(today.getFullYear(), c.birth_month - 1, c.birth_day)
    if (d < today) d = new Date(today.getFullYear() + 1, c.birth_month - 1, c.birth_day)
    return { c, d, days: Math.round((d - today) / 86400000) }
  }).filter((x) => x.days <= 7).sort((a, b) => a.days - b.days)
}

export default function FollowUpDashboard({ contacts, outcomes, staff, refresh, onNavigate }) {
  const me = useMe()
  const canAct = me?.role === 'director' || me?.role === 'support'
  const dlg = useContactDialogs({ contacts, outcomes, staff, refresh })

  const waiting = contacts.filter((c) => c.waiting)
  const mine = waiting.filter((c) => c.assigned_to === me?.id)
  const calls = useMemo(() => [...waiting].sort((a, b) => (a.assigned_to === me?.id ? 0 : a.assigned_to ? 2 : 1) - (b.assigned_to === me?.id ? 0 : b.assigned_to ? 2 : 1)).slice(0, 8), [waiting, me])
  const weekAgo = Date.now() - 7 * 86400000
  const thisWeek = outcomes.filter((o) => new Date(o.created_at).getTime() >= weekAgo)
  const checks = contacts.filter((c) => c.needs_check)
  const members = contacts.filter((c) => c.steps_done === 4 && !c.member_since)
  const ready = members.filter((c) => c.completed_on && (Date.now() - new Date(c.completed_on).getTime()) >= 30 * 86400000)
  const hc = contacts.filter((c) => c.hc_interest && !c.hc_placed_in && c.steps_done === 4)
  const bdays = upcomingBirthdays(contacts)

  return (
    <>
      <PageHead
        crumb={<Breadcrumb>Follow Up</Breadcrumb>}
        title="This week's follow up"
        sub="New visitors from the welcome card, and people Next Steps has handed over. Calls are made by a person, from their own phone; the app records what happened."
        right={canAct && <BtnSm onClick={dlg.addContact}>+ Add a contact</BtnSm>}
      />

      <div className="bg-ink-deep text-white rounded-[22px] py-4.5 px-5.5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr))] mb-5.5">
        {HOW.map((h) => (
          <div key={h.t} className="flex gap-3 items-start">
            <span className="flex-none w-9.5 h-9.5 rounded-full bg-white/10 text-orange grid place-items-center" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={h.d} /></svg>
            </span>
            <div><div className="text-[13px] font-extrabold">{h.t}</div><div className="text-xs text-nav-idle mt-0.5 leading-normal">{h.s}</div></div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr))] mb-5.5">
        <Stat label="My calls" value={mine.length} detail={`Assigned to ${(me?.full_name || '').split(' ')[0]}`} />
        <Stat label="All waiting" value={waiting.length} detail="Nothing logged yet" />
        <Stat label="Logged this week" value={thisWeek.length} detail="Outcomes recorded" />
        <Stat label="Needs a check" value={checks.length} detail="Phone, email or duplicate" />
        <Stat label="Birthdays" value={bdays.length} detail="In the next 7 days" />
        <Stat label="Membership ready" value={ready.length} detail="Window has passed" />
      </div>

      <div className="grid gap-4.5 [grid-template-columns:repeat(auto-fit,minmax(min(440px,100%),1fr))] items-start">
        <div className="flex flex-col gap-4.5">
          <Card>
            <CardHead title="Calls to make" sub="Yours first. Call from your phone, then log what happened." right={<BtnSm variant="outline" onClick={() => onNavigate('contacts')}>All contacts</BtnSm>} />
            {calls.length ? calls.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-3 border-b border-[#ECE7DA] last:border-b-0 flex-wrap">
                <Avatar name={c.full_name} />
                <div className="flex-1 min-w-50">
                  <div className="text-[13px] font-extrabold text-ink-deep flex items-center gap-1.5 flex-wrap">
                    <button type="button" onClick={() => dlg.openContact(c)} className="underline decoration-line underline-offset-3 hover:text-orange">{c.full_name}</button>
                    <SourceBadge c={c} /><ReasonBadge c={c} /><WorkerBadge c={c} />{c.needs_check && <span className={checkBadgeClass}>Needs a check</span>}<AssigneeBadge c={c} me={me} />
                  </div>
                  <div className="text-xs text-muted-sub mt-0.5 leading-normal">{whyLine(c)}</div>
                  {c.prayer_request && <div className="text-xs text-ink mt-1 leading-normal"><span className="font-mono text-[9.5px] tracking-[.1em] uppercase text-muted-label font-semibold mr-1.5">Prayer request</span>{c.prayer_request}</div>}
                </div>
                <div className="flex flex-col gap-1 items-start">
                  <CallLink phone={c.phone} />
                  {c.email && <a href={`mailto:${c.email}`} className="font-mono text-[11px] text-muted-body px-0.5">{c.email}</a>}
                </div>
                {canAct && <BtnSm onClick={() => dlg.logOutcome(c)}>Log outcome</BtnSm>}
              </div>
            )) : <EmptyState>Nobody waiting on a call. Well done.</EmptyState>}
          </Card>

          <Card>
            <CardHead title="Outcomes logged" sub="The latest few. Each is also a note on the person's record." right={<BtnSm variant="outline" onClick={() => onNavigate('outcomes')}>All outcomes</BtnSm>} />
            {outcomes.slice(0, 5).map((o) => (
              <div key={o.id} className="flex gap-3 items-start py-3 border-b border-[#ECE7DA] last:border-b-0 flex-wrap">
                <span className="flex-none w-8.5 h-8.5 rounded-full bg-green-soft text-green grid place-items-center" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12l5 5 9-10" /></svg></span>
                <div className="flex-1 min-w-55">
                  <div className="text-[13px] font-extrabold text-ink-deep">{o.person_name}</div>
                  <div className="text-[12.5px] mt-0.5 leading-normal"><strong>{outcomeLabel(o.action)}.</strong> {o.note || 'No note written.'}</div>
                </div>
                <div className="font-mono text-[10.5px] text-muted-label whitespace-nowrap">{o.logged_by_name || 'No caller recorded'} · {fmtWhen(o.created_at)}</div>
              </div>
            ))}
            {!outcomes.length && <EmptyState>Nothing logged yet.</EmptyState>}
          </Card>
        </div>

        <div className="flex flex-col gap-4.5">
          <Card>
            <CardHead title="Membership" sub="All 4 steps done opens a 30-day window. Leadership decides; the app records it." right={<BtnSm variant="outline" onClick={() => onNavigate('membership')}>Open</BtnSm>} />
            {members.slice(0, 5).map((c) => {
              const passed = ready.includes(c)
              return (
                <div key={c.id} className="flex items-center gap-3 py-2.75 border-b border-[#ECE7DA] last:border-b-0">
                  <div className="flex gap-0.75 flex-none" aria-label="All four steps done">{[0, 1, 2, 3].map((i) => <span key={i} className="w-2.25 h-3.25 rounded-arch bg-orange" />)}</div>
                  <div className="flex-1 min-w-0"><div className="text-[13px] font-extrabold text-ink-deep">{c.full_name}</div><div className="text-xs text-muted-sub">Completed {fmtDate(c.completed_on)}</div></div>
                  <Badge variant={passed ? 'orange' : 'navy'}>{passed ? 'Ready' : 'Window open'}</Badge>
                </div>
              )
            })}
            {!members.length && <EmptyState>Nobody in the membership window.</EmptyState>}
          </Card>

          <Card>
            <CardHead title="House church" sub="Interested and eligible, waiting on the overseer to place them." right={<BtnSm variant="outline" onClick={() => onNavigate('house-church')}>Open</BtnSm>} />
            {hc.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2.75 border-b border-[#ECE7DA] last:border-b-0">
                <Avatar name={c.full_name} />
                <div className="flex-1 min-w-0"><div className="text-[13px] font-extrabold text-ink-deep">{c.full_name}</div><div className="text-xs text-muted-sub">{c.address || 'Area not given'}</div></div>
              </div>
            ))}
            {!hc.length && <EmptyState>Nobody waiting on placement.</EmptyState>}
          </Card>

          <Card>
            <CardHead title="Birthdays this week" sub="A reason to call that isn't about attendance." />
            {bdays.map(({ c, d, days }) => (
              <div key={c.id} className="flex items-center gap-3 py-2.75 border-b border-[#ECE7DA] last:border-b-0">
                <div className="flex-none w-9.5 h-9.5 rounded-[10px] bg-orange-soft text-orange-deep flex flex-col items-center justify-center font-mono font-semibold leading-none" aria-hidden="true">
                  <span className="text-[13px]">{d.getDate()}</span><span className="text-[8.5px] tracking-[.08em]">{MONTHS[d.getMonth()].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0"><div className="text-[13px] font-extrabold text-ink-deep">{c.full_name}</div><div className="text-xs text-muted-sub">{days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'long' })}</div></div>
                {c.phone && <a href={telHref(c.phone)} className="font-mono text-[11.5px] text-ink-deep no-underline py-1.75 px-2.5 rounded-[10px] border-[1.5px] border-line whitespace-nowrap">{fmtPhone(c.phone)}</a>}
              </div>
            ))}
            {!bdays.length && <EmptyState>No birthdays in the next 7 days.</EmptyState>}
          </Card>
        </div>
      </div>
      {dlg.dialogs}
    </>
  )
}
