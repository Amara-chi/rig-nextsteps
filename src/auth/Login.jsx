import { useState } from 'react'
import AuthShell from './AuthShell.jsx'
import Field, { TextInput } from '../components/Field.jsx'
import PasswordField from '../components/PasswordField.jsx'
import Btn from '../components/Btn.jsx'

export default function Login({ onSignIn, onRequestReset }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [showError, setShowError] = useState(false)
  const [mode, setMode] = useState('signin') // 'signin' | 'reset'
  const [resetSending, setResetSending] = useState(false)
  const [resetError, setResetError] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const signIn = async () => {
    setSigningIn(true)
    setShowError(false)
    const { error } = await onSignIn(email.trim(), password)
    setSigningIn(false)
    if (error) setShowError(true)
  }

  const sendReset = async () => {
    if (!email.trim()) return
    setResetSending(true)
    setResetError(false)
    const { error } = await onRequestReset(email.trim())
    setResetSending(false)
    if (error) { setResetError(true); return }
    setResetSent(true)
  }

  if (mode === 'reset') {
    return (
      <AuthShell>
        <h1 className="text-[30px] font-black tracking-[-.03em] text-ink-deep mt-5.5 leading-[1.05]">Reset password.</h1>
        <div className="text-muted-sub text-[13.5px] mt-1.5">
          Enter your email and we'll send you a link to set a new password.
        </div>
        <Field label="Email" htmlFor="r-email">
          <TextInput
            id="r-email"
            type="email"
            autoComplete="username"
            placeholder="you@rigchurchlagos.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendReset() }}
          />
        </Field>
        <Btn className="mt-4.5" disabled={resetSending} onClick={sendReset}>
          {resetSending ? 'Sending…' : 'Send reset link'}
        </Btn>
        {resetSent && (
          <div className="mt-3 py-2.75 px-3.5 rounded-[11px] bg-cream text-ink-deep text-[12.5px] font-semibold">
            Check your email (and spam folder) for the reset link.
          </div>
        )}
        {resetError && (
          <div className="mt-3 py-2.75 px-3.5 rounded-[11px] bg-orange-soft text-orange-deep text-[12.5px] font-semibold">
            Couldn't send the reset email. Please check the address and try again.
          </div>
        )}
        <div className="text-center mt-3.5">
          <button type="button" className="text-[12.5px] text-muted-sub" onClick={() => { setMode('signin'); setResetSent(false); setResetError(false) }}>
            Back to sign in
          </button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <h1 className="text-[30px] font-black tracking-[-.03em] text-ink-deep mt-5.5 leading-[1.05]">Team sign in.</h1>
      <div className="text-muted-sub text-[13.5px] mt-1.5">
        For church staff: Next Steps, Follow Up and leadership. Visitors don't need an account — they use the QR code.
      </div>
      <Field label="Email" htmlFor="l-email">
        <TextInput
          id="l-email"
          type="email"
          autoComplete="username"
          placeholder="you@rigchurchlagos.org"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <PasswordField
        label="Password"
        htmlFor="l-pass"
        autoComplete="current-password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') signIn() }}
      />
      <Btn className="mt-4.5" disabled={signingIn} onClick={signIn}>
        {signingIn ? 'Signing in…' : 'Sign in'}
      </Btn>
      {showError && (
        <div className="mt-3 py-2.75 px-3.5 rounded-[11px] bg-orange-soft text-orange-deep text-[12.5px] font-semibold">
          That email or password didn't match. Please try again.
        </div>
      )}
      <div className="text-center mt-3.5">
        <button type="button" className="text-[12.5px] text-muted-sub" onClick={() => { setMode('reset'); setResetSent(false); setResetError(false) }}>
          Forgot password?
        </button>
      </div>
    </AuthShell>
  )
}
