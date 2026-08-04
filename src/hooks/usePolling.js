import { useEffect, useRef } from 'react'

// Generic setInterval wrapper matching the old refreshLive() pattern: skips
// a tick when the tab isn't visible, cleans up on unmount.
export function usePolling(fn, { intervalMs = 10000, enabled = true } = {}) {
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => {
      if (document.hidden) return
      fnRef.current()
    }, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, enabled])
}
