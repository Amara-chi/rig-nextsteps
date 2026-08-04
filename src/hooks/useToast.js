import { useCallback, useRef, useState } from 'react'

// Ports the old toast()/toastTimer closure pattern. Callers pass an HTML
// string (e.g. with a <b> tag for emphasis) exactly like the old
// toast(html) calls did — Toast.jsx renders it the same way, verbatim.
export function useToast() {
  const [html, setHtml] = useState('')
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  const toast = useCallback((message) => {
    setHtml(message)
    setVisible(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), 2600)
  }, [])

  return { html, visible, toast }
}
