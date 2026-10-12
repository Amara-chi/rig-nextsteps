import { useState } from 'react'
import Card from './Card.jsx'
import Badge from './Badge.jsx'
import Avatar from './Avatar.jsx'
import BtnSm from './BtnSm.jsx'
import NotesThread from './NotesThread.jsx'
import EmptyState from './EmptyState.jsx'
import OutcomeModal from './OutcomeModal.jsx'
import ChatPanel from './ChatPanel.jsx'
import { useMe } from '../context/MeContext.jsx'
import { useAppToast } from '../context/ToastContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { fillMsg, fmtPhone, fmtWhen } from '../lib/format.js'
import { sendWhatsApp } from '../lib/whatsapp.js'
import { MSG_ATTENDED, MSG_COMPLETED } from '../config/site.js'

const linkBtnClass = 'inline-flex items-center gap-1.5 px-4 py-2.25 rounded-[10px] font-bold text-[12.5px] whitespace-nowrap bg-white border-[1.5px] border-line text-ink hover:border-orange hover:text-orange'

const STATUS_LABEL = { sent: 'Message sent', called: 'Called', texted: 'Texted', door_open: 'Door open' }

function badgeFor(p, context) {
  if (context === 'hc') return ['orange', 'House church interested']
  if (context === 'membership') return p.member_since ? ['green', 'Member'] : ['navy', 'Membership pipeline']
  if (p.is_noshow) return ['grey', 'No-show — needs a call']
  return ['orange', 'Awaiting follow-up']
}

// Mirrors the old app's if/else-if chain exactly (mutually exclusive,
// ordered) — follow-up-specific actions only ever appear on the Follow Up
// page; House Church and Membership always just offer plain contact.
function actionKind(p, context) {
  if (context !== 'followup') return 'plain'
  if (p.is_awaiting_followup && p.open_followup_status === 'pending') return 'send-first'
  if (p.is_awaiting_followup) return 'log-followup'
  if (p.is_noshow) return 'log-noshow'
  return 'plain'
}

// Shared by all 3 Support pages (House Church, Follow Up, Membership) —
// same v_support_people row shape, same notes thread, same contact actions,
// differing only in which independent boolean selects them and which badge
// shows. The old app rendered all 3 from one renderSupport() call.
//
// conversations (from useMessages) lets every row say where the WhatsApp
// thread stands — new replies, the last thing said, when — so support can
// see what is going on without opening each chat. refreshMessages keeps the
// nav badge honest once a chat has been read.
export default function SupportPersonList({ list, context, hadError, refresh, conversations = [], refreshMessages }) {
  const me = useMe()
  const toast = useAppToast()
  const [outcomeState, setOutcomeState] = useState(null)
  const [chatPerson, setChatPerson] = useState(null)
  const [sendingId, setSendingId] = useState(null)

  const saveOutcomeNote = async (personId, status, text) => {
    if (!text) return
    await supabase.from('person_notes').insert({ person_id: personId, author_id: me.id, note: `Follow-up — ${STATUS_LABEL[status] || status}: ${text}` })
  }

  // Sends from the church's WhatsApp number via the Cloud API, the same path
  // the Follow-Up Centre uses. whatsapp-send checks support_visible_person()
  // for support accounts, so this can only reach the people this page already
  // shows — the authorisation is not the button being hidden.
  const sendFirstMessage = async (p) => {
    const completed = p.steps_done === 4
    const first = p.full_name.split(' ')[0]
    const msg = completed ? fillMsg(MSG_COMPLETED, first, p.open_followup_step) : fillMsg(MSG_ATTENDED, first, p.open_followup_step || '')
    setSendingId(p.id)
    const res = await sendWhatsApp({
      person_id: p.id,
      mode: 'template',
      template_key: completed ? 'completed' : 'attended',
      display_text: msg,
    })
    setSendingId(null)
    if (!res.ok) { toast(res.error); return }
    const { error } = await supabase.from('followups').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', p.open_followup_id)
    if (error) { toast("Message sent, but couldn't log it. Check your access."); return }
    toast('Sent — log the outcome once you hear back.')
    setTimeout(refresh, 1000)
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

  if (hadError) return <Card className="mb-0"><EmptyState>Couldn't load — check your access.</EmptyState></Card>

  return (
    <>
      <Card className="mb-0">
        {list.length ? list.map((p) => {
          const [bc, bt] = badgeFor(p, context)
          const kind = actionKind(p, context)
          const convo = conversations.find((c) => c.person_id === p.id)
          const unread = Number(convo?.unread || 0)
          const chatBtn = (
            <button type="button" onClick={() => setChatPerson(p)} className={linkBtnClass}>
              {unread ? `Open chat · ${unread} new` : 'Open chat'}
            </button>
          )
          return (
            <div key={p.id} className="flex flex-col items-stretch gap-3.25 py-3.75 border-b border-[#ECE7DA] last:border-b-0">
              <div className="flex gap-3.25 items-start flex-wrap">
                <Avatar name={p.full_name} />
                <div className="flex-1 min-w-55">
                  <div className="font-extrabold text-[13px] text-ink-deep">{p.full_name} <Badge variant={bc}>{bt}</Badge></div>
                  <div className="text-xs text-muted-label mt-0.5">{fmtPhone(p.phone)}{p.email ? ' · ' + p.email : ''}</div>
                  <div className="text-xs mt-1.5 flex items-center gap-1.5 flex-wrap">
                    {convo ? (
                      <>
                        {unread > 0 && <Badge variant="orange">{unread} new {unread === 1 ? 'reply' : 'replies'}</Badge>}
                        <span className={`truncate max-w-[32ch] ${unread ? 'text-ink font-semibold' : 'text-muted-label'}`}>
                          {convo.last_direction === 'out' ? 'You: ' : ''}{convo.last_body || ''}
                        </span>
                        <span className="font-mono text-[10.5px] text-muted-label">{fmtWhen(convo.last_at)}</span>
                      </>
                    ) : (
                      <span className="text-muted-label">No WhatsApp messages yet.</span>
                    )}
                  </div>
                </div>
                <div className="ml-auto flex gap-1.75 flex-none flex-wrap">
                  {kind === 'send-first' && (
                    <>
                      {convo && chatBtn}
                      <BtnSm disabled={sendingId === p.id} onClick={() => sendFirstMessage(p)}>
                        {sendingId === p.id ? 'Sending…' : 'Send on WhatsApp'}
                      </BtnSm>
                    </>
                  )}
                  {kind === 'log-followup' && (
                    <>
                      {chatBtn}
                      <BtnSm onClick={() => setOutcomeState({ kind: 'followup', id: p.open_followup_id, personId: p.id, title: 'Log follow-up outcome', sub: p.full_name, defaultStatus: p.open_followup_status })}>Log outcome</BtnSm>
                    </>
                  )}
                  {kind === 'log-noshow' && (
                    <>
                      {chatBtn}
                      <BtnSm onClick={() => setOutcomeState({ kind: 'noshow', personId: p.id, title: 'Log no-show follow-up', sub: p.full_name, defaultStatus: 'called' })}>Log outcome</BtnSm>
                    </>
                  )}
                  {kind === 'plain' && (
                    <>
                      <a href={`tel:+${p.phone}`} className={linkBtnClass}>Call</a>
                      {chatBtn}
                    </>
                  )}
                </div>
              </div>
              <NotesThread personId={p.id} className="mt-2.5" showLabel={false} />
            </div>
          )
        }) : <EmptyState>No one here right now. 🎉</EmptyState>}
      </Card>
      {chatPerson && (
        <ChatPanel
          person={chatPerson}
          completed={chatPerson.steps_done === 4}
          onClose={() => { setChatPerson(null); refreshMessages?.() }}
          onSent={() => { refresh(); refreshMessages?.() }}
          onRead={refreshMessages}
        />
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
