import { useCallback, useEffect, useRef, useState } from 'react'
import BtnSm from './BtnSm.jsx'
import EmptyState from './EmptyState.jsx'
import { useMe } from '../context/MeContext.jsx'
import { useAppToast } from '../context/ToastContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { sendWhatsApp } from '../lib/whatsapp.js'
import { usePolling } from '../hooks/usePolling.js'
import { fillMsg, fmtPhone, fmtTime } from '../lib/format.js'
import { MSG_ATTENDED, MSG_COMPLETED } from '../config/site.js'

// WhatsApp only allows free-form business messages within 24 hours of the
// person's last inbound one. Mirrored in SQL as wa_window_open() and enforced
// again in the whatsapp-send function — this copy only decides what the UI
// offers, it is never the thing keeping us compliant.
const WINDOW_MS = 24 * 3600 * 1000

// The church's WhatsApp conversation with one person, inside the app. Reads
// public.whatsapp_messages (filled by the whatsapp-webhook and whatsapp-send
// functions) and polls on the same 10s rhythm as the rest of the admin app.
// completed picks which approved template the fallback button sends. The
// caller decides it, because a person row from the Follow-Up Centre and one
// from the Support pages don't carry the same fields.
export default function ChatPanel({ person, completed = false, onClose, onSent }) {
  const me = useMe()
  const toast = useAppToast()
  const [messages, setMessages] = useState(null) // null = still loading
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)

  const canSend = me?.role === 'director' || me?.role === 'support'

  const load = useCallback(async () => {
    if (!person?.id) return
    const { data } = await supabase
      .from('whatsapp_messages')
      .select('id, direction, body, status, error, created_at')
      .eq('person_id', person.id)
      .order('created_at', { ascending: true })
      .limit(200)
    setMessages(data || [])
  }, [person?.id])

  useEffect(() => { load() }, [load])
  usePolling(load, { enabled: !!person?.id })

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages?.length])

  const lastInbound = (messages || []).filter((m) => m.direction === 'in').at(-1)
  const windowOpen = !!lastInbound && (Date.now() - new Date(lastInbound.created_at).getTime()) < WINDOW_MS

  const send = async (mode) => {
    setSending(true)
    const body = { person_id: person.id, mode }
    if (mode === 'text') body.text = draft.trim()
    else {
      // The approved wording lives in site.js, not in the function, so the
      // chat can show exactly what the person received.
      body.template_key = completed ? 'completed' : 'attended'
      body.display_text = fillMsg(completed ? MSG_COMPLETED : MSG_ATTENDED, (person.full_name || '').split(' ')[0], '')
    }

    const res = await sendWhatsApp(body)
    setSending(false)
    if (!res.ok) { toast(res.error); return }

    if (mode === 'text') setDraft('')
    else toast('Template sent.')
    load()
    onSent?.()
  }

  if (!person) return null

  return (
    <div
      className="fixed inset-0 z-200 p-4.5 overflow-auto bg-ink-deep/50 grid place-items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[min(560px,100%)] bg-white rounded-[20px] shadow-modal flex flex-col max-h-[86vh] animate-fade-fast">
        <div className="py-5 px-6 border-b border-line">
          <h3 className="text-lg font-black tracking-[-.02em] text-ink-deep">{person.full_name}</h3>
          <div className="font-mono text-[11.5px] text-muted-label mt-0.75">
            {fmtPhone(person.phone)} · WhatsApp
          </div>
        </div>

        <div className="flex-1 overflow-auto py-4 px-5 bg-cream">
          {messages === null && <div className="text-[12.5px] text-muted-label">Loading…</div>}
          {messages?.length === 0 && <EmptyState>No messages yet.</EmptyState>}
          {messages?.map((m) => (
            <div key={m.id} className={`flex mb-2.5 ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] py-2.5 px-3.5 text-[13px] leading-[1.45] rounded-[14px] ${
                m.direction === 'out'
                  ? 'bg-orange text-white rounded-br-[4px]'
                  : 'bg-white text-ink border border-line rounded-bl-[4px]'
              }`}>
                <div className="whitespace-pre-wrap">{m.body}</div>
                <div className={`font-mono text-[10px] mt-1 ${m.direction === 'out' ? 'text-white/70' : 'text-muted-label'}`}>
                  {fmtTime(m.created_at)}
                  {m.direction === 'out' && m.status ? ` · ${m.status}` : ''}
                </div>
                {m.error && <div className="text-[10.5px] mt-0.5 font-semibold text-amber-text">{m.error}</div>}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="py-4 px-5 border-t border-line">
          {!canSend ? (
            <div className="text-[12.5px] text-muted-label">Leadership accounts can read the conversation but not reply.</div>
          ) : windowOpen ? (
            <div className="flex gap-2.25 items-end">
              <textarea
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (draft.trim() && !sending) send('text') }
                }}
                placeholder="Write a reply…"
                className="flex-1 resize-none py-2.5 px-3.5 rounded-xl border-[1.5px] border-line text-[13px] focus:border-orange focus:outline-none"
              />
              <BtnSm disabled={sending || !draft.trim()} onClick={() => send('text')}>
                {sending ? 'Sending…' : 'Send'}
              </BtnSm>
            </div>
          ) : (
            <>
              <div className="py-2.75 px-3.5 rounded-xl bg-amber-bg border-[1.5px] border-amber-border text-[12px] leading-[1.45] font-semibold text-amber-text">
                WhatsApp only lets us write freely within 24 hours of their last message. Until they reply, the approved follow-up template is the only thing we can send.
              </div>
              <div className="flex gap-2.25 mt-2.5">
                <BtnSm disabled={sending} onClick={() => send('template')}>
                  {sending ? 'Sending…' : `Send the ${completed ? 'completion' : 'follow-up'} template`}
                </BtnSm>
                <BtnSm variant="outline" onClick={onClose}>Close</BtnSm>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
