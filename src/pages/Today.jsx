import { useMemo } from 'react'
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import PageHead from '../components/PageHead.jsx'
import StatTile from '../components/StatTile.jsx'
import Card, { CardHead } from '../components/Card.jsx'
import Badge from '../components/Badge.jsx'
import Avatar from '../components/Avatar.jsx'
import EmptyState from '../components/EmptyState.jsx'
import LiveDot from '../components/LiveDot.jsx'
import ChartTooltip from '../components/ChartTooltip.jsx'
import { fmtTime, todayStr } from '../lib/format.js'
import { stepOf } from '../config/site.js'

const PIPE_LABELS = ['New', '1 done', '2 done', '3 done', 'All 4']
const PIPE_COLOR_VARS = ['--color-pipeline-1', '--color-pipeline-2', '--color-pipeline-3', '--color-pipeline-4', '--color-pipeline-5']

export default function Today({ people, openSession, todaysCheckins }) {
  const greeting = useMemo(() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning.' : h < 17 ? 'Good afternoon.' : 'Good evening.'
  }, [])

  const dateSub = useMemo(() => {
    const base = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    return openSession ? `${base} · Step ${openSession.step} is running — ${stepOf(openSession.step).title}` : base
  }, [openSession])

  const today = todayStr()
  const totalCount = people.length
  const todayCount = todaysCheckins.length
  const firstTimerCount = todaysCheckins.filter((c) => c.people?.created_at?.slice(0, 10) === today).length
  const hcCount = people.filter((p) => p.hc_eligible && p.hc_interest && !p.member_since).length
  const memCount = people.filter((p) => p.milestone === 'membership_window' || p.milestone === 'membership_ready').length

  const counts = [0, 0, 0, 0, 0]
  people.forEach((p) => { counts[Math.min(p.steps_done, 4)]++ })
  const completionPct = people.length ? Math.round((counts[4] / people.length) * 100) : 0

  // Read the validated ordinal ramp from theme.css after mount (not at
  // module scope) so the stylesheet is guaranteed applied first.
  const pipeColors = useMemo(
    () => PIPE_COLOR_VARS.map((v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim()),
    [],
  )
  const pipeData = PIPE_LABELS.map((label, i) => ({
    label,
    count: counts[i],
    pct: totalCount ? Math.round((counts[i] / totalCount) * 100) : 0,
  }))

  return (
    <>
      <PageHead title={greeting} sub={dateSub} />
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))] max-tablet:grid-cols-2 mb-5.5">
        <StatTile label="Total in the journey" value={totalCount} detail="Everyone tracked, all-time" />
        <StatTile label="Checked in today" value={todayCount} detail="Live via QR code" />
        <StatTile label="First-timers today" value={firstTimerCount} detail="From the connection form" />
        <StatTile label="House church eligible" value={hcCount} detail="All 4 steps done · interested" />
        <StatTile label="Membership pipeline" value={memCount} detail="Completed all 4 steps" />
      </div>
      <div className="grid grid-cols-2 gap-4.5 max-tablet:grid-cols-1">
        <Card className="mb-0">
          <CardHead title="The journey pipeline" sub="People by number of steps completed" />
          <div className="h-42 mt-6.5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipeData} margin={{ top: 24, right: 4, left: 4, bottom: 0 }} barCategoryGap="18%">
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.06em', fill: 'var(--color-muted-label)', fontWeight: 600 }}
                  dy={6}
                />
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => (
                    <ChartTooltip active={active} payload={payload} render={(d) => (
                      <>
                        <div className="font-mono text-[9px] tracking-[.06em] uppercase text-muted-label font-semibold">{d.label}</div>
                        <div className="font-black text-ink-deep mt-0.5">{d.count} {d.count === 1 ? 'person' : 'people'} <span className="font-semibold text-muted-label">· {d.pct}%</span></div>
                      </>
                    )} />
                  )}
                />
                <Bar dataKey="count" radius={[22, 22, 4, 4]} maxBarSize={44} minPointSize={4}>
                  {pipeData.map((d, i) => (
                    <Cell key={d.label} fill={pipeColors[i]} />
                  ))}
                  <LabelList dataKey="count" position="top" offset={8} style={{ fontWeight: 900, fontSize: 13, fill: 'var(--color-ink-deep)' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-start justify-between gap-3 flex-wrap mt-5.5">
            <div className="font-mono text-[9px] tracking-[.1em] uppercase text-muted-label font-semibold">Completed the whole journey</div>
            <div className="font-black text-[15px] text-ink-deep">{completionPct}%</div>
          </div>
          <div className="h-3.5 rounded-full bg-cream-deep overflow-hidden mt-3.5">
            <div className="h-full bg-orange rounded-full transition-[width_.5s_cubic-bezier(.2,.8,.2,1)]" style={{ width: `${completionPct}%` }} />
          </div>
        </Card>
        <Card className="mb-0">
          <CardHead
            title={<span className="inline-flex items-center"><LiveDot />Live check-ins</span>}
            sub="Refreshes automatically"
            right={<Badge variant="navy">{todayCount} today</Badge>}
          />
          <div className="flex flex-col max-h-82.5 overflow-auto">
            {todaysCheckins.length ? todaysCheckins.map((c) => {
              const isNew = c.people?.created_at?.slice(0, 10) === today
              return (
                <div key={c.id} className="flex items-center gap-2.75 py-2.5 px-1.5 rounded-[10px] hover:bg-row-hover">
                  <Avatar name={c.people?.full_name} size={28} fontSize={10} />
                  <div>
                    <div className="font-bold text-[13px] text-ink-deep">{c.people?.full_name}</div>
                    <div className="text-[11px] text-muted-label">
                      {isNew ? `First-timer${c.people?.heard_about ? ' · ' + c.people.heard_about : ''}` : 'Returning'} · Step {c.step}
                    </div>
                  </div>
                  <div className="ml-auto font-mono text-[10px] text-muted-faint flex-none">{fmtTime(c.created_at)}</div>
                </div>
              )
            }) : <EmptyState>No check-ins yet today.</EmptyState>}
          </div>
        </Card>
      </div>
    </>
  )
}
