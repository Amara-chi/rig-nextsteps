import { useState } from 'react'
import Card from './Card.jsx'
import Badge from './Badge.jsx'
import Avatar from './Avatar.jsx'
import NotesThread from './NotesThread.jsx'
import EmptyState from './EmptyState.jsx'
import ChatPanel from './ChatPanel.jsx'
import { fmtPhone, fmtWhen } from '../lib/format.js'

const linkBtnClass = 'inline-flex items-center gap-1.5 px-4 py-2.25 rounded-[10px] font-bold text-[12.5px] whitespace-nowrap bg-white border-[1.5px] border-line text-ink hover:border-orange hover:text-orange'

function badgeFor(p, context) {
  if (context === 'hc') return ['orange', 'House church interested']
  return p.member_since ? ['green', 'Member'] : ['navy', 'Membership pipeline']
}

// Shared by the House Church and Membership Support pages — same
// v_support_people row shape, same notes thread, same contact actions,
// differing only in which independent boolean selects them and which badge
// shows. (Support's Follow Up page is the Follow-Up Centre itself since
// 12 Oct 2026, see SupportFollowUp.jsx.)
//
// conversations (from useMessages) lets every row say where the WhatsApp
// thread stands — new replies, the last thing said, when — so support can
// see what is going on without opening each chat. refreshMessages keeps the
// nav badge honest once a chat has been read.
export default function SupportPersonList({ list, context, hadError, refresh, conversations = [], refreshMessages }) {
  const [chatPerson, setChatPerson] = useState(null)

  if (hadError) return <Card className="mb-0"><EmptyState>Couldn't load — check your access.</EmptyState></Card>

  return (
    <>
      <Card className="mb-0">
        {list.length ? list.map((p) => {
          const [bc, bt] = badgeFor(p, context)
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
                  <a href={`tel:+${p.phone}`} className={linkBtnClass}>Call</a>
                  {chatBtn}
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
    </>
  )
}
