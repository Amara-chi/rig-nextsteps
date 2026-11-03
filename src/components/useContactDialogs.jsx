import { useState } from 'react'
import { ContactFormDialog, ContactPanel, DeleteOutcomeDialog, OutcomeDialog } from './followup.jsx'
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

  const panel = contacts.find((c) => c.id === panelId) || null

  const dialogs = (
    <>
      <ContactPanel
        contact={panel}
        outcomes={outcomes}
        staff={staff}
        onClose={() => setPanelId(null)}
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
    </>
  )

  return {
    dialogs,
    openContact: (c) => setPanelId(c.id),
    logOutcome: (c) => setOutcomeFor({ person: c }),
    logAny: () => setOutcomeFor({ pick: true }),
    editOutcome: (o) => setOutcomeFor({ outcome: o }),
    deleteOutcome: (o) => setDeleting(o),
    addContact: () => setForm({}),
    importSheet: () => setImporting(true),
  }
}
