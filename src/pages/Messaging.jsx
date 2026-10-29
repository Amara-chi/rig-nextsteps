import { useMemo, useState } from 'react'
import PageHead, { Breadcrumb } from '../components/PageHead.jsx'
import Card, { CardHead } from '../components/Card.jsx'
import Avatar from '../components/Avatar.jsx'
import Badge from '../components/Badge.jsx'
import BtnSm from '../components/BtnSm.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ChatPanel from '../components/ChatPanel.jsx'
import { Chips, Stat } from '../components/followup.jsx'
import { useMe } from '../context/MeContext.jsx'
import { useAppToast } from '../context/ToastContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { sendWhatsApp } from '../lib/whatsapp.js'
import { fillMsg, fmtPhone, fmtTime, fmtWhen } from '../lib/format.js'
import { MESSAGE_TEMPLATES, MSG_ATTENDED, MSG_COMPLETED, MSG_NOSHOW, templateKeyOf } from '../config/site.js'

const th = 'py-1.5 px-2 pb-2.5 font-semibold border-b border-[#ECE7DA] text-left'
const td = 'py-2.75 px-2 border-b border-[#ECE7DA] align-middle'
const STATUS = { read: ['Read', 'green'], delivered: ['Delivered', 'green'], sent: ['Sent', 'navy'], failed: ['Failed', 'orange'], queued: ['Queued', 'grey'] }
const WINDOW_MS = 24 * 3600 * 1000
const templateName = (k) => (MESSAGE_TEMPLATES.find((t) => t.key === k) || {}).name

// Messaging is the automatic WhatsApp line: what the church's own number
// sent after Sunday, how WhatsApp says each one fared, and what people
// wrote back. No staff phone is involved. When a reply needs a person, it
// is passed to Follow Up rather than handled here.
export default function Messaging({ sent, inbound, queued, conversations, contacts, people, refresh, refreshContacts }) {
  const me = useMe()
  const toast = useAppToast()
  const isDirector = me?.role === 'director'
  const [tab, setTab] = useState('sent')
  const [filter, setFilter] = useState('all')
  const [chat, setChat] = useState(null)
  const [sendingId, setSendingId] = useState(null)

  const weekAgo = Date.now() - 7 * 86400000
  const week = sent.filter((m) => new Date(m.created_at).getTime() >= weekAgo)
  const stat = (s) => week.filter((m) => (s === 'delivered' ? ['delivered', 'read'].includes(m.status) : m.status === s)).length
  const waitingReplies = conversations.filter((c) => Number(c.unread) > 0 && c.last_in_at && Date.now() - new Date(c.last_in_at).getTime() < WINDOW_MS)
  const handed = useMemo(() => new Set(contacts.filter((c) => c.handed_over_at || c.reason === 'failed').map((c) => c.id)), [contacts])
  // Replies lists only people who actually wrote back; a conversation that is
  // only our own automatic message has nothing to answer or pass over.
  const replies = conversations.filter((c) => c.last_in_at)
  const repliedAfter = (m) => inbound.some((i) => i.person_id && i.person_id === m.person_id && new Date(i.created_at) > new Date(m.created_at))

  const rows = [
    ...queued.map((f) => ({ id: 'q' + f.id, queued: f, person_id: f.people?.id, name: f.people?.full_name, phone: f.people?.phone, key: f.type === 'noshow' ? 'noshow' : (people.find((p) => p.id === f.people?.id)?.steps_done === 4 ? 'completed' : 'attended'), status: 'queued', at: f.created_at, sub: f.checkins?.step ? `Step ${f.checkins.step}` : '' })),
    ...sent.filter((m) => m.template_name).map((m) => ({ id: m.id, person_id: m.person_id, name: m.people?.full_name || fmtPhone(m.phone), phone: m.phone, key: templateKeyOf(m.template_name), status: m.status || 'sent', error: m.error, at: m.created_at, msg: m })),
  ].filter((r) => filter === 'all' || (filter === 'failed' ? r.status === 'failed' : r.key === filter))

  const sendNow = async (r) => {
    const first = (r.name || '').split(' ')[0]
    const text = r.key === 'completed' ? fillMsg(MSG_COMPLETED, first, '') : r.key === 'noshow' ? fillMsg(MSG_NOSHOW, first, '') : fillMsg(MSG_ATTENDED, first, '')
    setSendingId(r.id)
    const res = await sendWhatsApp({ person_id: r.person_id, mode: 'template', template_key: r.key, display_text: text })
    setSendingId(null)
    if (!res.ok) { toast(res.error); return }
    await supabase.from('followups').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', r.queued.id)
    toast('Sent from the church number.')
    setTimeout(refresh, 800)
  }

  const passOver = async (c) => {
    const reason = c.last_direction === 'in' ? (c.last_body || '').slice(0, 280) : 'Wrote back to the church number.'
    const { error } = await supabase.from('people').update({ handed_over_at: new Date().toISOString(), handover_reason: reason }).eq('id', c.person_id)
    if (error) { toast("Couldn't pass that over. Check your access."); return }
    toast(`${c.full_name} passed to Follow Up. They are waiting on a call.`)
    refreshContacts?.()
  }

  return (
    <>
      <PageHead
        crumb={<Breadcrumb>Next Steps</Breadcrumb>}
        title="Messaging"
        sub="The WhatsApp messages the church's own number sends automatically after Sunday, and what people wrote back. No staff phone is involved here."
      />
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr))] mb-5.5">
        <Stat label="Sent this week" value={week.length} detail="From the church number" />
        <Stat label="Delivered" value={stat('delivered')} detail="WhatsApp confirmed" />
        <Stat label="Read" value={stat('read')} detail="Opened on WhatsApp" />
        <Stat label="Failed" value={stat('failed')} detail="Passed to Follow Up" />
        <Stat label="Waiting on us" value={waitingReplies.length} detail="Unread, window still open" />
      </div>

      <div role="tablist" aria-label="Messaging" className="flex gap-0.5 border-b-2 border-line mb-4.5">
        {[['sent', `What went out · ${rows.length}`], ['replies', `Replies · ${replies.length}`]].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`min-h-11.5 px-4 -mb-0.5 font-bold text-[13.5px] border-b-3 ${tab === k ? 'text-ink-deep border-orange' : 'text-muted-sub border-transparent'}`}>{l}</button>
        ))}
      </div>

      {tab === 'sent' && (
        <div className="flex flex-col gap-4.5">
          <Card>
            <CardHead title="What went out" sub="One row per automatic send, newest first. The status comes back from WhatsApp itself." right={
              <Chips label="Filter by message" value={filter} onChange={setFilter} options={[['all', 'All'], ['attended', 'After a session'], ['completed', 'Finished all 4'], ['noshow', 'Missed a Sunday'], ['failed', 'Failed only']]} />
            } />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-170">
                <thead><tr className="font-mono text-[9.5px] tracking-widest uppercase text-muted-label">
                  <th className={th + ' pl-0'}>Person</th><th className={th}>Which message</th><th className={th}>Sent</th><th className={th}>WhatsApp says</th><th className={th + ' pr-0'}>What happened next</th>
                </tr></thead>
                <tbody>
                  {rows.map((r) => {
                    const [label, variant] = STATUS[r.status] || [r.status, 'grey']
                    const replied = r.msg && repliedAfter(r.msg)
                    return (
                      <tr key={r.id}>
                        <td className={td + ' pl-0'}>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={r.name} size={32} fontSize={11} />
                            <div>
                              <div className="text-[13px] font-extrabold text-ink-deep">{r.name}</div>
                              <div className="font-mono text-[11px] text-muted-body">{fmtPhone(r.phone)}{r.sub ? ` · ${r.sub}` : ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className={td + ' text-[12.5px] whitespace-nowrap'}>{templateName(r.key)}</td>
                        <td className={td + ' text-xs text-muted-body whitespace-nowrap'}>{fmtWhen(r.at)}, {fmtTime(r.at)}</td>
                        <td className={td}><Badge variant={variant}>{label}</Badge>{r.error && <div className="text-[11px] text-orange-deep mt-1 max-w-55">{r.error}</div>}</td>
                        <td className={td + ' pr-0 text-xs'}>
                          {r.queued ? (isDirector
                            ? <BtnSm disabled={sendingId === r.id} onClick={() => sendNow(r)}>{sendingId === r.id ? 'Sending…' : 'Send now'}</BtnSm>
                            : <span className="text-muted-faint">Waiting to send</span>)
                            : replied ? <button type="button" onClick={() => { setTab('replies') }} className="inline-flex items-center gap-1.5 py-1.75 px-3 rounded-[10px] border-[1.5px] border-line bg-white font-bold text-xs"><span className="w-1.75 h-1.75 rounded-full bg-orange" />They replied</button>
                            : handed.has(r.person_id) && r.status === 'failed' ? <Badge variant="navy">Passed to Follow Up</Badge>
                            : <span className="text-muted-faint">Nothing yet</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {!rows.length && <EmptyState>Nothing sent in the last five weeks.</EmptyState>}
          </Card>

          <Card>
            <CardHead title="The three messages it can send" sub="These are the exact words. WhatsApp (Meta) must approve each wording before the line is allowed to send it." />
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
              {MESSAGE_TEMPLATES.map((t) => (
                <div key={t.key} className="flex flex-col gap-2.5 p-4 border border-[#ECE7DA] rounded-xl">
                  <div className="flex items-start justify-between gap-2.5">
                    <div><div className="text-sm font-extrabold text-ink-deep">{t.name}</div><div className="text-[11.5px] text-muted-sub mt-0.5 leading-snug">{t.when}</div></div>
                    <Badge variant={t.approved ? 'green' : 'grey'}>{t.approved ? 'Approved' : 'Not yet approved'}</Badge>
                  </div>
                  <p className="text-[13px] leading-normal text-ink bg-row-hover rounded-[10px] py-3 px-3.5">{t.text}</p>
                  {!t.approved && <div className="text-xs text-muted-label">Cannot send until WhatsApp approves this wording.</div>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'replies' && (
        <Card>
          <CardHead title="People who wrote back" sub="One shared inbox for the church number: whoever opens a chat marks it read for everyone. WhatsApp lets us write freely for 24 hours after their last message; after that, only an approved template can go." />
          {replies.map((c) => {
            const unread = Number(c.unread || 0) > 0
            const left = c.last_in_at ? Math.ceil((WINDOW_MS - (Date.now() - new Date(c.last_in_at).getTime())) / 3600000) : 0
            const passed = c.person_id && contacts.some((x) => x.id === c.person_id && x.handed_over_at)
            return (
              <div key={c.person_id || c.phone} className="flex items-center gap-3 py-3.25 border-b border-[#ECE7DA] last:border-b-0 flex-wrap">
                <Avatar name={c.full_name || '?'} />
                <div className="flex-1 min-w-55">
                  <div className="flex items-center gap-2 flex-wrap">
                    {unread && <span className="w-2 h-2 rounded-full bg-orange" aria-label="Unread" />}
                    <span className={`text-[13.5px] text-ink-deep ${unread ? 'font-black' : 'font-extrabold'}`}>{c.full_name || fmtPhone(c.phone)}</span>
                    <span className="font-mono text-[11px] text-muted-body">{fmtPhone(c.phone)}</span>
                    {!c.person_id && <Badge variant="navy">Not on file</Badge>}
                  </div>
                  <div className={`text-[13px] mt-0.75 leading-snug ${unread ? 'text-ink font-semibold' : 'text-muted-body'}`}>{c.last_direction === 'out' ? 'Church: ' : ''}“{c.last_body || ''}”</div>
                  <div className="font-mono text-[10.5px] text-muted-label mt-0.75">{fmtWhen(c.last_at)}, {fmtTime(c.last_at)}</div>
                </div>
                <Badge variant={left > 0 ? 'green' : 'grey'}>{left > 0 ? `Can reply for ${left}h` : 'Window closed: template only'}</Badge>
                <div className="flex gap-1.5">
                  {c.person_id && <BtnSm onClick={() => setChat({ id: c.person_id, full_name: c.full_name, phone: c.phone, completed: people.find((p) => p.id === c.person_id)?.steps_done === 4 })}>Open chat</BtnSm>}
                  {isDirector && c.person_id && !passed && <BtnSm variant="outline" onClick={() => passOver(c)}>Pass to Follow Up</BtnSm>}
                  {passed && <Badge variant="navy">Passed to Follow Up</Badge>}
                </div>
              </div>
            )
          })}
          {!replies.length && <EmptyState>Nobody has written back yet.</EmptyState>}
        </Card>
      )}

      {chat && <ChatPanel person={chat} completed={chat.completed} onClose={() => setChat(null)} onSent={refresh} onRead={refresh} />}
    </>
  )
}
