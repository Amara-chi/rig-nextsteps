import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { usePolling } from './usePolling.js'
import { todayStr } from '../lib/format.js'

// Centralizes the old refreshAll()/refreshLive() pattern: people and
// openSession are shared across several panes (Today, People, Check-in), so
// they're fetched once here rather than duplicated per-pane. Support role
// gets none of this (its own hook covers its 3 panes' narrower data), same
// early-exit as the old refreshAll()/refreshLive(). The "video restarts every
// 10s" fix doesn't live here — it's a key prop on the session pane's video
// subtree (keyed by openSession?.id), so a new openSession object every poll
// doesn't remount it unless the id actually changes. sessionFeed, unlike the
// video, DOES need to refresh every poll regardless — matches the old
// refreshLive()'s unconditional renderSessionFeed() call.
export function useAppData(me) {
  const [people, setPeople] = useState([])
  const [openSession, setOpenSession] = useState(null)
  const [todaysCheckins, setTodaysCheckins] = useState([])
  const [sessionFeed, setSessionFeed] = useState([])

  const loadPeople = useCallback(async () => {
    const { data, error } = await supabase.from('v_people_progress').select('*').order('last_seen', { ascending: false, nullsFirst: false })
    if (!error) setPeople(data || [])
  }, [])

  const loadOpenSession = useCallback(async () => {
    const { data } = await supabase.from('sessions').select('*').eq('session_date', todayStr()).eq('is_open', true).order('created_at', { ascending: false }).limit(1)
    const session = (data && data[0]) || null
    setOpenSession(session)
    return session
  }, [])

  const loadTodaysCheckins = useCallback(async () => {
    const { data } = await supabase
      .from('checkins')
      .select('id, step, created_at, person_id, people(full_name, first_time, heard_about, created_at)')
      .eq('checkin_date', todayStr())
      .order('created_at', { ascending: false })
    setTodaysCheckins(data || [])
  }, [])

  const loadSessionFeed = useCallback(async (sessionId) => {
    if (!sessionId) { setSessionFeed([]); return }
    const { data } = await supabase
      .from('checkins')
      .select('step, created_at, people(full_name, created_at)')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
    setSessionFeed(data || [])
  }, [])

  const loadAll = useCallback(async () => {
    if (!me || me.role === 'support') return
    const [, session] = await Promise.all([loadPeople(), loadOpenSession(), loadTodaysCheckins()])
    await loadSessionFeed(session?.id)
  }, [me, loadPeople, loadOpenSession, loadTodaysCheckins, loadSessionFeed])

  useEffect(() => { loadAll() }, [loadAll])

  usePolling(loadAll, { enabled: !!me && me.role !== 'support' })

  return { people, openSession, todaysCheckins, sessionFeed, refreshAll: loadAll }
}
