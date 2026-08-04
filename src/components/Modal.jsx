import { useState } from 'react'
import Btn from './Btn.jsx'

// The one generic modal, reused by ~12 different call sites exactly like
// the old openModal(title, sub, bodyHTML, saveLabel, onSave) — each call
// site owns its own form-field state and passes controlled inputs as
// children, instead of the old approach of reading getElementById(...).value
// at save time.
export default function Modal({ open, title, sub, saveLabel = 'Save', onSave, onClose, children }) {
  const [saving, setSaving] = useState(false)
  if (!open) return null

  const handleSave = async () => {
    if (!onSave) { onClose(); return }
    setSaving(true)
    const ok = await onSave()
    setSaving(false)
    if (ok !== false) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-200 p-4.5 overflow-auto bg-ink-deep/50 grid place-items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[min(460px,100%)] bg-white rounded-[20px] shadow-modal py-6.5 px-6 animate-fade-fast">
        <h3 className="text-lg font-black tracking-[-.02em] text-ink-deep">{title}</h3>
        {sub && <div className="text-[12.5px] text-muted-label mt-0.75">{sub}</div>}
        <div>{children}</div>
        <div className="flex gap-2.25 mt-5">
          <Btn variant="primary" disabled={saving} onClick={handleSave}>{saveLabel}</Btn>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </div>
  )
}
