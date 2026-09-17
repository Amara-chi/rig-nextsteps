import { useEffect, useState } from 'react'
import Avatar from './Avatar.jsx'

export default function Sidebar({ nav, activePane, onNavigate, me, onSignOut, counts = {} }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('ns_side_collapsed') === '1')

  useEffect(() => {
    localStorage.setItem('ns_side_collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  return (
    <aside
      className={`flex-none bg-ink-deep text-white flex flex-col pt-6 px-3.5 pb-4.5 sticky top-0 h-dvh transition-[width_.18s_ease] max-mobile:hidden ${
        collapsed ? 'w-18' : 'w-57.5'
      }`}
    >
      <div className={`flex items-center gap-2.5 pb-5.5 px-2.5 ${collapsed ? 'flex-col! items-center! px-0! gap-2!' : ''}`}>
        {!collapsed && <img className="flex-1 min-w-0 max-w-full h-6 object-contain object-left block" src="/images/logo-light.png" alt="Rig Church Lagos" />}
        {collapsed && <img className="h-6.5 w-6.5 flex-none block" src="/images/favicon.png" alt="Rig Church Lagos" />}
        <button
          type="button"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed((c) => !c)}
          className="flex-none w-6.5 h-6.5 rounded-lg flex items-center justify-center text-nav-idle hover:text-white hover:bg-white/8 transition-[.15s]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={`transition-[transform_.18s_ease] ${collapsed ? 'rotate-180' : ''}`}>
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
      </div>

      <nav className="flex flex-col gap-0.75">
        {nav.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => onNavigate(n.id)}
            className={`flex items-center gap-2.75 py-2.75 px-3 rounded-[11px] text-left font-semibold text-[13.5px] transition-[.15s] w-full ${
              collapsed ? 'justify-center px-0!' : ''
            } ${activePane === n.id ? 'bg-orange text-white' : 'text-nav-idle hover:text-white hover:bg-white/6'}`}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="flex-none">
              {n.icon}
            </svg>
            {!collapsed && <span>{n.label}</span>}
            {!collapsed && n.cnt && counts[n.cnt] > 0 && (
              <span className={`ml-auto rounded-full py-0.25 px-2 text-[10.5px] font-bold ${activePane === n.id ? 'bg-white/25' : 'bg-white/14'}`}>
                {counts[n.cnt]}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className={`mt-auto flex items-center gap-2.5 pt-3 px-2 pb-1 border-t border-white/10 ${collapsed ? 'justify-center px-0!' : ''}`}>
        <Avatar name={me?.full_name} size={34} fontSize={12} />
        {!collapsed && (
          <div>
            <div className="text-[12.5px] font-bold leading-tight">{me?.full_name || '—'}</div>
            <div className="text-[10.5px] text-nav-faint">
              {me?.role === 'director' ? 'Next Steps Admin · full access' : me?.role === 'support' ? 'Support · house church, membership & follow-up' : 'Leadership · read-only'}
            </div>
          </div>
        )}
      </div>
      {!collapsed && (
        <button type="button" onClick={onSignOut} className="text-nav-faint text-[11px] font-semibold py-2 text-left hover:text-white">
          Sign out
        </button>
      )}
    </aside>
  )
}
