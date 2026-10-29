import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { usePolling } from './usePolling.js'

// Follow Up's data for every role: the contacts in its care (v_contacts,
// which also decides who each role may see), the outcomes logged against
// them (v_outcomes), and staff names for caller badges and pickers.
// Lifted to App.jsx because the dashboard, Contacts, Outcomes, Membership,
// House Church and Today all read the same lists, and the nav badge needs
// the waiting count whichever pane is open.
export function useFollowUpData(me) {
  const [contacts, setContacts] = useState([])
  const [outcomes, setOutcomes] = useState([])
  const [staff, setStaff] = useState([])
  const [hadError, setHadError] = useState(false)
  const enabled = !!me

  const load = useCallback(async () => {
    if (!enabled) return
    const [c, o] = await Promise.all([
      supabase.from('v_contacts').select('*').order('full_name'),
      supabase.from('v_outcomes').select('*').order('created_at', { ascending: false }).limit(400),
    ])
    setContacts(c.data || [])
    setOutcomes(o.data || [])
    setHadError(!!(c.error || o.error))
  }, [enabled])

  const loadStaff = useCallback(async () => {
    if (!enabled) return
    const { data } = await supabase.rpc('staff_names')
    setStaff(data || [])
  }, [enabled])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadStaff() }, [loadStaff])
  usePolling(load, { enabled })

  return { contacts, outcomes, staff, hadError, refresh: load }
}
