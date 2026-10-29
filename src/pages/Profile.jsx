import { useState } from 'react'
import PageHead from '../components/PageHead.jsx'
import Card, { CardHead } from '../components/Card.jsx'
import Badge from '../components/Badge.jsx'
import Avatar from '../components/Avatar.jsx'
import Field, { TextInput } from '../components/Field.jsx'
import PasswordField from '../components/PasswordField.jsx'
import Btn from '../components/Btn.jsx'
import { useMe } from '../context/MeContext.jsx'
import { useAppToast } from '../context/ToastContext.jsx'
import { supabase } from '../lib/supabaseClient.js'

const ROLE_LABEL = { director: 'Admin', leader: 'Leader', support: 'Follow Up' }
const ROLE_BADGE = { director: 'orange', leader: 'navy', support: 'grey' }
const ROLE_DETAIL = {
  director: 'Full access — can manage people, sessions, reports, and the team.',
  leader: 'Read-only — sees everyone, can add notes, cannot change records.',
  support: 'Follow Up — contacts, calls and outcomes. You can add contacts, log calls, and edit or delete the outcomes you logged.',
}

export default function Profile({ onDataChange }) {
  const me = useMe()
  const toast = useAppToast()

  const [name, setName] = useState(me?.full_name || '')
  const [savingName, setSavingName] = useState(false)

  const [pass1, setPass1] = useState('')
  const [pass2, setPass2] = useState('')
  const [savingPass, setSavingPass] = useState(false)

  const saveName = async () => {
    const full_name = name.trim()
    if (!full_name) { toast('Enter your name.'); return }
    setSavingName(true)
    const { error } = await supabase.from('profiles').update({ full_name }).eq('id', me.id)
    setSavingName(false)
    if (error) { toast("Couldn't save — check your access."); return }
    toast('Name updated.')
    onDataChange?.()
  }

  const savePassword = async () => {
    if (pass1.length < 8 || pass1 !== pass2) {
      toast('Passwords must match and be at least 8 characters.')
      return
    }
    setSavingPass(true)
    const { error } = await supabase.auth.updateUser({ password: pass1 })
    setSavingPass(false)
    if (error) { toast(error.message || "Couldn't change your password."); return }
    setPass1(''); setPass2('')
    toast('Password changed.')
  }

  return (
    <>
      <PageHead title="Profile" sub="Your account — name, role, and password." />
      <div className="grid grid-cols-2 gap-4.5 max-tablet:grid-cols-1 max-w-165">
        <Card className="mb-0">
          <CardHead title="Your details" />
          <div className="flex items-center gap-3 mt-1">
            <Avatar name={me?.full_name} size={44} fontSize={15} />
            <div>
              <div className="font-black text-ink-deep">{me?.full_name || '—'}</div>
              <div className="text-[12.5px] text-muted-label">{me?.email}</div>
            </div>
            <Badge variant={ROLE_BADGE[me?.role]} className="ml-auto">{ROLE_LABEL[me?.role] || me?.role}</Badge>
          </div>
          <div className="text-[12.5px] text-muted-sub mt-3">{ROLE_DETAIL[me?.role]}</div>

          <Field label="Full name" htmlFor="p-name">
            <TextInput id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </Field>
          <div className="text-[11.5px] text-muted-label mt-1.5">
            Your role is set by an admin — see <b>Team</b> if it needs to change.
          </div>
          <Btn className="mt-4.5 w-auto! px-5" disabled={savingName} onClick={saveName}>
            {savingName ? 'Saving…' : 'Save name'}
          </Btn>
        </Card>

        <Card className="mb-0">
          <CardHead title="Change password" sub="You'll stay signed in on this device." />
          <PasswordField
            label="New password"
            htmlFor="p-pass1"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={pass1}
            onChange={(e) => setPass1(e.target.value)}
          />
          <PasswordField
            label="Confirm new password"
            htmlFor="p-pass2"
            autoComplete="new-password"
            placeholder="••••••••"
            value={pass2}
            onChange={(e) => setPass2(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') savePassword() }}
          />
          <Btn className="mt-4.5 w-auto! px-5" disabled={savingPass} onClick={savePassword}>
            {savingPass ? 'Saving…' : 'Change password'}
          </Btn>
        </Card>
      </div>
    </>
  )
}
