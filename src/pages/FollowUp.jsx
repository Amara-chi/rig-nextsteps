import { useState } from 'react'
import PageHead from '../components/PageHead.jsx'
import Card from '../components/Card.jsx'
import Badge from '../components/Badge.jsx'
import Avatar from '../components/Avatar.jsx'
import BtnSm from '../components/BtnSm.jsx'
import OutcomeModal from '../components/OutcomeModal.jsx'
import ChatPanel from '../components/ChatPanel.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { useMe } from '../context/MeContext.jsx'
import { useAppToast } from '../context/ToastContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { fillMsg, fmtDate } from '../lib/format.js'
import { sendWhatsApp } from '../lib/whatsapp.js'
import { MSG_ATTENDED, MSG_COMPLETED, MSG_NOSHOW } from '../config/site.js'

const TABS = [
  { id: 'attended', label: 'To send' },
  { id: 'awaiting', label: 'Awaiting outcome' },
  { id: 'noshow', label: 'No-shows — Monday protocol' },
]

const linkBtnClass = 'inline-flex items-center gap-1.5 px-4 py-2.25 rounded-[10px] font-bold text-[12.5px] whitespace-nowrap bg-white border-[1.5px] border-line text-ink hover:border-orange hover:text-orange'

export default function FollowUp({ people, attended, awaiting, noshows, STATUS_LABEL, refresh }) {
  const me = useMe()
  const isDirector = me?.role === 'director'
  const toast = useAppToast()
  const [tab, setTab] = useState('attended')
  const [outcomeState, setOutcomeState] = useState(null) // { kind, id?, personId, title, sub, defaultStatus }
  const [chatPerson, setChatPerson] = useState(null)
  const [sendingId, setSendingId] = useState(null)

  // Sends from the church's own WhatsApp number through the Cloud API, not
  // from whoever tapped the button. Business-initiated messages must use an
  // approved template, and someone who has finished all four steps gets
  // different words, so which template is named depends on that.
  const sendAttended = async (f) => {
    const prog = people.find((p) => p.id === f.people?.id)
    const completed = prog && prog.steps_done === 4
    const first = (f.people?.full_name || '').split(' ')[0]
    const msg = completed ? fillMsg(MSG_COMPLETED, first, f.checkins?.step) : fillMsg(MSG_ATTENDED, first, f.checkins?.step || '')
    setSendingId(f.id)
    const res = await sendWhatsApp({
      person_id: f.people?.id,
      mode: 'template',
      template_key: completed ? 'completed' : 'attended',
      display_text: msg,
    })
    setSendingId(null)
    if (!res.ok) { toast(res.error); return }
    const { error } = await supabase.from('followups').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', f.id)
    if (error) { toast("Message sent, but couldn't log it. Check your access."); return }
    toast('Sent — now in <b>Awaiting outcome</b> until you log what happened.')
    setTimeout(refresh, 1000)
  }

  // "Awaiting outcome" is status in (sent, called, texted) with no outcome
  // logged; "To send" is status pending. So undoing a send that shouldn't have
  // gone out is just putting the row back to pending. Nothing else to reset:
  // a row can only be in this tab while its outcome is still null.
  const backToSend = async (f) => {
    const { error } = await supabase.from('followups').update({ status: 'pending', updated_at: new Date().toISOString() }).eq('id', f.id)
    if (error) { toast("Couldn't move that one back — check your access."); return }
    toast('Moved back to <b>To send</b>.')
    setTimeout(refresh, 400)
  }

  // SOP is call first, text second. The text now goes from the church number
  // like everything else, which means it needs its own approved template:
  // Meta approves each wording separately and this one says something quite
  // different from the attended message.
  const sendNoshow = async (p, msg) => {
    setSendingId(p.id)
    const res = await sendWhatsApp({ person_id: p.id, mode: 'template', template_key: 'noshow', display_text: msg })
    setSendingId(null)
    if (!res.ok) { toast(res.error); return }
    toast('Text sent. Log the outcome once you hear back.')
  }

  const saveOutcomeNote = async (personId, status, text) => {
    if (!text) return
    await supabase.from('person_notes').insert({ person_id: personId, author_id: me.id, note: `Follow-up — ${STATUS_LABEL[status] || status}: ${text}` })
  }

  const logFollowupOutcome = async (status, note) => {
    const { id, personId } = outcomeState
    const { error } = await supabase.from('followups').update({ status, outcome: note || '(no details logged)', updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast("Couldn't save — check your access."); return false }
    await saveOutcomeNote(personId, status, note)
    toast('Outcome logged' + (note ? ' — and saved as a note on their profile.' : '.'))
    refresh()
  }

  const logNoshowOutcome = async (status, note) => {
    const { personId } = outcomeState
    const { error } = await supabase.from('followups').insert({ person_id: personId, type: 'noshow', status, outcome: note || '(no details logged)' })
    if (error) { toast("Couldn't save — check your access."); return false }
    await saveOutcomeNote(personId, status, note)
    toast('Logged for the record' + (note ? ' — and saved as a note.' : '.'))
  }

  return (
    <>
      <PageHead title="Follow-Up Centre" sub="Send within 24 hours; log what happened whenever it happens — the queue waits for you." />

      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`py-2.25 px-4 rounded-full font-bold text-[12.5px] border-[1.5px] transition-[.15s] ${
              tab === t.id ? 'bg-ink-deep border-ink-deep text-white' : 'bg-white border-line'
            }`}
          >
            {t.label} ({t.id === 'attended' ? attended.length : t.id === 'awaiting' ? awaiting.length : noshows.length})
          </button>
        ))}
      </div>

      {tab === 'attended' && (
        <Card className="mb-0">
          {attended.length > 0 && <div className="text-muted-label text-sm mb-1">One tap opens WhatsApp with the SOP message ready and moves them to "Awaiting outcome".</div>}
          {attended.length ? attended.map((f) => {
            const prog = people.find((p) => p.id === f.people?.id)
            const completed = prog && prog.steps_done === 4
            const first = (f.people?.full_name || '').split(' ')[0]
            const msg = completed ? fillMsg(MSG_COMPLETED, first, f.checkins?.step) : fillMsg(MSG_ATTENDED, first, f.checkins?.step || '')
            return (
              <div key={f.id} className="flex gap-3.25 py-3.75 border-b border-[#ECE7DA] last:border-b-0 items-start flex-wrap">
                <Avatar name={f.people?.full_name} />
                <div className="flex-1 min-w-55">
                  <div className="font-extrabold text-[13px] text-ink-deep">
                    {f.people?.full_name} {completed ? <Badge variant="green">Completed all 4 🎉</Badge> : <Badge variant="grey">Step {f.checkins?.step || '—'}</Badge>}
                  </div>
                  <div className="mt-1.75 py-2.5 px-3.25 rounded-[4px_13px_13px_13px] bg-cream text-xs text-muted-body max-w-[52ch] border border-line">{msg}</div>
                </div>
                <div className="ml-auto flex gap-1.75 flex-none flex-wrap">
                  {isDirector && (
                    <BtnSm disabled={sendingId === f.id} onClick={() => sendAttended(f)}>
                      {sendingId === f.id ? 'Sending…' : 'Send on WhatsApp'}
                    </BtnSm>
                  )}
                  {isDirector && (
                    <BtnSm variant="outline" onClick={() => setOutcomeState({ kind: 'followup', id: f.id, personId: f.people?.id, title: 'Log follow-up outcome', sub: f.people?.full_name, defaultStatus: 'called' })}>
                      Log outcome
                    </BtnSm>
                  )}
                </div>
              </div>
            )
          }) : <EmptyState>All caught up — nothing waiting to send. 🎉</EmptyState>}
        </Card>
      )}

      {tab === 'awaiting' && (
        <Card className="mb-0">
          <div className="text-muted-label text-sm mb-1">Message sent — what came back? Follow-up often lands Monday or later; items stay here until you log the outcome. Every outcome is also saved as a note on the person.</div>
          {awaiting.length ? awaiting.map((f) => {
            const prog = people.find((p) => p.id === f.people?.id)
            return (
            <div key={f.id} className="flex gap-3.25 py-3.75 border-b border-[#ECE7DA] last:border-b-0 items-start flex-wrap">
              <Avatar name={f.people?.full_name} />
              <div className="flex-1 min-w-55">
                <div className="font-extrabold text-[13px] text-ink-deep">
                  {f.people?.full_name} <Badge variant="navy">{STATUS_LABEL[f.status] || f.status} · {fmtDate((f.updated_at || '').slice(0, 10))}</Badge>
                </div>
              </div>
              <div className="ml-auto flex gap-1.75 flex-none flex-wrap">
                <button type="button" onClick={() => setChatPerson({ ...f.people, completed: prog?.steps_done === 4 })} className={linkBtnClass}>Open chat</button>
                {isDirector && (
                  <BtnSm variant="outline" onClick={() => backToSend(f)}>Back to To send</BtnSm>
                )}
                {isDirector && (
                  <BtnSm onClick={() => setOutcomeState({ kind: 'followup', id: f.id, personId: f.people?.id, title: 'Log follow-up outcome', sub: f.people?.full_name, defaultStatus: f.status })}>
                    Log outcome
                  </BtnSm>
                )}
              </div>
            </div>
            )
          }) : <EmptyState>Nothing awaiting an outcome.</EmptyState>}
        </Card>
      )}

      {tab === 'noshow' && (
        <Card className="mb-0">
          <div className="text-muted-label text-sm">Attended a step but missed this Sunday. SOP: Monday phone call first, text if no answer, then keep the door open — don't chase.</div>
          <div className="py-3.25 px-3.75 border-l-[3px] border-orange bg-cream rounded-[0_12px_12px_0] text-xs text-muted-body italic my-2.5">
            "Hi [Name], it's [Your Name] from RIG Church. Just wanted to check in and see how you're doing. We missed you this Sunday."
          </div>
          {noshows.length ? noshows.map((p) => {
            const first = p.full_name.split(' ')[0]
            const msg = fillMsg(MSG_NOSHOW, first, '')
            return (
              <div key={p.id} className="flex gap-3.25 py-3.75 border-b border-[#ECE7DA] last:border-b-0 items-start flex-wrap">
                <Avatar name={p.full_name} className="bg-[#5A6478]!" />
                <div className="flex-1 min-w-50">
                  <div className="font-extrabold text-[13px] text-ink-deep">{p.full_name}</div>
                  <div className="text-[11.5px] text-muted-label mt-0.5">Last seen {p.last_seen ? fmtDate(p.last_seen.slice(0, 10)) : '—'} · {p.steps_done} of 4 steps</div>
                </div>
                <div className="ml-auto flex gap-1.75 flex-none flex-wrap">
                  <a href={`tel:+${p.phone}`} className={linkBtnClass}>Call</a>
                  {isDirector && (
                    <BtnSm variant="outline" disabled={sendingId === p.id} onClick={() => sendNoshow(p, msg)}>
                      {sendingId === p.id ? 'Sending…' : 'Text'}
                    </BtnSm>
                  )}
                  {isDirector && (
                    <BtnSm onClick={() => setOutcomeState({ kind: 'noshow', personId: p.id, title: 'Log no-show follow-up', sub: p.full_name, defaultStatus: 'called' })}>
                      Log outcome
                    </BtnSm>
                  )}
                </div>
              </div>
            )
          }) : <EmptyState>No one to chase — everyone who started is still coming. 🙌</EmptyState>}
        </Card>
      )}

      {chatPerson && (
        <ChatPanel person={chatPerson} completed={chatPerson.completed} onClose={() => setChatPerson(null)} onSent={refresh} />
      )}

      <OutcomeModal
        open={!!outcomeState}
        title={outcomeState?.title}
        sub={outcomeState?.sub}
        defaultStatus={outcomeState?.defaultStatus}
        onClose={() => setOutcomeState(null)}
        onSave={(status, note) => (outcomeState.kind === 'followup' ? logFollowupOutcome(status, note) : logNoshowOutcome(status, note))}
      />
    </>
  )
}
