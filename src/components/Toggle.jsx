export default function Toggle({ on, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.75 py-1.75 px-3.25 rounded-full border-[1.5px] text-[11.5px] font-bold transition-[.15s] ${
        on ? 'bg-orange border-orange text-white' : 'bg-white border-line'
      } ${className}`}
    >
      {children}
    </button>
  )
}
