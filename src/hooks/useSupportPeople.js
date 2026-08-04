import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { usePolling } from './usePolling.js'

// Support role's own data source — v_support_people exposes independent
// booleans (is_house_church/is_membership/is_awaiting_followup/is_noshow),
// not a single priority-ordered category, so one person can appear on more
// than one of the 3 support pages at once. Polled every 10s like the old
// refreshLive(), unlike useAppData which explicitly excludes this role.
export function useSupportPeople(me) {
  const [list, setList] = useState([])
  const [hadError, setHadError] = useState(false)

  const load = useCallback(async () => {
    if (!me || me.role !== 'support') return
    const { data, error } = await supabase.from('v_support_people').select('*').order('full_name')
    setList(data || [])
    setHadError(!!error)
  }, [me])

  useEffect(() => { load() }, [load])

  usePolling(load, { enabled: me?.role === 'support' })

  return {
    hc: list.filter((p) => p.is_house_church),
    followup: list.filter((p) => p.is_awaiting_followup || p.is_noshow),
    membership: list.filter((p) => p.is_membership),
    hadError,
    refresh: load,
  }
}
