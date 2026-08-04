const VARIANTS = {
  orange: 'bg-orange-soft text-orange-deep',
  green: 'bg-green-soft text-green',
  grey: 'bg-cream-deep text-muted-sub',
  navy: 'bg-[#E2E5EC] text-ink-deep',
}

export default function Badge({ variant = 'orange', className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1.25 px-2.5 py-0.75 rounded-full text-[10.5px] font-bold whitespace-nowrap ${VARIANTS[variant]} ${className}`}>
      {children}
    </span>
  )
}
