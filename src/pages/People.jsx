import { useRef, useState } from 'react'
import PageHead from '../components/PageHead.jsx'
import Badge from '../components/Badge.jsx'
import Avatar from '../components/Avatar.jsx'
import Toggle from '../components/Toggle.jsx'
import BtnSm from '../components/BtnSm.jsx'
import Modal from '../components/Modal.jsx'
import Field, { TextInput, Select } from '../components/Field.jsx'
import NotesThread from '../components/NotesThread.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { useMe } from '../context/MeContext.jsx'
import { useAppToast } from '../context/ToastContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { normPhoneJS } from '../lib/phone.js'
import { fmtDate, fmtPhone, initials } from '../lib/format.js'
import { todayStr } from '../lib/format.js'
import { STEPS, stepOf, HEARD_OPTIONS } from '../config/site.js'

function badgeFor(p) {
  if (p.member_since) return ['green', 'Member since ' + fmtDate(p.member_since)]
  if (p.milestone === 'membership_ready') return ['green', 'Ready for membership ✓']
  if (p.milestone === 'membership_window') {
    const done = p.completed_on ? new Date(p.completed_on + 'T00:00:00') : new Date()
    const left = Math.max(0, 30 - Math.floor((Date.now() - done.getTime()) / 86400000))
    return ['navy', `Membership window · ${left}d left`]
  }
  if (p.milestone === 'in_journey') return ['grey', 'In journey']
  return ['grey', 'New']
}

function CheckinRow({ c, isDirector, onEdit, onDelete }) {
  return (
    <div className="flex gap-2.5 py-2.25 px-3 rounded-xl bg-white border border-line mb-1.75 items-start">
      <div className="flex-1">
        <div className="text-[12.5px] text-ink-deep leading-[1.5]">Step {c.step} — {stepOf(c.step).title}</div>
        <div className="font-mono text-[9.5px] text-muted-label mt-0.75">{fmtDate(c.checkin_date)}</div>
      </div>
      {isDirector && (
        <div className="flex gap-0.5 flex-none">
          <button type="button" title="Edit check-in" onClick={onEdit} className="text-muted-icon text-xs leading-none py-0.75 px-1.25 rounded-md hover:text-orange-deep hover:bg-orange-soft">✎</button>
          <button type="button" title="Delete check-in" onClick={onDelete} className="text-muted-icon text-[15px] leading-none py-0.5 px-1 rounded-md hover:text-orange-deep hover:bg-orange-soft">✕</button>
        </div>
      )}
    </div>
  )
}

function PersonRow({ p, isDirector, onFlip, onEdit, onBackfill, onWelcome, onDelete, onEditCheckin, onDeleteCheckin }) {
  const [expanded, setExpanded] = useState(false)
  const [checkins, setCheckins] = useState(null)

  const loadCheckins = async () => {
    const { data, error } = await supabase.from('checkins').select('id, step, checkin_date').eq('person_id', p.id).order('checkin_date', { ascending: false })
    setCheckins(error ? [] : (data || []))
  }

  const toggleExpand = () => {
    const opening = !expanded
    setExpanded(opening)
    if (opening) loadCheckins()
  }

  const [bc, bt] = badgeFor(p)
  const steps = p.steps || []
  const hcBadge = p.hc_eligible && !p.member_since

  return (
    <>
      <tr className="cursor-pointer [&:hover_td]:bg-row-hover" onClick={toggleExpand}>
        <td className="py-3 px-2.5 border-b border-[#ECE7DA] text-[13px] align-middle">
          <div className="flex items-center gap-2.5">
            <Avatar name={p.full_name} size={30} fontSize={11} />
            <div>
              <div className="font-bold text-ink-deep leading-tight text-[13px]">{p.full_name}</div>
              <div className="font-mono text-[10.5px] text-muted-label">{fmtPhone(p.phone)}</div>
            </div>
          </div>
        </td>
        <td className="py-3 px-2.5 border-b border-[#ECE7DA] text-[13px] align-middle">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className={`w-3.5 h-4.5 rounded-[999px_999px_3px_3px] ${steps.includes(n) ? 'bg-orange' : 'bg-cream-deep'}`} />
            ))}
          </div>
        </td>
        <td className="py-3 px-2.5 border-b border-[#ECE7DA] font-mono text-[11.5px] text-muted-sub align-middle">
          {p.last_seen ? fmtDate(p.last_seen.slice(0, 10)) : '—'}
        </td>
        <td className="py-3 px-2.5 border-b border-[#ECE7DA] text-[13px] align-middle">
          <Badge variant={bc}>{bt}</Badge>{hcBadge && <Badge variant="orange" className="ml-1">HC eligible</Badge>}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-row-hover">
          <td colSpan={4} className="py-4 px-3.5">
            <div className="grid grid-cols-2 gap-3.5 max-mobile:grid-cols-1">
              <div>
                <div className="font-mono text-[9px] tracking-[.1em] uppercase text-muted-label font-semibold mb-0.75">Contact</div>
                <div className="font-bold text-[12.5px] text-ink-deep">
                  {fmtPhone(p.phone)}
                  {p.email && <><br /><span className="font-medium text-muted-sub">{p.email}</span></>}
                </div>
              </div>
              <div>
                <div className="font-mono text-[9px] tracking-[.1em] uppercase text-muted-label font-semibold mb-0.75">Steps completed</div>
                <div className="font-bold text-[12.5px] text-ink-deep">
                  {steps.length ? steps.map((n) => 'Step ' + n).join(' · ') : 'None yet'}
                  {p.hc_eligible && <Badge variant="orange" className="ml-1 align-[1px]">House church eligible</Badge>}
                </div>
              </div>
              <div>
                <div className="font-mono text-[9px] tracking-[.1em] uppercase text-muted-label font-semibold mb-0.75">Heard about us</div>
                <div className="font-bold text-[12.5px] text-ink-deep">{p.heard_about || '—'}</div>
              </div>
              <div>
                <div className="font-mono text-[9px] tracking-[.1em] uppercase text-muted-label font-semibold mb-0.75">Interest — reported to leader</div>
                <div className="flex gap-1.75 mt-1 flex-wrap">
                  {isDirector && (
                    <>
                      <Toggle on={p.hc_interest} onClick={() => onFlip(p, 'hc_interest')}>House church</Toggle>
                      <Toggle on={p.serving_interest} onClick={() => onFlip(p, 'serving_interest')}>Serving</Toggle>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-dashed border-line pt-3">
              <div className="font-mono text-[9px] tracking-[.1em] uppercase text-muted-label font-semibold mb-2">
                Check-in records{isDirector ? ' — edit to fix a wrong step or date' : ''}
              </div>
              {checkins === null ? (
                <EmptyState>Loading check-ins…</EmptyState>
              ) : checkins.length === 0 ? (
                <EmptyState>No check-ins recorded yet.</EmptyState>
              ) : (
                checkins.map((c) => (
                  <CheckinRow
                    key={c.id}
                    c={c}
                    isDirector={isDirector}
                    onEdit={() => onEditCheckin(p, c, loadCheckins)}
                    onDelete={() => onDeleteCheckin(p, c, loadCheckins)}
                  />
                ))
              )}
            </div>

            <NotesThread personId={p.id} />

            {isDirector && (
              <div className="flex gap-1.75 mt-3.5 flex-wrap">
                <BtnSm variant="outline" onClick={() => onEdit(p, loadCheckins)}>Edit details</BtnSm>
                <BtnSm variant="outline" onClick={() => onBackfill(p, loadCheckins)}>Record a check-in</BtnSm>
                {p.milestone === 'membership_ready' && !p.member_since && (
                  <BtnSm onClick={() => onWelcome(p)}>Welcome as member</BtnSm>
                )}
                <BtnSm variant="outline" className="text-orange-deep!" onClick={() => onDelete(p)}>Delete</BtnSm>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

export default function People({ people, onDataChange }) {
  const me = useMe()
  const isDirector = me?.role === 'director'
  const toast = useAppToast()
  const [search, setSearch] = useState('')

  const q = search.toLowerCase()
  const qDigits = q.replace(/\D/g, '')
  const qPhone = normPhoneJS(q)
  const rows = people.filter((p) => !q || p.full_name.toLowerCase().includes(q) ||
    (qDigits && ((p.phone || '').includes(qDigits) || (p.phone || '').includes(qPhone))))

  // ---- modal state ----
  const [editPerson, setEditPerson] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editHeard, setEditHeard] = useState('')
  const [editFirstTime, setEditFirstTime] = useState(false)
  const [editMemberSince, setEditMemberSince] = useState('')
  const [editHc, setEditHc] = useState(false)
  const [editServing, setEditServing] = useState(false)
  // The person's check-ins, edited as a list inside the same modal. `null`
  // while loading; `editCheckinsOrig` is the untouched copy we diff against
  // on save to work out which rows to delete, update, and insert.
  const [editCheckins, setEditCheckins] = useState(null)
  const [editCheckinsOrig, setEditCheckinsOrig] = useState([])
  const editReloadRef = useRef(null)

  const [backfillPerson, setBackfillPerson] = useState(null)
  const backfillReloadRef = useRef(null)
  const [backfillStep, setBackfillStep] = useState(1)
  const [backfillDate, setBackfillDate] = useState(todayStr())

  const [welcomePerson, setWelcomePerson] = useState(null)
  const [memberSince, setMemberSince] = useState(todayStr())

  const [deletePerson, setDeletePerson] = useState(null)

  const [editCheckin, setEditCheckin] = useState(null) // { person, checkin, reload }
  const [ckStep, setCkStep] = useState(1)
  const [ckDate, setCkDate] = useState('')

  const [deleteCheckin, setDeleteCheckin] = useState(null) // { person, checkin, reload }

  // Pulls the person's check-ins into the modal and resets the diff baseline.
  // Also used after a partial save failure, so a second Save press diffs
  // against what's really stored rather than re-inserting rows that landed.
  const syncEditCheckins = async (personId) => {
    const { data } = await supabase.from('checkins').select('id, step, checkin_date')
      .eq('person_id', personId).order('checkin_date', { ascending: false })
    setEditCheckins((data || []).map((c) => ({ ...c })))
    setEditCheckinsOrig((data || []).map((c) => ({ ...c })))
  }

  const openEdit = async (p, reload) => {
    setEditPerson(p)
    setEditName(p.full_name)
    setEditPhone(fmtPhone(p.phone))
    setEditEmail(p.email || '')
    setEditHeard(p.heard_about || '')
    setEditFirstTime(!!p.first_time)
    setEditMemberSince(p.member_since || '')
    setEditHc(!!p.hc_interest)
    setEditServing(!!p.serving_interest)
    setEditCheckins(null)
    editReloadRef.current = reload || null
    await syncEditCheckins(p.id)
  }

  const patchCk = (i, patch) => setEditCheckins((rows) => rows.map((r, n) => (n === i ? { ...r, ...patch } : r)))
  const removeCk = (i) => setEditCheckins((rows) => rows.filter((_, n) => n !== i))
  const addCk = () => setEditCheckins((rows) => {
    const used = rows.map((r) => r.step)
    const next = STEPS.find((s) => !used.includes(s.n)) || STEPS[0]
    return [...rows, { id: null, step: next.n, checkin_date: todayStr() }]
  })
  const openBackfill = (p, reload) => { setBackfillPerson(p); backfillReloadRef.current = reload; setBackfillStep((STEPS.find((s) => !(p.steps || []).includes(s.n)) || STEPS[0]).n); setBackfillDate(todayStr()) }
  const openWelcome = (p) => { setWelcomePerson(p); setMemberSince(todayStr()) }
  const openEditCheckin = (p, c, reload) => { setEditCheckin({ person: p, checkin: c, reload }); setCkStep(c.step); setCkDate(c.checkin_date) }

  const handleFlip = async (p, field) => {
    const nv = !p[field]
    const { error } = await supabase.from('people').update({ [field]: nv }).eq('id', p.id)
    if (error) { toast("Couldn't save — check your access."); return }
    await onDataChange()
    if (nv) toast(`<b>${p.full_name.split(' ')[0]}</b> flagged for ${field === 'hc_interest' ? "house church — appears on the overseer's list" : 'serving'}.`)
  }

  return (
    <>
      <PageHead
        title="People"
        sub="Everyone in the Next Steps journey. Tap a row for details."
        right={<input className="w-full max-w-80 py-2.75 px-3.5 border-[1.5px] border-line rounded-[11px] bg-white text-[13.5px]" type="search" placeholder="Search name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />}
      />
      <div className="bg-white border border-line rounded-[14px] shadow-card py-5 px-5.5">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[560px]">
            <thead>
              <tr>
                {['Person', 'Journey', 'Last seen', 'Status'].map((h) => (
                  <th key={h} className="text-left font-mono text-[9.5px] font-semibold tracking-[.11em] uppercase text-muted-label pb-2.25 px-2.5 border-b-[1.5px] border-line">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((p) => (
                <PersonRow
                  key={p.id}
                  p={p}
                  isDirector={isDirector}
                  onFlip={handleFlip}
                  onEdit={openEdit}
                  onBackfill={openBackfill}
                  onWelcome={openWelcome}
                  onDelete={setDeletePerson}
                  onEditCheckin={openEditCheckin}
                  onDeleteCheckin={(p, c, reload) => setDeleteCheckin({ person: p, checkin: c, reload })}
                />
              )) : <tr><td colSpan={4}><EmptyState>No one found.</EmptyState></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!editPerson}
        title="Edit details"
        sub={editPerson?.full_name}
        saveLabel="Save changes"
        onClose={() => setEditPerson(null)}
        onSave={async () => {
          const upd = {
            full_name: editName.trim(),
            phone: normPhoneJS(editPhone),
            email: editEmail.trim() || null,
            heard_about: editHeard || null,
            first_time: editFirstTime,
            member_since: editMemberSince || null,
            hc_interest: editHc,
            serving_interest: editServing,
          }
          if (!upd.full_name || upd.phone.length < 10) { toast('Please check the name and phone number.'); return false }

          // Validate the check-in list before writing anything, so a bad row
          // can't leave the person half-saved. The date clash is the schema's
          // `unique (person_id, checkin_date)` rule, caught here to give a
          // clearer message than a raw 23505 would.
          const rows = editCheckins || []
          if (rows.some((r) => !r.checkin_date)) { toast('Every check-in needs a date.'); return false }
          const dates = rows.map((r) => r.checkin_date)
          if (new Set(dates).size !== dates.length) { toast('Two check-ins have the same date. Only one per person per day is allowed.'); return false }

          const { error } = await supabase.from('people').update(upd).eq('id', editPerson.id)
          if (error) { toast(error.code === '23505' ? 'That phone number belongs to someone else.' : "Couldn't save — check your access."); return false }

          // Deletes first, then updates, then inserts: freeing a date before
          // anything tries to claim it avoids a transient clash with the
          // one-per-day constraint.
          const origById = new Map(editCheckinsOrig.map((c) => [c.id, c]))
          const keptIds = new Set(rows.filter((r) => r.id).map((r) => r.id))
          const gone = editCheckinsOrig.filter((c) => !keptIds.has(c.id)).map((c) => c.id)
          const moved = rows.filter((r) => r.id && (origById.get(r.id).step !== r.step || origById.get(r.id).checkin_date !== r.checkin_date))
          const fresh = rows.filter((r) => !r.id).map((r) => ({ person_id: editPerson.id, step: r.step, checkin_date: r.checkin_date }))

          let ckErr = null
          if (!ckErr && gone.length) ({ error: ckErr } = await supabase.from('checkins').delete().in('id', gone))
          for (const r of moved) {
            if (ckErr) break
            ;({ error: ckErr } = await supabase.from('checkins').update({ step: r.step, checkin_date: r.checkin_date }).eq('id', r.id))
          }
          if (!ckErr && fresh.length) ({ error: ckErr } = await supabase.from('checkins').insert(fresh))

          await onDataChange()
          if (editReloadRef.current) await editReloadRef.current()
          if (ckErr) {
            // Some writes may already have landed. Re-read so the list shows
            // what's actually stored and a retry can't duplicate them.
            await syncEditCheckins(editPerson.id)
            toast(ckErr.code === '23505'
              ? 'Saved the details, but a check-in date clashed with one already on file. The list below now shows what saved.'
              : "Saved the details, but couldn't save every check-in. The list below now shows what saved.")
            return false
          }
          toast('Details updated.')
        }}
      >
        <Field label="Full name"><TextInput value={editName} onChange={(e) => setEditName(e.target.value)} /></Field>
        <Field label="Phone number"><TextInput type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} /></Field>
        <Field label="Email"><TextInput type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} /></Field>
        <Field label="How did they hear about us?">
          <Select value={editHeard} onChange={(e) => setEditHeard(e.target.value)}>
            <option value="">Not recorded</option>
            {/* An imported value that predates HEARD_OPTIONS stays selectable,
                so opening and saving this modal can't quietly wipe it. */}
            {!!editHeard && !HEARD_OPTIONS.includes(editHeard) && <option value={editHeard}>{editHeard}</option>}
            {HEARD_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
        </Field>
        <Field label="First time at Rig Church?">
          <Select value={editFirstTime ? 'yes' : 'no'} onChange={(e) => setEditFirstTime(e.target.value === 'yes')}>
            <option value="no">No, they'd been before</option>
            <option value="yes">Yes, first time</option>
          </Select>
        </Field>
        <Field label="Member since">
          <TextInput type="date" value={editMemberSince} max={todayStr()} onChange={(e) => setEditMemberSince(e.target.value)} />
          <div className="text-[11.5px] text-muted-label mt-1.25">
            Only records a decision leadership has already made. Clear the date to undo it.
          </div>
        </Field>
        <Field label="Interest, reported to leader">
          <div className="flex gap-1.75 flex-wrap">
            <Toggle on={editHc} onClick={() => setEditHc(!editHc)}>House church</Toggle>
            <Toggle on={editServing} onClick={() => setEditServing(!editServing)}>Serving</Toggle>
          </div>
        </Field>
        <Field label="Check-in records">
          {editCheckins === null ? (
            <div className="text-[12px] text-muted-label py-1.5">Loading check-ins…</div>
          ) : (
            <>
              {editCheckins.length === 0 && (
                <div className="text-[12px] text-muted-label pb-1.5">No check-ins on file yet.</div>
              )}
              {editCheckins.map((r, i) => (
                <div key={r.id || `new-${i}`} className="flex gap-1.75 items-center mb-1.75">
                  <Select className="flex-1 py-2.25! text-[13px]!" value={r.step} onChange={(e) => patchCk(i, { step: +e.target.value })}>
                    {STEPS.map((s) => <option key={s.n} value={s.n}>Step {s.n}</option>)}
                  </Select>
                  <TextInput className="flex-1 py-2.25! text-[13px]!" type="date" max={todayStr()} value={r.checkin_date} onChange={(e) => patchCk(i, { checkin_date: e.target.value })} />
                  <button
                    type="button"
                    title="Remove this check-in"
                    onClick={() => removeCk(i)}
                    className="flex-none text-muted-icon text-[15px] leading-none py-1.5 px-2 rounded-md hover:text-orange-deep hover:bg-orange-soft"
                  >✕</button>
                </div>
              ))}
              <BtnSm variant="outline" onClick={addCk}>Add a check-in</BtnSm>
              <div className="text-[11.5px] text-muted-label mt-1.75">
                One check-in per date. Nothing is written until you save. Removing one also
                removes its follow-up record.
              </div>
            </>
          )}
        </Field>
      </Modal>

      <Modal
        open={!!backfillPerson}
        title="Record a check-in"
        sub={backfillPerson ? `${backfillPerson.full_name} — for a Sunday their phone missed` : ''}
        saveLabel="Record it"
        onClose={() => setBackfillPerson(null)}
        onSave={async () => {
          const { error } = await supabase.from('checkins').insert({ person_id: backfillPerson.id, step: backfillStep, checkin_date: backfillDate })
          if (error) { toast(error.code === '23505' ? 'They already have a check-in on that date.' : "Couldn't save — check your access."); return false }
          toast('Check-in recorded.')
          backfillReloadRef.current?.()
          await onDataChange()
        }}
      >
        <Field label="Step">
          <Select value={backfillStep} onChange={(e) => setBackfillStep(+e.target.value)}>
            {STEPS.map((s) => (
              <option key={s.n} value={s.n} disabled={(backfillPerson?.steps || []).includes(s.n)}>
                Step {s.n} — {s.title}{(backfillPerson?.steps || []).includes(s.n) ? ' (done)' : ''}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date attended"><TextInput type="date" value={backfillDate} max={todayStr()} onChange={(e) => setBackfillDate(e.target.value)} /></Field>
      </Modal>

      <Modal
        open={!!welcomePerson}
        title="Welcome as member"
        sub={welcomePerson?.full_name}
        saveLabel="Record membership"
        onClose={() => setWelcomePerson(null)}
        onSave={async () => {
          const { error } = await supabase.from('people').update({ member_since: memberSince }).eq('id', welcomePerson.id)
          if (error) { toast("Couldn't save — check your access."); return false }
          toast(`🎉 <b>${welcomePerson.full_name.split(' ')[0]}</b> recorded as a member of Rig Church.`)
          await onDataChange()
        }}
      >
        <p className="text-[13px] text-muted-body mt-3">
          {welcomePerson?.full_name.split(' ')[0]} completed all 4 steps and the one-month commitment window has passed. Per the SOP, the public welcome is a <b>leadership decision</b> — record it here once leadership has approved.
        </p>
        <Field label="Member since"><TextInput type="date" value={memberSince} max={todayStr()} onChange={(e) => setMemberSince(e.target.value)} /></Field>
      </Modal>

      <Modal
        open={!!deletePerson}
        title="Delete this person?"
        sub={deletePerson?.full_name}
        saveLabel="Yes, delete"
        onClose={() => setDeletePerson(null)}
        onSave={async () => {
          const { error } = await supabase.from('people').delete().eq('id', deletePerson.id)
          if (error) { toast("Couldn't delete — check your access."); return false }
          toast('Deleted.')
          await onDataChange()
        }}
      >
        <p className="text-[13px] text-muted-body mt-3">This removes {deletePerson?.full_name} and all their check-ins and follow-ups permanently. Use it for test entries or duplicates only — it cannot be undone.</p>
      </Modal>

      <Modal
        open={!!editCheckin}
        title="Edit check-in"
        sub="Fix a wrong step or date"
        saveLabel="Save changes"
        onClose={() => setEditCheckin(null)}
        onSave={async () => {
          const { error } = await supabase.from('checkins').update({ step: ckStep, checkin_date: ckDate }).eq('id', editCheckin.checkin.id)
          if (error) { toast(error.code === '23505' ? 'They already have a check-in on that date.' : "Couldn't save — check your access."); return false }
          toast('Check-in updated.')
          editCheckin.reload()
          await onDataChange()
        }}
      >
        <Field label="Step">
          <Select value={ckStep} onChange={(e) => setCkStep(+e.target.value)}>
            {STEPS.map((s) => <option key={s.n} value={s.n}>Step {s.n} — {s.title}</option>)}
          </Select>
        </Field>
        <Field label="Date attended"><TextInput type="date" value={ckDate} max={todayStr()} onChange={(e) => setCkDate(e.target.value)} /></Field>
      </Modal>

      <Modal
        open={!!deleteCheckin}
        title="Delete this check-in?"
        saveLabel="Yes, delete"
        onClose={() => setDeleteCheckin(null)}
        onSave={async () => {
          const { error } = await supabase.from('checkins').delete().eq('id', deleteCheckin.checkin.id)
          if (error) { toast("Couldn't delete — check your access."); return false }
          toast('Check-in deleted.')
          deleteCheckin.reload()
          await onDataChange()
        }}
      >
        <p className="text-[13px] text-muted-body mt-3">This removes the record of that step being attended. It cannot be undone.</p>
      </Modal>
    </>
  )
}
