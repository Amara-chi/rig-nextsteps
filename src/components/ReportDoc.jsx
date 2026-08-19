import { STEPS, stepOf } from '../config/site.js'
import { fmtDate, todayStr } from '../lib/format.js'

const inputClass = 'w-full max-w-full box-border py-2.5 px-3 border-[1.5px] border-line rounded-[10px] bg-white text-[13.5px] font-sans text-ink-deep outline-none focus:border-orange focus:shadow-focus'

export default function ReportDoc({ r, active, isDirector, editDate, setEditDate, editStep, setEditStep, editNotes, setEditNotes, editFacilitator, setEditFacilitator, onRemoveCustomField }) {
  const details = active.filter((f) => f.kind === 'detail')
  const textFields = active.filter((f) => f.kind === 'text')
  const stats = active.filter((f) => f.kind === 'stat')
  const nameFields = active.filter((f) => f.kind === 'names')
  const notesField = active.find((f) => f.kind === 'notes')
  const customFields = Array.isArray(r.custom_fields) ? r.custom_fields : []

  return (
    <div className="border-[1.5px] border-line rounded-2xl pb-5.5 bg-[#FDFCF9] overflow-hidden">
      <div className="flex items-center gap-3.5 py-5 px-6 bg-[linear-gradient(135deg,var(--color-cream)_0%,var(--color-cream-deep)_100%)]">
        <img src="/images/logo.png" alt="Rig Church Lagos" className="h-8 w-auto flex-none" />
        <div>
          <div className="text-base font-black tracking-[-.02em] text-ink-deep leading-tight">Session Report</div>
          <div className="font-mono text-[9px] tracking-[.1em] uppercase text-[#8A8378] mt-0.5">Next Steps · Rig Church Lagos</div>
        </div>
      </div>

      {details.length > 0 && (
        <div className="pt-1.5 px-6">
          {details.map((f) => (
            <div key={f.key} className="py-2.5 border-b border-dashed border-line last:border-b-0">
              <span className="font-mono text-[9.5px] tracking-[.08em] uppercase text-muted-label font-semibold block mb-1.75">{f.label}</span>
              <div className="font-bold text-sm text-ink-deep">
                {f.key === 'session_date' && (
                  isDirector
                    ? <input type="date" value={editDate} max={todayStr()} onChange={(e) => setEditDate(e.target.value)} className={inputClass} />
                    : fmtDate(r.session_date)
                )}
                {f.key === 'step' && (
                  isDirector
                    ? (
                      <select value={editStep} onChange={(e) => setEditStep(+e.target.value)} className={inputClass}>
                        {STEPS.map((s) => <option key={s.n} value={s.n}>Step {s.n} — {s.title}</option>)}
                      </select>
                    )
                    : `Step ${r.step} — ${stepOf(r.step).title}`
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {textFields.length > 0 && (
        <div className="pt-1.5 px-6">
          {textFields.map((f) => (
            <div key={f.key} className="py-2.5 border-b border-dashed border-line last:border-b-0">
              <span className="font-mono text-[9.5px] tracking-[.08em] uppercase text-muted-label font-semibold block mb-1.75">{f.label}</span>
              <div className="font-bold text-sm text-ink-deep">
                {isDirector
                  ? <input type="text" placeholder="Optional" value={editFacilitator} onChange={(e) => setEditFacilitator(e.target.value)} className={inputClass} />
                  : (r.facilitator || '—')}
              </div>
            </div>
          ))}
        </div>
      )}

      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 pt-4.5 px-6 pb-0.5">
          {stats.map((f) => (
            <div key={f.key} className="shadow-none border border-line py-3 px-3.5 rounded-[14px]">
              <div className="font-mono text-[9.5px] tracking-[.12em] uppercase text-muted-label font-semibold">{f.label}</div>
              <div className="text-[23px] font-black tracking-[-.03em] text-ink-deep mt-0.75 leading-none">{r[f.key]}</div>
            </div>
          ))}
        </div>
      )}

      {nameFields.length > 0 && (
        <div className="pt-1.5 px-6">
          {nameFields.map((f) => (
            <div key={f.key} className="py-2.5 border-b border-dashed border-line last:border-b-0">
              <span className="font-mono text-[9.5px] tracking-[.08em] uppercase text-muted-label font-semibold block mb-1.75">{f.label}</span>
              <div className="text-[13px] text-ink-deep leading-snug">{r[f.key] || '—'}</div>
            </div>
          ))}
        </div>
      )}

      {customFields.length > 0 && (
        <div className="pt-1.5 px-6">
          {customFields.map((cf, idx) => (
            <div key={idx} className="py-2.5 border-b border-dashed border-line last:border-b-0">
              <span className="font-mono text-[9.5px] tracking-[.08em] uppercase text-muted-label font-semibold block mb-1.75">{cf.label}</span>
              <div className="flex items-center gap-2 font-bold text-sm text-ink-deep">
                <span className="flex-1">{cf.value}</span>
                {isDirector && (
                  <button type="button" title="Remove field" onClick={() => onRemoveCustomField(idx)} className="text-muted-icon hover:text-orange-deep hover:bg-orange-soft text-[15px] leading-none py-0.5 px-1 rounded-md flex-none">
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {notesField && (
        <div className="pt-4 px-6">
          <span className="font-mono text-[9.5px] tracking-[.08em] uppercase text-muted-label font-semibold mb-1.75 block">{notesField.label}</span>
          {isDirector ? (
            <textarea placeholder="Anything worth flagging…" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="w-full font-sans" />
          ) : (
            <textarea placeholder="Anything worth flagging…" readOnly value={r.notes || ''} className="w-full font-sans" />
          )}
        </div>
      )}
    </div>
  )
}
