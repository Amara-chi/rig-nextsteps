import { useEffect, useRef, useState } from 'react'
import PageHead, { Breadcrumb, CrumbLink } from '../components/PageHead.jsx'
import Card, { CardHead } from '../components/Card.jsx'
import Badge from '../components/Badge.jsx'
import Avatar from '../components/Avatar.jsx'
import Btn from '../components/Btn.jsx'
import EmptyState from '../components/EmptyState.jsx'
import LiveDot from '../components/LiveDot.jsx'
import { useMe } from '../context/MeContext.jsx'
import { useAppToast } from '../context/ToastContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { fmtTime, todayStr } from '../lib/format.js'
import { CHECKIN_URL, EMAIL_REPORTS, STEPS, stepOf } from '../config/site.js'

// Keyed by session.id from the parent (see SessionPane below) so this whole
// subtree — including the QR canvas — only remounts when the open session
// actually changes, not on every 10s poll. Same fix as the old app's
// renderedSessionId guard, just expressed as React's own remount primitive
// instead of a hand-rolled comparison.
function SessionLiveCard({ session, onEnd, isDirector }) {
  const qrRef = useRef(null)

  useEffect(() => {
    if (!qrRef.current) return
    qrRef.current.innerHTML = ''
    // eslint-disable-next-line no-new
    new window.QRCode(qrRef.current, {
      text: CHECKIN_URL,
      width: 200,
      height: 200,
      colorDark: '#F25125',
      colorLight: '#FFFFFF',
      correctLevel: window.QRCode.CorrectLevel.M,
    })
  }, [])

  return (
    <Card className="mb-0">
      <CardHead
        title={`Step ${session.step} — ${stepOf(session.step).title}`}
        sub={stepOf(session.step).video}
        right={<Badge variant="green"><LiveDot className="mr-0.5!" />Session open</Badge>}
      />
      <div className="border-[1.5px] border-line rounded-2xl p-5.5 text-center bg-white mb-4">
        <div ref={qrRef} className="inline-block" />
        <div className="font-extrabold text-[15px] text-ink-deep mt-3">Scan to check in</div>
        <div className="font-mono text-[10px] tracking-[.1em] uppercase text-muted-label mt-0.75 break-all">{CHECKIN_URL}</div>
      </div>
      {isDirector && <Btn variant="secondary" onClick={onEnd}>End session &amp; go to report</Btn>}
    </Card>
  )
}

export default function SessionPane({ onNavigate, openSession, sessionFeed, onDataChange }) {
  const me = useMe()
  const isDirector = me?.role === 'director'
  const toast = useAppToast()
  const [pickedStep, setPickedStep] = useState(null)

  const openTheSession = async () => {
    if (!pickedStep) { toast('Pick which step is running first.'); return }
    const { error } = await supabase.from('sessions').insert({ step: pickedStep, session_date: todayStr(), is_open: true })
    if (error) { toast("Couldn't open the session — please try again."); return }
    await onDataChange()
    toast(`Session open — <b>Step ${pickedStep}</b>. QR is live.`)
  }

  const endSession = async () => {
    if (!openSession) return
    const closedId = openSession.id
    await supabase.from('sessions').update({ is_open: false }).eq('id', closedId)
    toast('Session closed — report is ready in <b>Reports</b>.')
    if (EMAIL_REPORTS === true) {
      try {
        const { error } = await supabase.functions.invoke('email-report', { body: { session_id: closedId } })
        toast(error ? "Report ready — email add-on couldn't send (check its setup)." : 'Report ready — <b>emailed to leadership</b>.')
      } catch { /* add-on not deployed; ignore */ }
    }
    await onDataChange()
    onNavigate('reports')
  }

  return (
    <>
      <PageHead
        crumb={<Breadcrumb><CrumbLink onClick={() => onNavigate('session')}>Today</CrumbLink> / Check-in</Breadcrumb>}
        title="Check-in"
        sub="Open today's step, put the QR on the TV, watch people arrive."
      />

      {!openSession && isDirector && (
        <Card className="mb-0">
          <CardHead title="Which step is running today?" />
          <div className="grid grid-cols-4 gap-3 max-tablet:grid-cols-2">
            {STEPS.map((s) => (
              <button
                key={s.n}
                type="button"
                onClick={() => setPickedStep(s.n)}
                className={`text-left pt-4.5 px-4 pb-3.75 rounded-2xl border-[1.5px] shadow-card transition-[.16s] ${
                  pickedStep === s.n ? 'border-orange bg-orange-soft' : 'border-line bg-white'
                }`}
              >
                <div className={`w-9.5 h-11 grid place-items-center rounded-arch mb-2.75 font-black text-base ${pickedStep === s.n ? 'bg-orange text-white' : 'bg-cream-deep text-ink-deep'}`}>{s.n}</div>
                <div className="font-extrabold text-[13.5px] tracking-[-.015em] leading-tight text-ink-deep">{s.title}</div>
                <div className="text-[11px] text-muted-label mt-0.75">{s.video}</div>
              </button>
            ))}
          </div>
          <Btn className="max-w-75 mt-5" onClick={openTheSession}>Open today's session</Btn>
        </Card>
      )}

      {!openSession && !isDirector && (
        <Card className="mb-0"><EmptyState>No session is open right now.</EmptyState></Card>
      )}

      {openSession && (
        <div className="grid grid-cols-2 gap-4.5 max-tablet:grid-cols-1">
          <SessionLiveCard key={openSession.id} session={openSession} onEnd={endSession} isDirector={isDirector} />
          <Card className="mb-0">
            <CardHead title={<span className="inline-flex items-center"><LiveDot />Arriving now</span>} right={<Badge variant="orange">{sessionFeed.length} checked in</Badge>} />
            <div className="flex flex-col max-h-105 overflow-auto">
              {sessionFeed.length ? sessionFeed.map((c, i) => (
                <div key={i} className="flex items-center gap-2.75 py-2.5 px-1.5 rounded-[10px] hover:bg-row-hover">
                  <Avatar name={c.people?.full_name} size={28} fontSize={10} />
                  <div>
                    <div className="font-bold text-[13px] text-ink-deep">{c.people?.full_name}</div>
                    <div className="text-[11px] text-muted-label">{c.people?.created_at?.slice(0, 10) === todayStr() ? 'First-timer' : 'Returning'}</div>
                  </div>
                  <div className="ml-auto font-mono text-[10px] text-muted-faint flex-none">{fmtTime(c.created_at)}</div>
                </div>
              )) : <EmptyState>Waiting for the first scan…</EmptyState>}
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
