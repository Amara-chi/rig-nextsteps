import { useCallback, useRef, useState } from 'react'

// Ports the old toast()/toastTimer closure pattern. Callers pass an HTML
// string (e.g. with a <b> tag for emphasis) exactly like the old
// toast(html) calls did — Toast.jsx renders it the same way, verbatim.
export function useToast() {
  const [html, setHtml] = useState('')
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  // Optional duration: most toasts are a glance, but one that carries a
  // password the director has to copy needs to stay up.
  const toast = useCallback((message, ms = 2600) => {
    setHtml(message)
    setVisible(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), ms)
  }, [])

  return { html, visible, toast }
}
