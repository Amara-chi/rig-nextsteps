import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { usePolling } from './usePolling.js'

// Every WhatsApp conversation, newest activity first, for the Messages pane
// and the unread badge on the nav. Deliberately not scoped to the follow-up
// lifecycle: a reply from someone whose outcome was logged weeks ago still
// has to be seen, which is the whole reason this pane exists.
//
// Support accounts don't get this pane — they reach conversations through
// their own three pages — so this doesn't load for them.
export function useMessages(me) {
  const [conversations, setConversations] = useState([])
  const enabled = !!me && me.role !== 'support'

  const load = useCallback(async () => {
    if (!enabled) return
    const { data } = await supabase
      .from('v_wa_conversations')
      .select('person_id, phone, full_name, last_at, last_in_at, unread, last_body, last_direction')
      .order('last_at', { ascending: false })
      .limit(100)
    setConversations(data || [])
  }, [enabled])

  useEffect(() => { load() }, [load])
  usePolling(load, { enabled })

  const unreadTotal = conversations.reduce((n, c) => n + Number(c.unread || 0), 0)
  const unreadCount = conversations.filter((c) => Number(c.unread || 0) > 0).length

  return { conversations, unreadTotal, unreadCount, refresh: load }
}
