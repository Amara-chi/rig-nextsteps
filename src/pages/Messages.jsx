import { useMemo, useState } from 'react'
import PageHead from '../components/PageHead.jsx'
import Card from '../components/Card.jsx'
import Avatar from '../components/Avatar.jsx'
import Badge from '../components/Badge.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ChatPanel from '../components/ChatPanel.jsx'
import { TextInput } from '../components/Field.jsx'
import { fmtPhone, fmtWhen } from '../lib/format.js'

// Everyone on file, like a WhatsApp contact list, with the church's
// conversation where there is one (org decision, 12 Oct 2026): before
// this the pane showed only people who had already been messaged, so
// starting a conversation with anyone else meant finding them on another
// page first. Conversations sort to the top by latest activity, then
// everyone else by name. A message from a number not on file still shows,
// grouped by phone, so a stranger's text is never orphaned.
//
// people is whichever list the caller can read: useAppData's for
// director/leader, v_support_people for support (whose conversation rows
// carry no name of their own, see useMessages).
export default function Messages({ conversations, people, refresh, sub = "Everyone on file, with the church's WhatsApp conversation where there is one." }) {
  const [chat, setChat] = useState(null)
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const byPerson = new Map(conversations.filter((c) => c.person_id).map((c) => [c.person_id, c]))
    const withChat = conversations.map((c) => {
      const p = c.person_id ? people.find((x) => x.id === c.person_id) : null
      return { ...c, full_name: c.full_name || p?.full_name || null, completed: p?.steps_done === 4, hasChat: true }
    })
    const rest = people
      .filter((p) => !byPerson.has(p.id))
      .map((p) => ({ person_id: p.id, phone: p.phone, full_name: p.full_name, completed: p.steps_done === 4, unread: 0, hasChat: false }))
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
    const all = [...withChat, ...rest]
    const needle = q.trim().toLowerCase()
    if (!needle) return all
    const digits = needle.replace(/\D/g, '')
    return all.filter((r) =>
      (r.full_name || '').toLowerCase().includes(needle) ||
      (digits && (r.phone || '').includes(digits)) ||
      fmtPhone(r.phone).replace(/\s/g, '').includes(digits || '\u0000'))
  }, [conversations, people, q])

  const chatCount = conversations.length

  return (
    <>
      <PageHead title="Messages" sub={sub} />
      <div className="mb-4">
        <TextInput
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${people.length} people by name or number…`}
        />
      </div>
      <Card className="mb-0">
        {rows.length === 0 && <EmptyState>{q ? 'No one matches that.' : 'No one on file yet.'}</EmptyState>}
        {rows.map((c, i) => {
          const unread = Number(c.unread || 0)
          const firstQuiet = !q && c.hasChat === false && (i === 0 || rows[i - 1].hasChat)
          return (
            <div key={c.person_id || c.phone}>
              {firstQuiet && chatCount > 0 && (
                <div className="font-mono text-[10px] tracking-[.08em] uppercase text-muted-label font-semibold pt-4 pb-1">
                  Not messaged yet
                </div>
              )}
              <button
                type="button"
                disabled={!c.person_id}
                onClick={() => setChat({ id: c.person_id, full_name: c.full_name, phone: c.phone, completed: c.completed })}
                className="w-full text-left flex gap-3.25 py-3.75 border-b border-[#ECE7DA] last:border-b-0 items-start flex-wrap hover:bg-row-hover disabled:hover:bg-transparent disabled:cursor-default"
              >
                <Avatar name={c.full_name || '?'} />
                <div className="flex-1 min-w-55">
                  <div className={`text-[13px] text-ink-deep ${unread ? 'font-black' : 'font-extrabold'}`}>
                    {c.full_name || fmtPhone(c.phone)}
                    {!c.person_id && <Badge variant="navy">Not on file</Badge>}
                  </div>
                  {c.hasChat ? (
                    <div className={`text-[12px] mt-0.5 truncate ${unread ? 'text-ink font-semibold' : 'text-muted-label'}`}>
                      {c.last_direction === 'out' ? 'You: ' : ''}{c.last_body || ''}
                    </div>
                  ) : (
                    <div className="text-[12px] mt-0.5 text-muted-label">{fmtPhone(c.phone)} · no messages yet</div>
                  )}
                </div>
                <div className="ml-auto flex-none text-right">
                  <div className="font-mono text-[10.5px] text-muted-label">{c.hasChat ? fmtWhen(c.last_at) : ''}</div>
                  {unread > 0 && (
                    <span className="inline-block mt-1 bg-orange text-white rounded-full py-0.25 px-2 text-[10.5px] font-bold">
                      {unread}
                    </span>
                  )}
                </div>
              </button>
            </div>
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
