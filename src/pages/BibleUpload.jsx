import { useEffect, useState } from 'react'
import PageHead, { Breadcrumb } from '../components/PageHead.jsx'
import Card from '../components/Card.jsx'
import BtnSm from '../components/BtnSm.jsx'
import Field, { TextInput, Select, Textarea } from '../components/Field.jsx'
import { useAppToast } from '../context/ToastContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { youtubeId, youtubeThumb } from '../hooks/useBibleStudy.js'

const BUCKET = 'bible-study'
const sectionTitle = 'text-[15.5px] font-extrabold tracking-[-.015em] text-ink-deep'
const xBtn = 'w-10 h-10.5 flex-none rounded-[10px] border-[1.5px] border-line bg-white text-muted-sub grid place-items-center hover:border-orange'

async function upload(file, folder) {
  const path = `${folder}/${Date.now()}-${file.name.replace(/[^A-Za-z0-9._-]/g, '_')}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
  if (error) return { error: error.message || 'unknown error' }
  return { url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl }
}

// A resource with a file or link but no name still counts: name it after
// the file (or the link's site) rather than quietly dropping it on save.
const resourceName = (r) => {
  if (r.name.trim()) return r.name.trim()
  if (r.kind === 'Link') { try { return new URL(r.url).hostname.replace(/^www\./, '') } catch { return r.url } }
  return (r.url || '').split('/').pop().replace(/^\d+-/, '')
}

const blankSession = () => ({
  series_id: '', number: '', title: '', taught_on: '', passage: '', teacher: '', youtube_url: '', duration: '',
  summary: '', scriptures: '', thumbnail_url: '',
  points: [{ t: '', head: '', text: '' }, { t: '', head: '', text: '' }, { t: '', head: '', text: '' }],
  questions: ['', '', ''],
  glance: [],
  resources: [{ kind: 'PDF', name: '', url: '', download: true }],
})

function XIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
}

// Upload: a new session to a series, or a new series. Admin only (RLS
// enforces it; the nav hides it from everyone else). Also edits an existing
// session when one is passed in from the session page.
export default function BibleUpload({ series, editing, onDone, refresh }) {
  const toast = useAppToast()
  const [mode, setMode] = useState('session')
  const [s, setS] = useState(blankSession)
  const [sr, setSr] = useState({ title: '', short_title: '', description: '', intro: '', starts_on: '', planned_sessions: '', thumbnail_url: '' })
  const [busy, setBusy] = useState(false)
  const [unsaved, setUnsaved] = useState(false)

  useEffect(() => {
    if (editing) {
      setMode('session')
      setS({ ...blankSession(), ...editing, number: editing.number ?? '', points: editing.points?.length ? editing.points : blankSession().points, questions: editing.questions?.length ? editing.questions : [''], resources: editing.resources?.length ? editing.resources : [] })
    }
  }, [editing])
  useEffect(() => { if (!s.series_id && series[0]) setS((x) => ({ ...x, series_id: series[0].id })) }, [series, s.series_id])

  const set = (k) => (e) => setS((x) => ({ ...x, [k]: e.target.value }))
  const setList = (k, i, sub) => (e) => setS((x) => ({ ...x, [k]: x[k].map((it, j) => (j === i ? (sub ? { ...it, [sub]: sub === 'download' ? e.target.checked : e.target.value } : e.target.value) : it)) }))
  const add = (k, item) => () => setS((x) => ({ ...x, [k]: [...x[k], item] }))
  const remove = (k, i) => () => setS((x) => ({ ...x, [k]: x[k].filter((_, j) => j !== i) }))

  const onThumb = async (e) => {
    const f = e.target.files?.[0]; if (!f) return
    setBusy(true); const { url, error } = await upload(f, 'thumbnails'); setBusy(false)
    if (!url) { toast(`Couldn't upload that image: ${error}`); return }
    if (mode === 'session') setS((x) => ({ ...x, thumbnail_url: url })); else setSr((x) => ({ ...x, thumbnail_url: url }))
  }
  const onResourceFile = (i) => async (e) => {
    const f = e.target.files?.[0]; if (!f) return
    setBusy(true); const { url, error } = await upload(f, 'resources'); setBusy(false)
    if (!url) { toast(`Couldn't upload that file: ${error}`); return }
    setS((x) => ({ ...x, resources: x.resources.map((r, j) => (j === i ? { ...r, url, name: r.name || f.name } : r)) }))
    setUnsaved(true)
    toast('File uploaded. Save draft or Publish session to attach it to the session.')
  }

  // An uploaded file is only in storage until the session is saved; warn
  // before the page is closed or reloaded with it still unattached.
  useEffect(() => {
    if (!unsaved) return
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [unsaved])

  const saveSession = async (status) => {
    if (!s.series_id) { toast('Pick a series first, or create one.'); return }
    if (!s.title.trim()) { toast('Give the session a title.'); return }
    if (s.youtube_url && !youtubeId(s.youtube_url)) { toast("That doesn't look like a YouTube link."); return }
    const row = {
      series_id: s.series_id, number: s.number === '' ? null : Number(s.number), title: s.title.trim(), taught_on: s.taught_on || null,
      passage: s.passage.trim() || null, teacher: s.teacher.trim() || null, youtube_url: s.youtube_url.trim() || null, duration: s.duration.trim() || null,
      summary: s.summary.trim() || null, scriptures: s.scriptures.trim() || null, thumbnail_url: s.thumbnail_url || null,
      points: s.points.filter((p) => p.head.trim() || p.text.trim()),
      questions: s.questions.map((q) => q.trim()).filter(Boolean),
      glance: (s.glance || []).filter((g) => g.k && g.v),
      resources: s.resources.filter((r) => r.name.trim() || r.url).map((r) => ({ ...r, name: resourceName(r) || 'Resource' })),
      status, updated_at: new Date().toISOString(),
    }
    setBusy(true)
    // .select() so a write the database quietly filtered out (no error, no
    // row) is reported instead of being shown as saved.
    const { data, error } = editing
      ? await supabase.from('bs_sessions').update(row).eq('id', editing.id).select('id')
      : await supabase.from('bs_sessions').insert(row).select('id')
    setBusy(false)
    if (error) { toast(`Couldn't save the session: ${error.message}`); return }
    if (!data?.length) { toast("Nothing was saved. Sign in with the admin account and try again."); return }
    setUnsaved(false)
    toast(status === 'published' ? 'Session published to its series.' : 'Draft saved. It stays hidden from leadership until you publish it.')
    refresh(); setS({ ...blankSession(), series_id: s.series_id }); onDone?.()
  }

  const saveSeries = async () => {
    if (!sr.title.trim()) { toast('Give the series a title.'); return }
    setBusy(true)
    const { data, error } = await supabase.from('bs_series').insert({
      title: sr.title.trim(), short_title: sr.short_title.trim() || null, description: sr.description.trim() || null, intro: sr.intro.trim() || null,
      starts_on: sr.starts_on || null, planned_sessions: sr.planned_sessions ? Number(sr.planned_sessions) : null, thumbnail_url: sr.thumbnail_url || null,
    }).select('id').single()
    setBusy(false)
    if (error) { toast("Couldn't create the series. Check your access."); return }
    toast('Series created. Add its sessions from the New session tab.')
    setSr({ title: '', short_title: '', description: '', intro: '', starts_on: '', planned_sessions: '', thumbnail_url: '' })
    await refresh(); setMode('session'); setS((x) => ({ ...x, series_id: data.id }))
  }

  const thumbPreview = mode === 'session' ? (s.thumbnail_url || youtubeThumb(s.youtube_url)) : sr.thumbnail_url

  return (
    <>
      <PageHead crumb={<Breadcrumb>Bible Study</Breadcrumb>} title={editing ? 'Edit session' : 'Upload'} sub={editing ? editing.title : 'Add a new Bible study session to a series, or start a new series.'} />
      {!editing && (
        <div role="tablist" aria-label="What to upload" className="flex gap-0.5 border-b-2 border-line mb-4.5">
          {[['session', 'New session'], ['series', 'New series']].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
              className={`min-h-11.5 px-4 -mb-0.5 font-bold text-[13.5px] border-b-3 ${mode === k ? 'text-ink-deep border-orange' : 'text-muted-sub border-transparent'}`}>{l}</button>
          ))}
        </div>
      )}

      {mode === 'session' && (
        <div className="grid gap-4.5 [grid-template-columns:repeat(auto-fit,minmax(min(380px,100%),1fr))] items-start">
          <div className="flex flex-col gap-4.5">
            <Card>
              <h2 className={sectionTitle}>Session details</h2>
              <Field label="Series" htmlFor="bu-series">
                <Select id="bu-series" value={s.series_id} onChange={set('series_id')}>
                  {!series.length && <option value="">Create a series first</option>}
                  {series.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
                </Select>
              </Field>
              <Field label="Session title" htmlFor="bu-title"><TextInput id="bu-title" value={s.title} onChange={set('title')} placeholder="e.g. Ephesus: The Church That Left Its First Love" /></Field>
              <div className="grid gap-x-3 grid-cols-2 max-mobile:grid-cols-1">
                <Field label="Session number" htmlFor="bu-num"><TextInput id="bu-num" type="number" min="0" value={s.number} onChange={set('number')} /></Field>
                <Field label="Date taught" htmlFor="bu-date"><TextInput id="bu-date" type="date" value={s.taught_on || ''} onChange={set('taught_on')} /></Field>
                <Field label="Bible passage" htmlFor="bu-pass"><TextInput id="bu-pass" value={s.passage || ''} onChange={set('passage')} placeholder="e.g. Revelation 4:1–11" /></Field>
                <Field label="Teacher" htmlFor="bu-teach"><TextInput id="bu-teach" value={s.teacher || ''} onChange={set('teacher')} placeholder="e.g. PDM" /></Field>
                <Field label="YouTube link" htmlFor="bu-yt"><TextInput id="bu-yt" type="url" value={s.youtube_url || ''} onChange={set('youtube_url')} placeholder="https://www.youtube.com/watch?v=…" /></Field>
                <Field label="Length" htmlFor="bu-dur"><TextInput id="bu-dur" value={s.duration || ''} onChange={set('duration')} placeholder="e.g. 2:04:49" /></Field>
              </div>
              <p className="text-[11.5px] text-muted-label mt-2">Unlisted is fine. The thumbnail comes from YouTube unless you choose your own.</p>
            </Card>

            <Card>
              <h2 className={sectionTitle}>Study notes</h2>
              <Field label="Summary" htmlFor="bu-sum"><Textarea id="bu-sum" rows={4} value={s.summary || ''} onChange={set('summary')} placeholder="Two or three sentences on the main message of the session." /></Field>
              <fieldset className="mt-4">
                <legend className="text-[12.5px] font-bold text-ink-deep mb-1.5">Key teaching points</legend>
                <div className="flex flex-col gap-2">
                  {s.points.map((p, i) => (
                    <div key={i} className="grid grid-cols-[84px_minmax(0,1fr)_minmax(0,1.6fr)_40px] max-mobile:grid-cols-[84px_minmax(0,1fr)_40px] gap-2 items-center">
                      <TextInput aria-label={`Timestamp for point ${i + 1}`} value={p.t} onChange={setList('points', i, 't')} placeholder="mm:ss" className="py-2.5! font-mono text-[12.5px]" />
                      <TextInput aria-label={`Heading for point ${i + 1}`} value={p.head} onChange={setList('points', i, 'head')} placeholder="Short heading" className="py-2.5! text-sm" />
                      <TextInput aria-label={`Detail for point ${i + 1}`} value={p.text} onChange={setList('points', i, 'text')} placeholder="One sentence of detail" className="py-2.5! text-sm max-mobile:col-span-2 max-mobile:order-last" />
                      <button type="button" aria-label={`Remove point ${i + 1}`} onClick={remove('points', i)} className={xBtn}><XIcon /></button>
                    </div>
                  ))}
                </div>
                <BtnSm variant="outline" className="mt-2" onClick={add('points', { t: '', head: '', text: '' })}>Add a teaching point</BtnSm>
              </fieldset>
              <fieldset className="mt-4">
                <legend className="text-[12.5px] font-bold text-ink-deep mb-1.5">Questions for study</legend>
                <div className="flex flex-col gap-2">
                  {s.questions.map((q, i) => (
                    <div key={i} className="grid grid-cols-[minmax(0,1fr)_40px] gap-2 items-center">
                      <TextInput aria-label={`Question ${i + 1}`} value={q} onChange={setList('questions', i)} placeholder={`Question ${i + 1}`} className="py-2.5! text-sm" />
                      <button type="button" aria-label={`Remove question ${i + 1}`} onClick={remove('questions', i)} className={xBtn}><XIcon /></button>
                    </div>
                  ))}
                </div>
                <BtnSm variant="outline" className="mt-2" onClick={add('questions', '')}>Add a question</BtnSm>
              </fieldset>
              <Field label="Key scriptures" htmlFor="bu-scr"><TextInput id="bu-scr" value={s.scriptures || ''} onChange={set('scriptures')} placeholder="e.g. Revelation 4:1–11; Isaiah 6:1–8" /></Field>
            </Card>
          </div>

          <div className="flex flex-col gap-4.5">
            <Card>
              <h2 className={sectionTitle}>Thumbnail</h2>
              <label className="mt-3 relative flex flex-col items-center justify-center gap-1 min-h-37.5 border-[1.5px] border-dashed border-line rounded-xl bg-row-hover cursor-pointer text-center p-4 overflow-hidden">
                {thumbPreview && <img src={thumbPreview} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />}
                <span className="relative font-extrabold text-sm bg-white/90 rounded-lg px-2 py-0.5">{busy ? 'Uploading…' : thumbPreview ? 'Choose a different image' : 'Choose an image'}</span>
                <span className="relative text-xs text-muted-label bg-white/90 rounded-lg px-2">16:9, at least 1280 × 720</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onThumb} />
              </label>
            </Card>
            <Card>
              <h2 className={sectionTitle}>Additional resources</h2>
              <div className="flex flex-col gap-3 mt-3">
                {s.resources.map((r, i) => (
                  <div key={i} className="flex flex-col gap-2 p-3 border border-[#ECE7DA] rounded-xl">
                    <div className="grid grid-cols-[110px_minmax(0,1fr)_40px] gap-2 items-center">
                      <Select aria-label={`Type of resource ${i + 1}`} value={r.kind} onChange={setList('resources', i, 'kind')} className="py-2.5! text-sm"><option>PDF</option><option>PPTX</option><option>Link</option><option>Other file</option></Select>
                      <TextInput aria-label={`Name of resource ${i + 1}`} value={r.name} onChange={setList('resources', i, 'name')} placeholder="e.g. Session study notes" className="py-2.5! text-sm" />
                      <button type="button" aria-label={`Remove resource ${i + 1}`} onClick={remove('resources', i)} className={xBtn}><XIcon /></button>
                    </div>
                    {r.kind === 'Link'
                      ? <TextInput aria-label={`Link for resource ${i + 1}`} value={r.url} onChange={setList('resources', i, 'url')} placeholder="Paste a link" className="py-2.5! text-sm" />
                      : <label className="flex items-center gap-2 text-[12.5px] text-muted-body cursor-pointer"><span className="py-2 px-3 rounded-[10px] border-[1.5px] border-line bg-white font-bold text-ink">{r.url ? 'Replace file' : 'Choose a file'}</span><span className="truncate">{r.url ? r.url.split('/').pop() : 'Nothing chosen'}</span><input type="file" className="sr-only" onChange={onResourceFile(i)} /></label>}
                    {r.kind !== 'Link' && <label className="flex items-center gap-2 text-[12.5px] text-muted-body"><input type="checkbox" checked={!!r.download} onChange={setList('resources', i, 'download')} className="w-4 h-4 accent-orange" />Allow people to download this</label>}
                  </div>
                ))}
              </div>
              <BtnSm variant="outline" className="mt-3" onClick={add('resources', { kind: 'PDF', name: '', url: '', download: true })}>Add a resource</BtnSm>
            </Card>
            <section className="bg-ink-deep text-white rounded-[14px] p-5.5 flex flex-col gap-3">
              <span className="font-mono text-[10px] tracking-[.14em] uppercase text-nav-idle">Ready to go?</span>
              <p className="text-[13.5px] leading-normal text-[#D9D5CF]">Save a draft to finish later, or publish to add the session to its series straight away.</p>
              <div className="flex gap-2 flex-wrap">
                <button type="button" disabled={busy} onClick={() => saveSession('draft')} className="flex-1 min-h-11.5 rounded-xl border-[1.5px] border-white/25 font-bold text-sm">Save draft</button>
                <button type="button" disabled={busy} onClick={() => saveSession('published')} className="flex-1 min-h-11.5 rounded-xl bg-orange font-extrabold text-sm">Publish session</button>
              </div>
              {editing && <button type="button" onClick={onDone} className="text-xs text-nav-idle underline self-start">Cancel editing</button>}
            </section>
          </div>
        </div>
      )}

      {mode === 'series' && (
        <div className="grid gap-4.5 [grid-template-columns:repeat(auto-fit,minmax(min(380px,100%),1fr))] items-start">
          <Card>
            <h2 className={sectionTitle}>Series details</h2>
            <Field label="Series title" htmlFor="sr-title"><TextInput id="sr-title" value={sr.title} onChange={(e) => setSr({ ...sr, title: e.target.value })} placeholder="e.g. The Seven Churches of Revelation" /></Field>
            <Field label="Short name" htmlFor="sr-short"><TextInput id="sr-short" value={sr.short_title} onChange={(e) => setSr({ ...sr, short_title: e.target.value })} placeholder="e.g. The Seven Churches" /></Field>
            <Field label="Short description" htmlFor="sr-desc"><Textarea id="sr-desc" rows={3} value={sr.description} onChange={(e) => setSr({ ...sr, description: e.target.value })} placeholder="One or two sentences shown on the series card." /></Field>
            <div className="grid gap-x-3 grid-cols-2 max-mobile:grid-cols-1">
              <Field label="Start date" htmlFor="sr-start"><TextInput id="sr-start" type="date" value={sr.starts_on} onChange={(e) => setSr({ ...sr, starts_on: e.target.value })} /></Field>
              <Field label="Planned sessions" htmlFor="sr-n"><TextInput id="sr-n" type="number" min="1" value={sr.planned_sessions} onChange={(e) => setSr({ ...sr, planned_sessions: e.target.value })} /></Field>
            </div>
            <Field label="Series introduction" htmlFor="sr-intro"><Textarea id="sr-intro" rows={4} value={sr.intro} onChange={(e) => setSr({ ...sr, intro: e.target.value })} placeholder="Shown at the top of the series page." /></Field>
          </Card>
          <div className="flex flex-col gap-4.5">
            <Card>
              <h2 className={sectionTitle}>Series thumbnail</h2>
              <label className="mt-3 relative flex flex-col items-center justify-center gap-1 min-h-37.5 border-[1.5px] border-dashed border-line rounded-xl bg-row-hover cursor-pointer text-center p-4 overflow-hidden">
                {sr.thumbnail_url && <img src={sr.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />}
                <span className="relative font-extrabold text-sm bg-white/90 rounded-lg px-2 py-0.5">{busy ? 'Uploading…' : 'Choose an image'}</span>
                <span className="relative text-xs text-muted-label bg-white/90 rounded-lg px-2">Shown on the series card. Leave empty to use the first session's.</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onThumb} />
              </label>
            </Card>
            <section className="bg-ink-deep text-white rounded-[14px] p-5.5 flex flex-col gap-3">
              <p className="text-[13.5px] leading-normal text-[#D9D5CF]">Once the series is created, add its sessions from the New session tab.</p>
              <button type="button" disabled={busy} onClick={saveSeries} className="min-h-11.5 rounded-xl bg-orange font-extrabold text-sm">Create series</button>
            </section>
          </div>
        </div>
      )}
    </>
  )
}
