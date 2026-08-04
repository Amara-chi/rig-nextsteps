// All panes stay mounted simultaneously (see migration plan) — switching
// panes must never lose in-progress state (an open detail row, unsaved
// search text), matching the old .pane/.pane.on display:none/block toggle
// exactly, rather than conditionally mounting only the active one.
export default function Pane({ active, children }) {
  return <section className={active ? 'block animate-fade' : 'hidden'}>{children}</section>
}
