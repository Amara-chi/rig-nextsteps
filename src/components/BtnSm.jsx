const VARIANTS = {
  solid: 'bg-orange text-white hover:bg-orange-deep',
  outline: 'bg-white border-[1.5px] border-line text-ink hover:border-orange hover:text-orange',
  done: 'bg-green-soft text-green cursor-default',
}

// Inline small action button (the old .btn-sm class), used pervasively
// across Reports/Follow-Up/People/Team.
export default function BtnSm({ variant = 'solid', className = '', disabled, children, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-4 py-[9px] rounded-[10px] font-bold text-[12.5px] whitespace-nowrap transition-[.15s] disabled:opacity-55 disabled:cursor-wait ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
