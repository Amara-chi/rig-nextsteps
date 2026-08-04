export default function BottomNav({ nav, activePane, onNavigate, followupCount = 0 }) {
  return (
    <nav className="hidden max-mobile:flex fixed bottom-0 left-0 right-0 z-100 bg-ink-deep pt-2 px-1.5 pb-[calc(8px+env(safe-area-inset-bottom))] justify-around">
      {nav.map((n) => (
        <button
          key={n.id}
          type="button"
          onClick={() => onNavigate(n.id)}
          className={`flex flex-col items-center gap-0.75 text-[9.5px] font-bold py-1.25 px-2 rounded-[10px] relative ${
            activePane === n.id ? 'text-orange' : 'text-nav-idle'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {n.icon}
          </svg>
          {n.label}
          {n.cnt && followupCount > 0 && (
            <span className="absolute top-0 right-0.5 bg-orange text-white rounded-full text-[8.5px] py-0.25 px-1.25">
              {followupCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  )
}
