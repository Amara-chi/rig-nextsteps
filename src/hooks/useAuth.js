import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

// Read once, before supabase-js processes and clears the URL hash — an
// invite or password-reset link lands here as #access_token=...&type=invite
// (or type=recovery), and that's the only way to tell "just signed up" apart
// from a normal returning sign-in.
const initialAuthLinkType = (window.location.hash.match(/[#&]type=(\w+)/) || [])[1] || null

// status: 'booting' | 'loggedOut' | 'needsSetPassword' | 'loggedIn'
export function useAuth() {
  const [status, setStatus] = useState('booting')
  const [me, setMe] = useState(null)
  const [authLinkType, setAuthLinkType] = useState(initialAuthLinkType)

  const boot = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setStatus('loggedOut')
      return
    }
    if (authLinkType === 'invite' || authLinkType === 'recovery') {
      setStatus('needsSetPassword')
      return
    }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    const resolvedMe = profile || { role: 'leader', full_name: session.user.email }
    if (!resolvedMe.full_name) resolvedMe.full_name = session.user.email
    setMe(resolvedMe)
    setStatus('loggedIn')
  }, [authLinkType])

  useEffect(() => {
    boot()
  }, [boot])

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error }
    await boot()
    return {}
  }, [boot])

  // Sends a recovery-link email; the link lands back here with
  // type=recovery, which boot() above already routes to needsSetPassword.
  const requestReset = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    })
    return { error }
  }, [])

  const setPassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error }
    setAuthLinkType(null)
    history.replaceState(null, '', window.location.pathname)
    await boot()
    return {}
  }, [boot])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    location.reload()
  }, [])

  return { status, me, authLinkType, signIn, requestReset, setPassword, signOut, refresh: boot }
}
