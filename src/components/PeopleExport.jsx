import { useEffect, useRef, useState } from 'react'
import BtnSm from './BtnSm.jsx'
import { downloadCSV } from '../lib/csv.js'
import { PEOPLE_FIELD_DEFS, DEFAULT_PEOPLE_FIELDS } from '../config/peopleFields.js'
import { todayStr } from '../lib/format.js'

// The People pane's "Export" control: a dropdown of tickable columns and a
// download. Kept out of People.jsx because that file is already the app's
// longest pane, and the field list is self-contained.
export default function PeopleExport({ rows, total, filtered }) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState(DEFAULT_PEOPLE_FIELDS)
  const boxRef = useRef(null)

  // Click-away and Escape both close it, the way a menu is expected to
  // behave — without this it would stay open behind whatever you tapped next.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const toggle = (key) => setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]))

  const download = () => {
    // Order comes from PEOPLE_FIELD_DEFS, not the order the boxes were
    // ticked, so every export of the same columns looks the same.
    const fields = PEOPLE_FIELD_DEFS.filter((f) => picked.includes(f.key))
    const csv = [fields.map((f) => f.label)]
      .concat(rows.map((p) => fields.map((f) => f.value(p))))
    downloadCSV(`rig-people-${todayStr()}.csv`, csv)
    setOpen(false)
  }

  return (
    <div className="relative" ref={boxRef}>
      <BtnSm variant="outline" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="py-2.75!">
        Export ▾
      </BtnSm>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[268px] bg-white border border-line rounded-[14px] shadow-card p-4">
          <div className="font-mono text-[9.5px] font-semibold tracking-[.11em] uppercase text-muted-label mb-2.5">
            Columns to include
          </div>

          <div className="max-h-[260px] overflow-y-auto pr-1 -mr-1">
            {PEOPLE_FIELD_DEFS.map((f) => (
              <label key={f.key} className="flex items-center gap-2.5 py-1.5 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-orange w-4 h-4"
                  checked={picked.includes(f.key)}
                  onChange={() => toggle(f.key)}
                />
                {f.label}
              </label>
            ))}
          </div>

          <div className="flex gap-3.5 mt-2.5 pt-2.5 border-t border-line text-[11.5px] font-bold">
            <button type="button" className="text-orange hover:underline" onClick={() => setPicked(PEOPLE_FIELD_DEFS.map((f) => f.key))}>Select all</button>
            <button type="button" className="text-orange hover:underline" onClick={() => setPicked(DEFAULT_PEOPLE_FIELDS)}>Reset</button>
          </div>

          <p className="mt-3 text-[11.5px] text-muted-sub leading-snug">
            {filtered
              ? `Exports the ${rows.length} ${rows.length === 1 ? 'person' : 'people'} matching your search, of ${total}. Clear the search to export everyone.`
              : `Exports all ${total} ${total === 1 ? 'person' : 'people'}.`}
          </p>

          <BtnSm className="mt-3 w-full justify-center" disabled={!picked.length || !rows.length} onClick={download}>
            Download spreadsheet
          </BtnSm>
        </div>
      )}
    </div>
  )
}
