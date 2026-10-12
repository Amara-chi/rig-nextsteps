import { useEffect, useRef } from 'react'

// The phone nav. With Messages added (Sep 2026) a director has nine items,
// more than fit across 390px, so the bar scrolls sideways instead of
// cutting the last ones off: items keep their natural width, the scrollbar
// is hidden, and the active item is scrolled into view so whichever pane
// you are on is never off the edge.
export default function BottomNav({ nav, activePane, onNavigate, counts = {} }) {
  const activeRef = useRef(null)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [activePane])

  return (
    <nav className="hidden max-mobile:flex fixed bottom-0 left-0 right-0 z-100 bg-ink-deep pt-2 px-1.5 pb-[calc(8px+env(safe-area-inset-bottom))] justify-around overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {nav.map((n) => (
        <button
          key={n.id}
          ref={activePane === n.id ? activeRef : null}
          type="button"
          onClick={() => onNavigate(n.id)}
          className={`flex flex-none flex-col items-center gap-0.75 text-[9.5px] font-bold py-1.25 px-2 rounded-[10px] relative whitespace-nowrap ${
            activePane === n.id ? 'text-orange' : 'text-nav-idle'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {n.icon}
          </svg>
          {n.label}
          {n.cnt && counts[n.cnt] > 0 && (
            <span className="absolute top-0 right-0.5 bg-orange text-white rounded-full text-[8.5px] py-0.25 px-1.25">
              {counts[n.cnt]}
            </span>
          )}
        </button>
      ))}
    </nav>
  )
}
