import { useCallback, useEffect, useState } from 'react'
import PageHead from '../components/PageHead.jsx'
import Card from '../components/Card.jsx'
import Badge from '../components/Badge.jsx'
import Avatar from '../components/Avatar.jsx'
import BtnSm from '../components/BtnSm.jsx'
import Modal from '../components/Modal.jsx'
import Field, { Select, TextInput } from '../components/Field.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { useMe } from '../context/MeContext.jsx'
import { useAppToast } from '../context/ToastContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { isSuperAdmin as checkSuperAdmin } from '../config/site.js'

const ROLE_LABEL = { director: 'Admin', leader: 'Leader', support: 'Follow Up' }
const ROLE_BADGE = { director: 'orange', leader: 'navy', support: 'grey' }
const STAFF_ERR = {
  not_director: 'You need admin access to do that.',
  cannot_change_self: "You can't change your own access from here.",
  cannot_change_another_director: 'Admin accounts can only be changed by hand in Supabase, on purpose.',
  invalid_input: 'Please check what you entered.',
  not_found: "Couldn't find that person.",
}
const staffErrMsg = (code) => STAFF_ERR[code] || 'Something went wrong.'

export default function Team() {
  const me = useMe()
  const toast = useAppToast()
  const [rows, setRows] = useState(null)
  const [hadError, setHadError] = useState(false)
  const [savingRoleId, setSavingRoleId] = useState(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('leader')
  // What the function handed back after adding someone: shown in its own
  // box so the director can read the password out or copy it, rather than
  // in a toast that disappears.
  const [created, setCreated] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('id, full_name, email, role, created_at').order('created_at')
    setHadError(!!error)
    setRows(data || [])
  }, [])
  useEffect(() => { load() }, [load])

  const callStaffFn = async (body) => {
    const { data, error } = await supabase.functions.invoke('manage-staff', { body })
    if (!error) return data && data.ok !== false ? { ok: true, ...data } : { ok: false, error: (data && data.error) || 'failed' }
    let code = error.message || 'failed'
    try { const ctx = await error.context.json(); if (ctx && ctx.error) code = ctx.error } catch { /* non-JSON error body */ }
    return { ok: false, error: code }
  }

  // This only controls whether the controls are OFFERED in the UI; the
  // actual permission is enforced server-side in manage-staff regardless.
  const isSuperAdmin = checkSuperAdmin(me)

  const setRole = async (id, role) => {
    setSavingRoleId(id)
    const res = await callStaffFn({ action: 'set_role', user_id: id, role })
    if (!res.ok) toast("Couldn't change their role — " + staffErrMsg(res.error))
    else toast('Role updated.')
    await load()
    setSavingRoleId(null)
  }

  const doRemove = async () => {
    const res = await callStaffFn({ action: 'remove', user_id: removeTarget.id })
    if (!res.ok) { toast("Couldn't remove them — " + staffErrMsg(res.error)); return false }
    toast('Removed.')
    load()
  }

  const sendInvite = async () => {
    const email = inviteEmail.trim()
    const full_name = inviteName.trim()
    if (!email) { toast('Enter an email address.'); return false }
    const res = await callStaffFn({ action: 'invite', email, full_name, role: inviteRole, redirect_to: window.location.origin + '/' })
    if (!res.ok) { toast("Couldn't add them — " + staffErrMsg(res.error)); return false }
    if (res.password) {
      // The account exists and the director gets the password every time;
      // emailed says whether the person has it too.
      setCreated({ name: full_name, email, password: res.password, emailed: !!res.emailed })
      setInviteName(''); setInviteEmail(''); setInviteRole('leader')
    } else {
      toast(`Invite sent to <b>${email}</b>.`) // the pre-12-Oct function (magic link) still deployed
    }
    load()
  }

  return (
    <>
      <PageHead
        title="Team"
        sub="Who has access, and what they can do."
        right={<BtnSm onClick={() => { setInviteName(''); setInviteEmail(''); setInviteRole('leader'); setInviteOpen(true) }}>Invite someone</BtnSm>}
      />

      <Card className="mb-0">
        {hadError ? (
          <EmptyState>Couldn't load — check your access.</EmptyState>
        ) : rows === null ? (
          <EmptyState>Loading…</EmptyState>
        ) : rows.length ? rows.map((r) => {
          const locked = r.id === me.id || (r.role === 'director' && !isSuperAdmin)
          return (
            <div key={r.id} className="flex gap-3.25 py-3.75 border-b border-[#ECE7DA] last:border-b-0 items-start flex-wrap">
              <Avatar name={r.full_name || r.email} />
              <div className="flex-1 min-w-55">
                <div className="font-extrabold text-[13px] text-ink-deep">
                  {r.full_name || '(no name yet)'} {r.id === me.id && <Badge variant="navy">You</Badge>}
                </div>
                <div className="text-xs text-muted-label mt-0.5">{r.email || '—'}</div>
              </div>
              <div className="ml-auto flex gap-1.75 flex-none flex-wrap items-center">
                {locked ? (
                  <Badge variant={ROLE_BADGE[r.role]}>{ROLE_LABEL[r.role]}</Badge>
                ) : (
                  <>
                    <select
                      value={r.role}
                      disabled={savingRoleId === r.id}
                      onChange={(e) => setRole(r.id, e.target.value)}
                      className="py-2.25 px-3 border-[1.5px] border-line rounded-[10px] bg-white text-[12.5px] text-ink-deep font-sans outline-none focus:border-orange focus:shadow-focus disabled:opacity-55"
                    >
                      {Object.keys(ROLE_LABEL).map((k) => <option key={k} value={k}>{ROLE_LABEL[k]}</option>)}
                    </select>
                    <BtnSm variant="outline" className="text-orange-deep!" onClick={() => setRemoveTarget(r)}>Remove</BtnSm>
                  </>
                )}
              </div>
            </div>
          )
        }) : <EmptyState>No one here yet.</EmptyState>}
      </Card>

      <Modal open={!!created} title="Sign-in details" sub={created?.emailed ? 'Emailed to them as well. Keep a copy in case they need it read out.' : "The email couldn't be sent, so pass these on yourself."} saveLabel="Done" onClose={() => setCreated(null)}>
        {created && (
          <div className="rounded-xl border-[1.5px] border-line overflow-hidden text-[13px]">
            {[['Sign in at', window.location.origin + '/'], ['Email', created.email], ['Password', created.password]].map(([k, v], i) => (
              <div key={k} className={`flex items-center gap-3 px-3.5 py-2.5 ${i ? 'border-t border-line' : ''}`}>
                <div className="w-20 flex-none font-mono text-[10.5px] uppercase tracking-[.08em] text-muted-label">{k}</div>
                <div className={`flex-1 min-w-0 break-all ${k === 'Password' ? 'font-mono text-[15px] font-bold tracking-[.06em] text-ink-deep' : 'font-semibold text-ink-deep'}`}>{v}</div>
              </div>
            ))}
          </div>
        )}
        {created && (
          <div className="flex gap-2 mt-3">
            <BtnSm variant="outline" onClick={async () => {
              const text = `Sign in at: ${window.location.origin}/\nEmail: ${created.email}\nPassword: ${created.password}`
              try { await navigator.clipboard.writeText(text); toast('Copied.') } catch { toast("Couldn't copy — select the text instead.") }
            }}>Copy details</BtnSm>
          </div>
        )}
        <p className="text-[12.5px] text-muted-body mt-3">They can change the password from Profile once they're in.</p>
      </Modal>

      <Modal open={inviteOpen} title="Add someone" sub="They'll get an email with the sign-in link, their email and a password" saveLabel="Add and email them" onClose={() => setInviteOpen(false)} onSave={sendInvite}>
        <Field label="Full name"><TextInput value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="e.g. Amara Chi" /></Field>
        <Field label="Email"><TextInput type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="them@example.com" /></Field>
        <Field label="Role">
          <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
            <option value="leader">Leader — read-only, can add notes</option>
            <option value="support">Follow Up — contacts, calls and outcomes</option>
            <option value="director">Admin — full access</option>
          </Select>
        </Field>
      </Modal>

      <Modal open={!!removeTarget} title="Remove from the team?" sub={removeTarget?.full_name || removeTarget?.email || ''} saveLabel="Yes, remove" onClose={() => setRemoveTarget(null)} onSave={doRemove}>
        <p className="text-[13px] text-muted-body mt-3">They'll immediately lose access to the app. They'd need to be re-invited to come back.</p>
      </Modal>
    </>
  )
}
