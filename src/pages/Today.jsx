import { useMemo, useState } from 'react'
import { useMe } from '../context/MeContext.jsx'
import { fmtDate } from '../lib/format.js'

const DAY = 86400000
const RINGS = [
  { k: 'msg', label: 'Messages delivered', color: '#F25125', r: 120 },
  { k: 'reach', label: 'Reached in 7 days', color: '#B06A00', r: 92 },
  { k: 'back', label: 'Came back after a call', color: '#1F8A6B', r: 64 },
]
const RAMP = ['var(--color-pipeline-1)', 'var(--color-pipeline-2)', 'var(--color-pipeline-3)', 'var(--color-pipeline-4)', 'var(--color-pipeline-5)']
const pct = (n, d) => (d ? Math.round((n / d) * 100) : null)

// The last n Sundays as YYYY-MM-DD, oldest first, ending with the most recent.
function lastSundays(n) {
  const d = new Date(); d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return Array.from({ length: n }, (_, i) => new Date(d.getTime() - (n - 1 - i) * 7 * DAY).toISOString().slice(0, 10))
}

function Pill({ on, onClick, children, dark }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`min-h-9 px-4 rounded-full font-bold text-[13px] transition-colors ${on ? (dark ? 'bg-white text-ink-deep' : 'bg-white text-ink-deep') : 'bg-transparent text-muted-sub'}`}>
      {children}
    </button>
  )
}

// Today: soft bars, one nested ring, very little text. Three numbers that
// say whether the week is going well (delivered, reached, came back), the
// Sunday rhythm, and the handful of things that need someone today.
export default function Today({ people, contacts, outcomes, sent, conversations, checkinDates, followups, bibleSessions, onNavigate }) {
  const me = useMe()
  const [range, setRange] = useState('week')
  const [active, setActive] = useState(null)
  const [hover, setHover] = useState(null)
  const [chart, setChart] = useState('checkins')
  const [bar, setBar] = useState(null)
  const [done, setDone] = useState({})

  const month = range === 'month'
  const since = Date.now() - (month ? 30 : 7) * DAY
  const inRange = (ts) => ts && new Date(ts).getTime() >= since

  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' })()
  const first = (me?.full_name || '').split(' ')[0]
  const dateLine = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  // ---- the three rings ----
  const ringData = useMemo(() => {
    const out = sent.filter((m) => m.template_name && inRange(m.created_at))
    const delivered = out.filter((m) => ['delivered', 'read'].includes(m.status)).length
    const att = followups.filter((f) => f.type === 'attended' && inRange(f.created_at) && Date.now() - new Date(f.created_at).getTime() > DAY)
    const reached = att.filter((f) => f.status !== 'pending' && new Date(f.updated_at) - new Date(f.created_at) <= 7 * DAY).length
    const byId = new Map(contacts.map((c) => [c.id, c]))
    const noshowCalls = outcomes.filter((o) => inRange(o.created_at) && (() => { const c = byId.get(o.person_id); return c && c.steps_done >= 1 && c.steps_done <= 3 })())
    const cameBack = noshowCalls.filter((o) => { const c = byId.get(o.person_id); return c.last_seen && new Date(c.last_seen + 'T23:59:59') > new Date(o.created_at) }).length
    return {
      msg: { pct: pct(delivered, out.length), of: `${delivered} of ${out.length} sent` },
      reach: { pct: pct(reached, att.length), of: `${reached} of ${att.length} who attended` },
      back: { pct: pct(cameBack, noshowCalls.length), of: `${cameBack} of ${noshowCalls.length} called after missing` },
    }
  }, [sent, followups, outcomes, contacts, range]) // eslint-disable-line react-hooks/exhaustive-deps

  const focus = hover || active
  const focusRing = RINGS.find((r) => r.k === focus)

  // ---- bars ----
  const counts = useMemo(() => {
    const m = new Map()
    checkinDates.forEach((d) => m.set(d, (m.get(d) || 0) + 1))
    return m
  }, [checkinDates])
  const sundays = lastSundays(month ? 4 : 8)
  const journey = [0, 1, 2, 3, 4].map((n) => people.filter((p) => (p.source || 'next_steps') === 'next_steps' && Math.min(p.steps_done, 4) === n).length)
  const isJ = chart === 'journey'
  const series = isJ
    ? journey.map((v, i) => ({ k: ['New', '1', '2', '3', 'All 4'][i], v, title: i === 0 ? `${v} new, no steps yet` : i === 4 ? `${v} finished all four` : `${v} at step ${i}` }))
    : sundays.map((d) => ({ k: new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), v: counts.get(d) || 0, title: `${counts.get(d) || 0} on ${fmtDate(d)}` }))
  const max = Math.max(1, ...series.map((s) => s.v))
  const fi = bar === null || bar >= series.length ? series.length - 1 : bar

  // ---- stats and the to-do ----
  const lastSunday = sundays[sundays.length - 1]
  const inJourney = people.filter((p) => p.steps_done > 0).length
  const newThisMonth = people.filter((p) => p.steps_done > 0 && new Date(p.created_at).getTime() >= Date.now() - 30 * DAY).length
  const waiting = contacts.filter((c) => c.waiting)
  const replies = conversations.filter((c) => Number(c.unread) > 0 && c.last_in_at && Date.now() - new Date(c.last_in_at).getTime() < DAY).length
  const failed = contacts.filter((c) => c.reason === 'failed' && c.waiting).length
  const ready = contacts.filter((c) => c.steps_done === 4 && !c.member_since && c.completed_on && Date.now() - new Date(c.completed_on).getTime() >= 30 * DAY).length
  const stats = [
    { k: 'Next Steps', v: month ? sundays.reduce((a, d) => a + (counts.get(d) || 0), 0) : counts.get(lastSunday) || 0, d: month ? 'check-ins this month' : 'checked in on Sunday', go: 'session' },
    { k: 'In the journey', v: inJourney, d: `+${newThisMonth} in the last 30 days`, go: 'people' },
    { k: 'Follow Up', v: waiting.length, d: 'waiting on a call', go: 'fu-dash' },
    { k: 'Bible Study', v: bibleSessions.filter((s) => s.status === 'published').length, d: 'sessions written up', go: 'bible' },
  ]
  const todos = [
    { n: replies, label: replies === 1 ? 'reply to answer before the window closes' : 'replies to answer before the window closes', go: 'messaging' },
    { n: failed, label: failed === 1 ? 'message failed, needs a call' : 'messages failed, need a call', go: 'contacts' },
    { n: waiting.length, label: 'waiting on a call', go: 'fu-dash' },
    { n: ready, label: 'ready for a membership decision', go: 'membership' },
  ].filter((t) => t.n > 0)
  const left = todos.filter((t) => !done[t.label]).length

  return (
    <div className="flex flex-col gap-[clamp(20px,3vw,32px)]">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="font-mono text-[11px] tracking-[.14em] uppercase text-muted-label">{dateLine}</div>
          <h1 className="mt-1.5 text-[clamp(28px,4vw,40px)] font-black tracking-[-.035em] leading-[1.05] text-ink-deep">{greeting}, {first}.</h1>
        </div>
        <div role="group" aria-label="Time range" className="flex gap-1 p-1 bg-cream-deep rounded-full">
          <Pill on={!month} onClick={() => { setRange('week'); setBar(null) }}>This week</Pill>
          <Pill on={month} onClick={() => { setRange('month'); setBar(null) }}>This month</Pill>
        </div>
      </header>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr))]">
        {stats.map((s) => (
          <button key={s.k} type="button" onClick={() => onNavigate(s.go)} className="text-left bg-white rounded-[22px] py-4.5 px-5 flex flex-col gap-0.5 shadow-[0_2px_6px_rgba(69,75,89,.06)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-card">
            <span className="font-mono text-[10px] tracking-[.12em] uppercase text-muted-label">{s.k}</span>
            <span className="text-[30px] font-black tracking-[-.03em] leading-[1.1] text-ink-deep">{s.v}</span>
            <span className="text-[12.5px] text-muted-sub">{s.d}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-[clamp(16px,2.5vw,28px)] [grid-template-columns:repeat(auto-fit,minmax(min(460px,100%),1fr))] items-stretch">
        <section className="bg-white rounded-[28px] p-[clamp(20px,3vw,36px)] flex flex-col items-center gap-6" aria-label="How the week is going">
          <svg viewBox="0 0 300 300" className="w-full max-w-75 block" role="img" aria-label={RINGS.map((r) => `${r.label}: ${ringData[r.k].pct ?? 'no data'}${ringData[r.k].pct === null ? '' : ' percent'}`).join('. ')}>
            {RINGS.map((r) => {
              const C = 2 * Math.PI * r.r
              const p = ringData[r.k].pct ?? 0
              const on = focus === r.k, dim = focus && !on
              return (
                <g key={r.k}>
                  <circle cx="150" cy="150" r={r.r} fill="none" stroke="#EFEBE2" strokeWidth="22" />
                  {/* A round cap on a zero-length arc still draws a dot, so an empty ring draws nothing. */}
                  {p > 0 && <circle cx="150" cy="150" r={r.r} fill="none" stroke={r.color} strokeWidth={on ? 26 : 22} strokeLinecap="round"
                    strokeDasharray={`${(C * p) / 100} ${C}`} opacity={dim ? 0.3 : 1} transform="rotate(-90 150 150)"
                    className="cursor-pointer transition-[stroke-dasharray,opacity,stroke-width] duration-500"
                    onMouseEnter={() => setHover(r.k)} onMouseLeave={() => setHover(null)} onClick={() => setActive(active === r.k ? null : r.k)}>
                    <title>{r.label}: {ringData[r.k].pct ?? '—'}%</title>
                  </circle>}
                </g>
              )
            })}
            <text x="150" y="152" textAnchor="middle" fontFamily="Archivo, sans-serif" fontSize="44" fontWeight="900" fill="#313743" letterSpacing="-2">
              {focusRing ? (ringData[focus].pct === null ? '—' : ringData[focus].pct + '%') : '3'}
            </text>
            <text x="150" y="176" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="10" fontWeight="600" fill="#8A90A0" letterSpacing="1">
              {focusRing ? focusRing.label.toUpperCase() : 'TAP A RING'}
            </text>
          </svg>
          <div className="w-full flex flex-col gap-2">
            {RINGS.map((r) => {
              const on = focus === r.k, dim = focus && !on
              return (
                <button key={r.k} type="button" aria-pressed={active === r.k}
                  onMouseEnter={() => setHover(r.k)} onMouseLeave={() => setHover(null)} onClick={() => setActive(active === r.k ? null : r.k)}
                  className={`flex items-center gap-3 w-full py-3 px-3.5 rounded-2xl text-left transition-[background,opacity] ${on ? 'bg-cream' : 'bg-transparent'} ${dim ? 'opacity-50' : ''}`}>
                  <span className="w-3.5 h-3.5 rounded-full flex-none" style={{ background: r.color }} />
                  <span className="flex-1"><span className="block text-sm font-extrabold text-ink-deep">{r.label}</span><span className="block text-xs text-muted-sub">{ringData[r.k].of}</span></span>
                  <span className="text-xl font-black tracking-[-.02em] text-ink-deep">{ringData[r.k].pct === null ? '—' : ringData[r.k].pct + '%'}</span>
                </button>
              )
            })}
          </div>
        </section>

        <div className="grid gap-[clamp(16px,2.5vw,28px)] content-start">
          <section className="bg-white rounded-[28px] p-[clamp(20px,2.5vw,28px)] flex flex-col gap-3.5">
            <div className="flex justify-between items-center gap-2.5 flex-wrap">
              <div role="tablist" aria-label="Chart" className="flex gap-1 p-1 bg-cream rounded-full">
                {[['checkins', 'Check-ins'], ['journey', 'Journey']].map(([k, l]) => (
                  <button key={k} type="button" role="tab" aria-selected={chart === k} onClick={() => { setChart(k); setBar(null) }}
                    className={`min-h-8.5 px-3.5 rounded-full font-bold text-[12.5px] ${chart === k ? 'bg-white text-ink-deep' : 'text-muted-sub'}`}>{l}</button>
                ))}
              </div>
              <span className="text-xl font-black tracking-[-.02em] text-ink-deep">{series[fi]?.title}</span>
            </div>
            <div className="flex items-end gap-[clamp(6px,1.2vw,12px)] h-37.5">
              {series.map((s, i) => (
                <button key={s.k + i} type="button" aria-label={s.title} onMouseEnter={() => setBar(i)} onMouseLeave={() => setBar(null)} onClick={() => setBar(i)}
                  className="flex-1 h-full p-0 flex items-end cursor-pointer">
                  <span className="block w-full rounded-full transition-[height,opacity] duration-400"
                    style={{ height: `${Math.max(4, Math.round((s.v / max) * 100))}%`, background: isJ ? RAMP[i] : 'var(--color-orange)', opacity: i === fi ? 1 : isJ ? 0.55 : 0.3 }} />
                </button>
              ))}
            </div>
            <div className="flex gap-[clamp(6px,1.2vw,12px)]">
              {series.map((s, i) => <span key={s.k + i} className={`flex-1 text-center font-mono text-[10px] font-semibold ${i === fi ? 'text-ink-deep' : 'text-muted-faint'}`}>{s.k}</span>)}
            </div>
          </section>

          <section className="bg-ink-deep text-white rounded-[28px] p-[clamp(20px,2.5vw,28px)] flex flex-col gap-2.5">
            <div className="flex justify-between items-baseline"><h2 className="text-[17px] font-extrabold">Needs you</h2><span className="text-xs text-nav-idle">{todos.length ? (left ? `${left} left` : 'All clear') : ''}</span></div>
            {todos.map((t) => {
              const d = !!done[t.label]
              return (
                <div key={t.label} className={`flex items-center gap-3 min-h-13 py-2 pl-3.5 pr-2 rounded-2xl transition-opacity ${d ? 'bg-white/4 opacity-45' : 'bg-white/9'}`}>
                  <button type="button" onClick={() => onNavigate(t.go)} className="flex-1 flex items-center gap-3 text-left">
                    <span className="text-2xl font-black min-w-10">{t.n}</span>
                    <span className="flex-1 text-sm font-bold">{t.label}</span>
                  </button>
                  <button type="button" aria-label={d ? 'Mark as not handled' : 'Mark as handled'} aria-pressed={d} onClick={() => setDone((x) => ({ ...x, [t.label]: !d }))}
                    className="w-11 h-11 grid place-items-center flex-none">
                    <span className={`w-5.5 h-5.5 rounded-full ${d ? 'bg-green shadow-[inset_0_0_0_6px_var(--color-ink-deep)]' : 'shadow-[inset_0_0_0_2px_rgba(255,255,255,.35)]'}`} />
                  </button>
                </div>
              )
            })}
            {!todos.length && <div className="text-sm text-nav-idle py-2">Nothing waiting. Well done.</div>}
          </section>
        </div>
      </div>
    </div>
  )
}
