import { useEffect } from 'react'

// A wider dialog than Modal, with its own footer, for the contact panel,
// the add-contact form and the import. Modal stays for the small
// save/cancel forms that already use it.
export default function Dialog({ open, title, sub, onClose, footer, width = 680, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-200 p-4.5 max-mobile:p-0 overflow-auto bg-ink-deep/50 grid place-items-center max-mobile:place-items-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className="w-full bg-white rounded-[22px] max-mobile:rounded-b-none shadow-modal animate-fade-fast flex flex-col max-h-[calc(100dvh-36px)] max-mobile:max-h-[92dvh]"
        style={{ maxWidth: width }}
      >
        <div className="flex items-start gap-3 px-6 pt-5.5 pb-4 border-b border-[#ECE7DA]">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-black tracking-[-.02em] text-ink-deep">{title}</h3>
            {sub && <div className="text-[12.5px] text-muted-label mt-0.75 leading-normal">{sub}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex-none w-9 h-9 rounded-xl bg-cream grid place-items-center text-ink-deep hover:bg-cream-deep">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && <div className="flex gap-2.25 justify-end flex-wrap px-6 py-4 border-t border-[#ECE7DA]">{footer}</div>}
      </div>
    </div>
  )
}
