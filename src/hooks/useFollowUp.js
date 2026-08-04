import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

const STATUS_LABEL = { sent: 'Message sent', called: 'Called', texted: 'Texted', door_open: 'Door open' }

// Not part of useAppData's 10s poll — the old app only loaded this at boot
// (refreshAll) and re-loaded it manually after specific actions, never on
// the refreshLive() timer. Lifted to App.jsx (like useAppData) rather than
// called from FollowUp.jsx directly, since the sidebar's follow-up count
// badge needs the "attended" list's length regardless of which pane is
// currently visible.
export function useFollowUp(me, people) {
  const [attended, setAttended] = useState([])
  const [awaiting, setAwaiting] = useState([])

  const load = useCallback(async () => {
    if (!me || me.role === 'support') return
    const { data } = await supabase
      .from('followups')
      .select('id, status, created_at, checkins(step), people(id, full_name, phone)')
      .eq('type', 'attended').eq('status', 'pending').order('created_at', { ascending: false }).limit(60)
    setAttended(data || [])

    const { data: wdata } = await supabase
      .from('followups')
      .select('id, status, updated_at, outcome, checkins(step), people(id, full_name, phone)')
      .eq('type', 'attended').in('status', ['sent', 'called', 'texted']).is('outcome', null)
      .order('updated_at', { ascending: false }).limit(60)
    setAwaiting(wdata || [])
  }, [me])

  useEffect(() => { load() }, [load])

  const noshows = (() => {
    const now = new Date()
    const lastSunday = new Date(now)
    lastSunday.setDate(now.getDate() - now.getDay())
    lastSunday.setHours(0, 0, 0, 0)
    return people.filter((p) => p.steps_done > 0 && p.steps_done < 4 && p.last_seen && new Date(p.last_seen) < lastSunday).slice(0, 25)
  })()

  return { attended, awaiting, noshows, refresh: load, STATUS_LABEL }
}
