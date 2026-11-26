import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { usePolling } from './usePolling.js'

const DAY = 86400000

// Messaging: what the church's WhatsApp number sent automatically, how each
// send fared (status comes back from Meta through whatsapp-webhook), who
// wrote back, and the follow-ups still queued to send. Director and
// leadership only; Follow Up reaches conversations through its contacts.
export function useMessaging(me) {
  const [sent, setSent] = useState([])
  const [inbound, setInbound] = useState([])
  const [queued, setQueued] = useState([])
  const [conversations, setConversations] = useState([])
  const enabled = !!me && me.role !== 'support'

  const load = useCallback(async () => {
    if (!enabled) return
    const since = new Date(Date.now() - 35 * DAY).toISOString()
    const [out, inn, q, conv] = await Promise.all([
      supabase.from('whatsapp_messages')
        .select('id, person_id, phone, template_name, body, status, error, created_at, people(full_name, source)')
        .eq('direction', 'out').gte('created_at', since).order('created_at', { ascending: false }).limit(400),
      supabase.from('whatsapp_messages')
        .select('person_id, phone, body, created_at').eq('direction', 'in').gte('created_at', since).order('created_at', { ascending: false }).limit(1000),
      supabase.from('followups')
        .select('id, type, created_at, checkins(step), people(id, full_name, phone)')
        .eq('status', 'pending').order('created_at', { ascending: false }).limit(60),
      supabase.from('v_wa_conversations')
        .select('person_id, phone, full_name, last_at, last_in_at, unread, last_body, last_direction')
        .order('last_at', { ascending: false }).limit(100),
    ])
    setSent(out.data || [])
    setInbound(inn.data || [])
    setQueued(q.data || [])
    setConversations(conv.data || [])
  }, [enabled])

  useEffect(() => { load() }, [load])
  usePolling(load, { enabled })

  const unreadCount = conversations.filter((c) => Number(c.unread || 0) > 0).length
  return { sent, inbound, queued, conversations, unreadCount, refresh: load }
}
