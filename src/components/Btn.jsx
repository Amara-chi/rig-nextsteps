const VARIANTS = {
  primary: 'bg-orange text-white hover:bg-orange-deep',
  secondary: 'bg-cream-deep text-ink-deep hover:bg-line',
  danger: 'bg-white border-[1.5px] border-[#E8B4A6] text-orange-deep hover:bg-orange-soft',
}

// Full-width primary/secondary/danger button (the old .btn class). Spacing
// above it is the caller's concern (the old CSS's margin-top:18px was
// overridden to 0 inside .modal-actions, so it was never truly intrinsic).
export default function Btn({ variant = 'primary', className = '', disabled, children, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`flex items-center justify-center gap-2 w-full py-[15px] rounded-[13px] font-extrabold text-[15px] transition-[.15s] disabled:opacity-55 disabled:cursor-wait ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
