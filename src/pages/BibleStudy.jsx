import { useEffect, useRef, useState } from 'react'
import PageHead, { Breadcrumb, CrumbLink } from '../components/PageHead.jsx'
import Card from '../components/Card.jsx'
import Badge from '../components/Badge.jsx'
import BtnSm from '../components/BtnSm.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { useMe } from '../context/MeContext.jsx'
import { fmtDate } from '../lib/format.js'
import { toSeconds, youtubeId, youtubeThumb } from '../hooks/useBibleStudy.js'

const card = 'text-left p-0 border border-line rounded-[18px] bg-white overflow-hidden flex flex-col shadow-card transition-transform hover:-translate-y-0.5'
const thumbOf = (s) => s.thumbnail_url || youtubeThumb(s.youtube_url)
const bible = (passage) => `https://www.biblegateway.com/passage/?search=${encodeURIComponent((passage || '').replace(/–/g, '-'))}&version=NKJV`

const COVERS = ['bg-cover-navy', 'bg-cover-rust', 'bg-cover-teal']

// With no image, a series card gets the canvas's cover art drawn in place: sun,
// two hills and the title, the same for every series bar the colour.
function Thumb({ src, title, sub, dur, cover = 0 }) {
  const art = !src && title
  return (
    <div className={`relative aspect-video overflow-hidden ${art ? COVERS[cover % COVERS.length] : 'bg-ink'}`}>
      {src && <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />}
      {art && (
        <>
          <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full" aria-hidden="true">
            <circle cx="250" cy="62" r="30" className="fill-cover-sun" />
            <path d="M0 140 L60 105 L110 128 L175 88 L240 122 L320 96 V180 H0 Z" fill="black" opacity=".18" />
            <path d="M0 162 L70 132 L135 152 L210 120 L275 146 L320 134 V180 H0 Z" fill="black" opacity=".28" />
          </svg>
          <div className="absolute left-4.5 top-6 right-28 flex flex-col gap-1 text-white">
            <span className="text-[22px] font-black tracking-[-.02em] leading-none uppercase">{title}</span>
            {sub && <span className="text-[11px] font-semibold">{sub}</span>}
          </div>
        </>
      )}
      {dur && <span className="absolute right-2.5 bottom-2.5 font-mono text-[10.5px] bg-ink-deep/85 text-white py-0.75 px-1.75 rounded-md">{dur}</span>}
    </div>
  )
}

// Bible Study: series grid, then a series' sessions, then one session in
// the hero-and-tabs layout (Overview, Key teaching points, Resources,
// Questions), with Previous / Next through the series. The video plays in
// the hero itself; timestamps in Key teaching points jump the same player.
export default function BibleStudy({ series, sessions, loaded, active, onNavigate, onEdit }) {
  const me = useMe()
  const isDirector = me?.role === 'director'
  const [seriesId, setSeriesId] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [tab, setTab] = useState('overview')
  // { t: start second, n: bump so the same timestamp twice still re-seeks }
  const [player, setPlayer] = useState(null)
  const playerRef = useRef(null)

  // Panes never unmount, so leaving Bible Study (or the session) has to stop
  // the player itself, or the teaching keeps playing behind another page.
  useEffect(() => { setPlayer(null) }, [sessionId, active])

  const play = (t) => {
    setPlayer((p) => ({ t, n: (p?.n || 0) + 1 }))
    playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const cur = series.find((s) => s.id === seriesId)
  const inSeries = sessions.filter((v) => v.series_id === seriesId)
  const idx = inSeries.findIndex((v) => v.id === sessionId)
  const v = idx >= 0 ? inSeries[idx] : null

  const openSession = (id) => { setSessionId(id); setTab('overview'); window.scrollTo({ top: 0 }) }

  if (v && cur) {
    const url = v.youtube_url
    const vid = youtubeId(url)
    const short = (x) => (x ? x.title.split(':')[0] : '')
    return (
      <div className="flex flex-col gap-5.5">
        <Breadcrumb>
          <CrumbLink onClick={() => { setSeriesId(null); setSessionId(null) }}>Bible Study</CrumbLink> / <CrumbLink onClick={() => setSessionId(null)}>{cur.short_title || cur.title}</CrumbLink> / Session {v.number ?? ''}
        </Breadcrumb>
        <section className="grid [grid-template-columns:repeat(auto-fit,minmax(min(380px,100%),1fr))] bg-ink-deep rounded-[22px] overflow-hidden text-white">
          <div className="p-9 max-mobile:p-6 flex flex-col gap-3 justify-center">
            <span className="font-mono text-[10.5px] tracking-[.14em] uppercase text-nav-idle">Session {v.number ?? ''} of {inSeries.length}{v.passage ? ` · ${v.passage}` : ''}</span>
            <h1 className="text-[clamp(24px,3.2vw,32px)] font-black tracking-[-.03em] leading-[1.08]">{v.title}</h1>
            <p className="text-sm text-nav-idle">{[v.taught_on && fmtDate(v.taught_on), v.duration, v.teacher && `Taught by ${v.teacher}`].filter(Boolean).join(' · ')}</p>
            <div className="flex gap-2 flex-wrap mt-2">
              {vid && <button type="button" onClick={() => (player ? playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : play(0))} className="inline-flex items-center gap-2 min-h-11 px-4.5 rounded-xl bg-orange text-white font-extrabold text-sm">▶ Watch the session</button>}
              {v.passage && <a href={bible(v.passage)} target="_blank" rel="noopener" className="inline-flex items-center min-h-11 px-4.5 rounded-xl border-[1.5px] border-white/25 text-white no-underline font-bold text-sm">Read {v.passage}</a>}
              {isDirector && <button type="button" onClick={() => onEdit(v)} className="inline-flex items-center min-h-11 px-4.5 rounded-xl border-[1.5px] border-white/25 text-white font-bold text-sm">Edit</button>}
            </div>
          </div>
          <div ref={playerRef} className="relative min-h-65 bg-ink">
            {vid && player
              ? <iframe key={player.n} src={`https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&rel=0&modestbranding=1&start=${player.t}`} title={v.title}
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen className="absolute inset-0 w-full h-full border-0" />
              : (
                <button type="button" disabled={!vid} onClick={() => play(0)} aria-label="Play this session" className="absolute inset-0 w-full h-full p-0">
                  {thumbOf(v) && <img src={thumbOf(v)} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                  {vid && <span className="absolute left-1/2 top-1/2 w-16 h-16 -ml-8 -mt-8 rounded-full bg-orange grid place-items-center text-white text-xl">▶</span>}
                </button>
              )}
          </div>
        </section>

        <div role="tablist" aria-label="Session content" className="flex gap-0.5 border-b-2 border-line overflow-x-auto">
          {[['overview', 'Overview'], ['points', 'Key teaching points'], ['resources', 'Resources'], ['questions', 'Questions']].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`min-h-11.5 px-4 -mb-0.5 font-bold text-[13.5px] whitespace-nowrap border-b-3 ${tab === k ? 'text-ink-deep border-orange' : 'text-muted-sub border-transparent'}`}>{l}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid gap-4.5 [grid-template-columns:repeat(auto-fit,minmax(min(380px,100%),1fr))] items-start">
            <Card>
              <h2 className="text-[15.5px] font-extrabold text-ink-deep mb-3">Summary</h2>
              <p className="text-[15px] leading-relaxed">{v.summary || 'Notes for this session have not been added yet.'}</p>
              {v.scriptures && <div className="mt-3 pt-3 border-t border-[#ECE7DA]"><div className="font-mono text-[9.5px] tracking-[.12em] uppercase text-muted-label font-semibold">Key scriptures</div><div className="text-[13.5px] leading-normal mt-1">{v.scriptures}</div></div>}
            </Card>
            {(v.glance || []).length > 0 && (
              <Card>
                <h2 className="text-[15.5px] font-extrabold text-ink-deep mb-3">At a glance</h2>
                <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-2.5">
                  {v.glance.map((g, i) => <div key={i} className="contents"><dt className="font-mono text-[10px] tracking-widest uppercase text-muted-label font-semibold pt-0.75">{g.k}</dt><dd className="text-[13.5px] leading-normal">{g.v}</dd></div>)}
                </dl>
              </Card>
            )}
          </div>
        )}
        {tab === 'points' && (
          <Card>
            {(v.points || []).length ? (
              <ol className="flex flex-col">
                {v.points.map((p, i) => (
                  <li key={i} className="flex gap-3.5 items-start py-3 border-b border-[#ECE7DA] last:border-b-0">
                    {p.t ? <button type="button" disabled={!vid} onClick={() => play(toSeconds(p.t))} aria-label={`Play from ${p.t}`} className="flex-none min-w-16 min-h-9 grid place-items-center font-mono text-xs font-semibold bg-orange-soft text-orange-deep rounded-lg">{p.t}</button> : <span className="min-w-16" />}
                    <span className="text-sm leading-relaxed"><strong className="text-ink-deep">{p.head}</strong> {p.text}</span>
                  </li>
                ))}
              </ol>
            ) : <EmptyState>Key teaching points for this session have not been added yet.</EmptyState>}
          </Card>
        )}
        {tab === 'resources' && (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]">
            {v.passage && (
              <Card className="flex flex-col gap-2"><span><Badge variant="navy">Link</Badge></span><span className="text-[15px] font-extrabold text-ink-deep">Read {v.passage}</span><span className="text-xs text-muted-sub">NKJV on Bible Gateway</span><a href={bible(v.passage)} target="_blank" rel="noopener" className="mt-auto inline-flex items-center justify-center min-h-10.5 rounded-[10px] border-[1.5px] border-line font-bold text-[13px] no-underline text-ink">Open</a></Card>
            )}
            {(v.resources || []).map((r, i) => (
              <Card key={i} className="flex flex-col gap-2">
                <span><Badge variant={r.kind === 'Link' ? 'navy' : 'orange'}>{r.kind || 'File'}</Badge></span>
                <span className="text-[15px] font-extrabold text-ink-deep">{r.name}</span>
                {r.url
                  ? <a href={r.url} target="_blank" rel="noopener" download={r.download ? '' : undefined} className="mt-auto inline-flex items-center justify-center min-h-10.5 rounded-[10px] bg-orange text-white font-bold text-[13px] no-underline">{r.kind === 'Link' ? 'Open' : r.download ? 'Download' : 'View'}</a>
                  : <span className="mt-auto text-xs text-muted-label">Coming soon</span>}
              </Card>
            ))}
            {!v.passage && !(v.resources || []).length && <Card><EmptyState>No resources yet.</EmptyState></Card>}
          </div>
        )}
        {tab === 'questions' && (
          <Card>
            <h2 className="text-[15.5px] font-extrabold text-ink-deep">Questions for study</h2>
            <p className="text-[12.5px] text-muted-label mb-2">For house church leaders and small groups.</p>
            {(v.questions || []).length ? (
              <ol className="flex flex-col">
                {v.questions.map((q, i) => (
                  <li key={i} className="flex gap-3.5 items-start py-3 border-b border-[#ECE7DA] last:border-b-0">
                    <span className="flex-none w-7 h-7 rounded-full bg-ink-deep text-white grid place-items-center font-mono text-[11.5px] font-semibold mt-0.5">{i + 1}</span>
                    <span className="text-[15px] leading-relaxed pt-0.5">{q}</span>
                  </li>
                ))}
              </ol>
            ) : <EmptyState>Study questions for this session have not been added yet.</EmptyState>}
          </Card>
        )}

        <div className="flex justify-between gap-3 flex-wrap">
          <BtnSm variant="outline" disabled={idx <= 0} onClick={() => openSession(inSeries[idx - 1].id)}>{idx > 0 ? `Previous: ${short(inSeries[idx - 1])}` : 'Previous'}</BtnSm>
          <BtnSm disabled={idx >= inSeries.length - 1} onClick={() => openSession(inSeries[idx + 1].id)}>{idx < inSeries.length - 1 ? `Next: ${short(inSeries[idx + 1])}` : 'Next'}</BtnSm>
        </div>
      </div>
    )
  }

  if (cur) {
    return (
      <>
        <PageHead
          crumb={<Breadcrumb><CrumbLink onClick={() => setSeriesId(null)}>Bible Study</CrumbLink> / {cur.short_title || cur.title}</Breadcrumb>}
          title={cur.title}
          sub={cur.intro || cur.description}
        />
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
          {inSeries.map((s) => (
            <button key={s.id} type="button" onClick={() => openSession(s.id)} className={card}>
              <Thumb src={thumbOf(s)} dur={s.duration} />
              <div className="py-3.5 px-4 flex flex-col gap-1">
                <span className="font-mono text-[10px] tracking-widest uppercase text-muted-label font-semibold flex gap-2 items-center">Session {s.number ?? ''}{s.status === 'draft' && <Badge variant="grey">Draft</Badge>}</span>
                <span className="text-[14.5px] font-extrabold tracking-[-.015em] text-ink-deep leading-tight">{s.title}</span>
                <span className="text-xs text-muted-sub">{[s.passage, s.taught_on && fmtDate(s.taught_on)].filter(Boolean).join(' · ')}</span>
              </div>
            </button>
          ))}
        </div>
        {!inSeries.length && <Card><EmptyState>No sessions in this series yet.</EmptyState></Card>}
      </>
    )
  }

  return (
    <>
      <PageHead
        crumb={<Breadcrumb>Bible Study</Breadcrumb>}
        title="Bible Study"
        sub="Tuesday teaching, written up so anyone can catch up or lead a discussion from it."
        right={isDirector && <BtnSm onClick={() => onNavigate('bible-upload')}>Upload</BtnSm>}
      />
      <div className="grid gap-4.5 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
        {series.map((s, i) => {
          const n = sessions.filter((v) => v.series_id === s.id).length
          const firstThumb = thumbOf(sessions.find((v) => v.series_id === s.id) || {})
          return (
            <button key={s.id} type="button" onClick={() => { setSeriesId(s.id); setSessionId(null) }} className={card}>
              <Thumb src={s.thumbnail_url || firstThumb} title={s.short_title || s.title} cover={i} />
              <div className="py-4 px-4.5 flex flex-col gap-1.5">
                <span className="font-mono text-[10px] tracking-widest uppercase text-muted-label font-semibold">{n ? `${n} ${n === 1 ? 'session' : 'sessions'}` : 'No sessions yet'}{s.planned_sessions ? ` of ${s.planned_sessions}` : ''}{s.starts_on ? ` · from ${fmtDate(s.starts_on)}` : ''}</span>
                <span className="text-[17px] font-extrabold tracking-[-.02em] text-ink-deep leading-tight">{s.title}</span>
                {s.description && <span className="text-[13px] text-muted-body leading-normal">{s.description}</span>}
              </div>
            </button>
          )
        })}
      </div>
      {loaded && !series.length && <Card><EmptyState>No series yet.{isDirector ? ' Start one from Upload.' : ''}</EmptyState></Card>}
    </>
  )
}
