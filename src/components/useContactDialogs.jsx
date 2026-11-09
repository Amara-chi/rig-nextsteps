import { useState } from 'react'
import Modal from './Modal.jsx'
import { useAppToast } from '../context/ToastContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { ContactFormDialog, ContactPanel, DeleteOutcomeDialog, OutcomeDialog, departmentsOf, designationsOf } from './followup.jsx'
import ImportContacts from './ImportContacts.jsx'

// One set of dialogs per Follow Up page: open a contact, log or edit an
// outcome, add or edit a contact, import a sheet, delete an outcome. Each
// page calls this and renders `dialogs` once; the open* functions go on its
// buttons. Panes stay mounted, so each page keeps its own dialog state.
export function useContactDialogs({ contacts, outcomes, staff, refresh }) {
  const [panelId, setPanelId] = useState(null)
  const [outcomeFor, setOutcomeFor] = useState(null) // { person?, outcome? } or { pick: true }
  const [form, setForm] = useState(null) // { contact? }
  const [importing, setImporting] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [focusNote, setFocusNote] = useState(false)
  const [removing, setRemoving] = useState(null) // a contact to delete outright
  const toast = useAppToast()

  const panel = contacts.find((c) => c.id === panelId) || null

  const dialogs = (
    <>
      <ContactPanel
        contact={panel}
        outcomes={outcomes}
        staff={staff}
        departments={departmentsOf(contacts)}
        designations={designationsOf(contacts)}
        focusNote={focusNote}
        onClose={() => { setPanelId(null); setFocusNote(false) }}
        onDelete={(c) => setRemoving(c)}
        onChanged={refresh}
        onLog={(c) => setOutcomeFor({ person: c })}
        onEdit={(c) => setForm({ contact: c })}
        onEditOutcome={(o) => setOutcomeFor({ outcome: o })}
        onDeleteOutcome={(o) => setDeleting(o)}
      />
      <OutcomeDialog
        open={!!outcomeFor}
        person={outcomeFor?.person || null}
        outcome={outcomeFor?.outcome || null}
        contacts={contacts}
        staff={staff}
        onClose={() => setOutcomeFor(null)}
        onSaved={refresh}
      />
      <ContactFormDialog open={!!form} contact={form?.contact || null} staff={staff} onClose={() => setForm(null)} onSaved={refresh} />
      <ImportContacts open={importing} onClose={() => setImporting(false)} onDone={refresh} />
      <DeleteOutcomeDialog outcome={deleting} onClose={() => setDeleting(null)} onDeleted={refresh} />
      <Modal
        open={!!removing}
        title="Delete this person?"
        sub={removing?.full_name}
        saveLabel="Yes, delete"
        onClose={() => setRemoving(null)}
        onSave={async () => {
          const { error } = await supabase.from('people').delete().eq('id', removing.id)
          if (error) { toast(`Couldn't delete that: ${error.message}`); return false }
          toast(`${removing.full_name} deleted.`)
          setPanelId(null)
          refresh()
        }}
      >
        <p className="text-[13px] text-muted-body mt-3">This removes {removing?.full_name} from the platform permanently, with their notes, outcomes and any check-ins. It cannot be undone.</p>
      </Modal>
    </>
  )

  return {
    dialogs,
    openContact: (c) => { setFocusNote(false); setPanelId(c.id) },
    addNote: (c) => { setFocusNote(true); setPanelId(c.id) },
    deleteContact: (c) => setRemoving(c),
    logOutcome: (c) => setOutcomeFor({ person: c }),
    logAny: () => setOutcomeFor({ pick: true }),
    editOutcome: (o) => setOutcomeFor({ outcome: o }),
    deleteOutcome: (o) => setDeleting(o),
    addContact: () => setForm({}),
    importSheet: () => setImporting(true),
  }
}
