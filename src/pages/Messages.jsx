import { useState } from 'react'
import PageHead from '../components/PageHead.jsx'
import Card from '../components/Card.jsx'
import Avatar from '../components/Avatar.jsx'
import Badge from '../components/Badge.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ChatPanel from '../components/ChatPanel.jsx'
import { fmtPhone, fmtDate, fmtTime } from '../lib/format.js'

// Relative-ish timestamp: the time for today, the date before that. Matches
// how the rest of the app shows dates (day-month-year) without inventing a
// second convention for "3 hours ago".
const whenLabel = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const today = new Date().toDateString() === d.toDateString()
  return today ? fmtTime(ts) : fmtDate(ts.slice(0, 10))
}

export default function Messages({ conversations, people, refresh }) {
  const [chat, setChat] = useState(null)

  return (
    <>
      <PageHead
        title="Messages"
        sub="Every WhatsApp conversation with the church's number, whatever stage someone is at."
      />
      <Card className="mb-0">
        {conversations.length === 0 && <EmptyState>No conversations yet.</EmptyState>}
        {conversations.map((c) => {
          const unread = Number(c.unread || 0)
          const prog = people.find((p) => p.id === c.person_id)
          return (
            <button
              key={c.person_id || c.phone}
              type="button"
              disabled={!c.person_id}
              onClick={() => setChat({
                id: c.person_id,
                full_name: c.full_name,
                phone: c.phone,
                completed: prog?.steps_done === 4,
              })}
              className="w-full text-left flex gap-3.25 py-3.75 border-b border-[#ECE7DA] last:border-b-0 items-start flex-wrap hover:bg-row-hover disabled:hover:bg-transparent disabled:cursor-default"
            >
              <Avatar name={c.full_name || '?'} />
              <div className="flex-1 min-w-55">
                <div className={`text-[13px] text-ink-deep ${unread ? 'font-black' : 'font-extrabold'}`}>
                  {c.full_name || fmtPhone(c.phone)}
                  {!c.person_id && <Badge variant="navy">Not on file</Badge>}
                </div>
                <div className={`text-[12px] mt-0.5 truncate ${unread ? 'text-ink font-semibold' : 'text-muted-label'}`}>
                  {c.last_direction === 'out' ? 'You: ' : ''}{c.last_body || ''}
                </div>
              </div>
              <div className="ml-auto flex-none text-right">
                <div className="font-mono text-[10.5px] text-muted-label">{whenLabel(c.last_at)}</div>
                {unread > 0 && (
                  <span className="inline-block mt-1 bg-orange text-white rounded-full py-0.25 px-2 text-[10.5px] font-bold">
                    {unread}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </Card>

      {chat && (
        <ChatPanel
          person={chat}
          completed={chat.completed}
          onClose={() => { setChat(null); refresh() }}
          onSent={refresh}
        />
      )}
    </>
  )
}
