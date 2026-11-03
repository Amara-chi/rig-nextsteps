import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { usePolling } from './usePolling.js'

// Bible Study series and sessions. Polled slowly: the upload page refreshes
// its own copy, but another computer already open on the platform would
// otherwise never see a new session or resource until it reloaded. RLS
// hides drafts from leadership, so the same query serves both roles.
export function useBibleStudy(me) {
  const [series, setSeries] = useState([])
  const [sessions, setSessions] = useState([])
  const [loaded, setLoaded] = useState(false)
  const enabled = !!me && me.role !== 'support'

  const load = useCallback(async () => {
    if (!enabled) return
    const [s, v] = await Promise.all([
      supabase.from('bs_series').select('*').order('starts_on', { ascending: false, nullsFirst: false }).order('title'),
      supabase.from('bs_sessions').select('*').order('number', { ascending: true, nullsFirst: false }),
    ])
    setSeries(s.data || [])
    setSessions(v.data || [])
    setLoaded(true)
  }, [enabled])

  useEffect(() => { load() }, [load])
  usePolling(load, { intervalMs: 30000, enabled })
  return { series, sessions, loaded, refresh: load }
}

// YouTube id from any of the usual link shapes.
export function youtubeId(url) {
  const m = (url || '').match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

export const youtubeThumb = (url) => {
  const id = youtubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : ''
}

// mm:ss or h:mm:ss to seconds, for timestamped links into the video.
export function toSeconds(t) {
  const p = (t || '').split(':').map(Number)
  if (p.some((n) => Number.isNaN(n))) return 0
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : p[0] || 0
}
