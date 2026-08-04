// The old .card class had a default margin-bottom:18px, overridden to 0
// wherever it sat inside a gapped grid (.two-col). Baking a default margin
// into this component would create exactly that override problem (two
// same-specificity Tailwind utilities in one className don't reliably
// resolve by string order), so spacing between stacked cards is the
// caller's job (e.g. a wrapping space-y-4.5), not this component's.
export default function Card({ className = '', children }) {
  return (
    <div className={`bg-white border border-line rounded-[14px] shadow-card py-5 px-5.5 ${className}`}>
      {children}
    </div>
  )
}

export function CardHead({ title, sub, right, className = '', children }) {
  return (
    <div className={`flex items-start justify-between gap-3 flex-wrap mb-3.5 ${className}`}>
      <div>
        {title && <h3 className="text-[15.5px] font-extrabold tracking-[-.015em] text-ink-deep">{title}</h3>}
        {sub && <div className="text-xs text-muted-label mt-0.5">{sub}</div>}
        {children}
      </div>
      {right}
    </div>
  )
}
