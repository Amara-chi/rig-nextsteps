import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import Field, { Select } from './Field.jsx'

// Shared by Follow-Up Centre and the Support role's Follow Up page (both
// logged the exact same outcomeModal() in the old app).
export default function OutcomeModal({ open, title, sub, defaultStatus, onSave, onClose }) {
  const [status, setStatus] = useState(defaultStatus || 'called')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) { setStatus(defaultStatus || 'called'); setNote('') }
  }, [open, defaultStatus])

  return (
    <Modal open={open} title={title} sub={sub} saveLabel="Log it" onClose={onClose} onSave={() => onSave(status, note.trim())}>
      <Field label="What did you do?">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="sent">Sent a message (WhatsApp/SMS)</option>
          <option value="called">Called</option>
          <option value="texted">Texted after no answer</option>
          <option value="door_open">No response — door open</option>
        </Select>
      </Field>
      <Field label={<>What happened? <span className="font-medium text-muted-label">(saved as a note all staff can see)</span></>}>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Spoke on the phone — prayed together, coming back for Step 4. / Messaged; no response yet."
          className="w-full min-h-20 border-[1.5px] border-line rounded-xl p-3 bg-cream text-sm resize-y"
        />
      </Field>
    </Modal>
  )
}
