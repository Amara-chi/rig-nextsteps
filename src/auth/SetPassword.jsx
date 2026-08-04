import { useState } from 'react'
import AuthShell from './AuthShell.jsx'
import PasswordField from '../components/PasswordField.jsx'
import Btn from '../components/Btn.jsx'

export default function SetPassword({ authLinkType, onSetPassword }) {
  const [pass1, setPass1] = useState('')
  const [pass2, setPass2] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isRecovery = authLinkType === 'recovery'

  const submit = async () => {
    setError(null)
    if (pass1.length < 8 || pass1 !== pass2) {
      setError('Passwords must match and be at least 8 characters.')
      return
    }
    setSaving(true)
    const { error: err } = await onSetPassword(pass1)
    setSaving(false)
    if (err) setError(err.message || "Couldn't set that password — try again.")
  }

  return (
    <AuthShell>
      <h1 className="text-[30px] font-black tracking-[-.03em] text-ink-deep mt-5.5 leading-[1.05]">
        {isRecovery ? 'Reset your password.' : 'Welcome to the team.'}
      </h1>
      <div className="text-muted-sub text-[13.5px] mt-1.5">
        {isRecovery
          ? 'Choose a new password to finish signing in.'
          : 'Rig Church Lagos · Next Steps has invited you. Set a password to finish signing in.'}
      </div>
      <PasswordField
        label="Choose a password"
        htmlFor="sp-pass"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        value={pass1}
        onChange={(e) => setPass1(e.target.value)}
      />
      <PasswordField
        label="Confirm password"
        htmlFor="sp-pass2"
        autoComplete="new-password"
        placeholder="••••••••"
        value={pass2}
        onChange={(e) => setPass2(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
      />
      <Btn className="mt-4.5" disabled={saving} onClick={submit}>
        {saving ? 'Saving…' : 'Set password & continue'}
      </Btn>
      {error && (
        <div className="mt-3 py-2.75 px-3.5 rounded-[11px] bg-orange-soft text-orange-deep text-[12.5px] font-semibold">
          {error}
        </div>
      )}
    </AuthShell>
  )
}
