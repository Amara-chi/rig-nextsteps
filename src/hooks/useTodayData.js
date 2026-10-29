import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

// The extra history Today's charts need that no other pane loads: check-in
// dates for the last couple of months, and the attended follow-ups behind
// the "reached within 7 days" ring. Loaded once, then on each visit.
export function useTodayData(me) {
  const [checkinDates, setCheckinDates] = useState([])
  const [followups, setFollowups] = useState([])
  const enabled = !!me && me.role !== 'support'

  const load = useCallback(async () => {
    if (!enabled) return
    const since = new Date(Date.now() - 70 * 86400000).toISOString().slice(0, 10)
    const [c, f] = await Promise.all([
      supabase.from('checkins').select('checkin_date').gte('checkin_date', since).limit(5000),
      supabase.from('followups').select('id, type, status, created_at, updated_at').gte('created_at', since).limit(2000),
    ])
    setCheckinDates((c.data || []).map((r) => r.checkin_date))
    setFollowups(f.data || [])
  }, [enabled])

  useEffect(() => { load() }, [load])
  return { checkinDates, followups, refresh: load }
}
