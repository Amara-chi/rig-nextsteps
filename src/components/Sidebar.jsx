import { useEffect, useState } from 'react'
import Avatar from './Avatar.jsx'
import { roleLabel } from '../config/site.js'

const readJSON = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback } catch { return fallback }
}

function NavItem({ n, active, collapsed, onNavigate, counts }) {
  const on = active === n.id
  return (
    <button
      type="button"
      onClick={() => onNavigate(n.id)}
      aria-current={on ? 'page' : undefined}
      title={collapsed ? n.label : undefined}
      className={`flex items-center gap-2.75 py-2.75 px-3 rounded-[11px] text-left font-semibold text-[13.5px] transition-[.15s] w-full ${
        collapsed ? 'justify-center px-0!' : ''
      } ${on ? 'bg-orange text-white' : 'text-nav-idle hover:text-white hover:bg-white/6'}`}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none" aria-hidden="true">
        {n.icon}
      </svg>
      {!collapsed && <span>{n.label}</span>}
      {!collapsed && n.cnt && counts[n.cnt] > 0 && (
        <span className={`ml-auto rounded-full py-0.25 px-2 text-[10.5px] font-bold ${on ? 'bg-white/25' : 'bg-white/14'}`}>{counts[n.cnt]}</span>
      )}
    </button>
  )
}

// Phone top bar: logo and a hamburger that slides the sidebar in.
export function MobileTopBar({ onOpen, counts = {} }) {
  const total = Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0)
  return (
    <header className="hidden max-mobile:flex sticky top-0 z-100 items-center justify-between gap-3 h-14 px-4 bg-ink-deep">
      <img className="h-5.5 w-auto block" src="/images/logo-light.png" alt="Rig Church Lagos" />
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open menu"
        className="relative w-11 h-11 -mr-2 rounded-xl grid place-items-center text-white hover:bg-white/8"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        {total > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-orange ring-2 ring-ink-deep" aria-hidden="true" />}
      </button>
    </header>
  )
}

// Grouped sidebar: Today on its own, then Next Steps / Follow Up / Bible
// Study, each collapsible (remembered per browser), then Team and Profile.
// Under the mobile breakpoint it becomes a slide-in drawer, opened from
// MobileTopBar's hamburger and closed by picking a page or the backdrop.
export default function Sidebar({ nav, activePane, onNavigate, me, onSignOut, counts = {}, mobileOpen = false, onCloseMobile }) {
  const [collapsedPref, setCollapsed] = useState(() => localStorage.getItem('ns_side_collapsed') === '1')
  const [closed, setClosed] = useState(() => readJSON('ns_side_groups_closed', {}))
  const isPhone = typeof window !== 'undefined' && window.matchMedia('(max-width: 759.98px)').matches
  // The drawer always shows labels; icon-only is a desktop preference.
  const collapsed = collapsedPref && !isPhone

  useEffect(() => { localStorage.setItem('ns_side_collapsed', collapsedPref ? '1' : '0') }, [collapsedPref])
  useEffect(() => { try { localStorage.setItem('ns_side_groups_closed', JSON.stringify(closed)) } catch { /* private mode */ } }, [closed])
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onCloseMobile?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen, onCloseMobile])

  const toggleGroup = (id) => setClosed((c) => ({ ...c, [id]: !c[id] }))
  const go = (id) => { onNavigate(id); onCloseMobile?.() }

  return (
    <>
    {mobileOpen && <div className="hidden max-mobile:block fixed inset-0 z-290 bg-ink-deep/55 animate-fade-fast" onClick={onCloseMobile} aria-hidden="true" />}
    <aside
      className={`flex-none bg-ink-deep text-white flex flex-col pt-6 px-3.5 pb-4.5 sticky top-0 h-dvh overflow-y-auto transition-[width_.18s_ease] ${
        collapsed ? 'w-18' : 'w-57.5'
      } max-mobile:fixed max-mobile:left-0 max-mobile:top-0 max-mobile:z-300 max-mobile:w-72 max-mobile:shadow-modal max-mobile:transition-transform max-mobile:duration-200 ${
        mobileOpen ? 'max-mobile:translate-x-0' : 'max-mobile:-translate-x-full'
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
          className="flex-none w-6.5 h-6.5 rounded-lg flex items-center justify-center text-nav-idle hover:text-white hover:bg-white/8 transition-[.15s] max-mobile:hidden"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={`transition-[transform_.18s_ease] ${collapsed ? 'rotate-180' : ''}`}>
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Close menu"
          onClick={onCloseMobile}
          className="hidden max-mobile:grid flex-none w-10 h-10 -mr-1 rounded-xl place-items-center text-nav-idle hover:text-white hover:bg-white/8"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      <nav className="flex flex-col gap-0.75" aria-label="Main">
        {nav.top.map((n) => <NavItem key={n.id} n={n} active={activePane} collapsed={collapsed} onNavigate={go} counts={counts} />)}

        {nav.groups.map((g) => {
          const open = collapsed || !closed[g.id]
          return (
            <div key={g.id} className={collapsed ? 'mt-2 pt-2 border-t border-white/10 flex flex-col gap-0.75' : 'mt-3 flex flex-col gap-0.75'}>
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  aria-expanded={open}
                  className="flex items-center justify-between w-full py-1.5 px-3 rounded-lg font-mono text-[9.5px] tracking-[.14em] uppercase font-semibold text-nav-faint hover:text-white"
                >
                  <span>{g.label}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
                </button>
              )}
              {open && g.items.map((n) => <NavItem key={n.id} n={n} active={activePane} collapsed={collapsed} onNavigate={go} counts={counts} />)}
            </div>
          )
        })}

        <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-0.75">
          {nav.bottom.map((n) => <NavItem key={n.id} n={n} active={activePane} collapsed={collapsed} onNavigate={go} counts={counts} />)}
        </div>
      </nav>

      <div className={`mt-auto flex items-center gap-2.5 pt-3 px-2 pb-1 border-t border-white/10 ${collapsed ? 'justify-center px-0!' : ''}`}>
        <Avatar name={me?.full_name} size={34} fontSize={12} />
        {!collapsed && (
          <div>
            <div className="text-[12.5px] font-bold leading-tight">{me?.full_name || '—'}</div>
            <div className="text-[10.5px] text-nav-faint">{roleLabel(me?.role, true)}</div>
          </div>
        )}
      </div>
      {!collapsed && (
        <button type="button" onClick={onSignOut} className="text-nav-faint text-[11px] font-semibold py-2 text-left hover:text-white">
          Sign out
        </button>
      )}
    </aside>
    </>
  )
}
