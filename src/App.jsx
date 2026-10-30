import { useMemo, useState } from 'react'
import { useAuth } from './hooks/useAuth.js'
import { useToast } from './hooks/useToast.js'
import { useAppData } from './hooks/useAppData.js'
import { useFollowUpData } from './hooks/useFollowUpData.js'
import { useMessaging } from './hooks/useMessaging.js'
import { useBibleStudy } from './hooks/useBibleStudy.js'
import { useTodayData } from './hooks/useTodayData.js'
import { MeProvider } from './context/MeContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { firstPaneFor, navFor } from './nav.jsx'
import Login from './auth/Login.jsx'
import SetPassword from './auth/SetPassword.jsx'
import Sidebar, { MobileTopBar } from './components/Sidebar.jsx'
import ReadonlyBanner from './components/ReadonlyBanner.jsx'
import Toast from './components/Toast.jsx'
import VideoFallbackModal from './components/VideoFallbackModal.jsx'
import Pane from './components/Pane.jsx'
import Today from './pages/Today.jsx'
import SessionPane from './pages/SessionPane.jsx'
import VideosPage from './pages/VideosPage.jsx'
import People from './pages/People.jsx'
import Reports from './pages/Reports.jsx'
import Messaging from './pages/Messaging.jsx'
import FollowUpDashboard from './pages/FollowUpDashboard.jsx'
import Contacts from './pages/Contacts.jsx'
import Outcomes from './pages/Outcomes.jsx'
import Membership from './pages/Membership.jsx'
import HouseChurch from './pages/HouseChurch.jsx'
import BibleStudy from './pages/BibleStudy.jsx'
import BibleUpload from './pages/BibleUpload.jsx'
import Team from './pages/Team.jsx'
import Profile from './pages/Profile.jsx'

// Base styles ported from the old global body{} rule (font, background, text
// color/size, antialiasing) — applied here rather than as a shared body{}
// CSS rule, since checkin's body styles differ (own overflow/padding/flex
// rules for its own layout, not shared with the admin app).
const BASE_CLASS = 'min-h-dvh font-sans bg-cream text-ink text-[15px] leading-[1.55] antialiased'

export default function App() {
  const { status, me, authLinkType, signIn, requestReset, setPassword, signOut, refresh: refreshMe } = useAuth()
  const toastState = useToast()
  const { html: toastHtml, visible: toastVisible } = toastState
  const { people, openSession, sessionFeed, refreshAll } = useAppData(me)
  const fu = useFollowUpData(me)
  const msg = useMessaging(me)
  const bs = useBibleStudy(me)
  const today = useTodayData(me)
  const [fallbackUrl, setFallbackUrl] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [bsEditing, setBsEditing] = useState(null)

  const nav = useMemo(() => (me ? navFor(me.role) : { top: [], groups: [], bottom: [] }), [me])
  const allowedPanes = useMemo(() => new Set([...nav.top, ...nav.groups.flatMap((g) => g.items), ...nav.bottom].map((n) => n.id)), [nav])

  // Messaging badges conversations with something unread (ten messages from
  // one person is one thing to deal with); Contacts badges who is waiting on
  // a call, or for Follow Up callers, the calls assigned to them.
  const navCounts = {
    messaging: msg.unreadCount,
    contacts: me?.role === 'support'
      ? fu.contacts.filter((c) => c.waiting && c.assigned_to === me.id).length
      : fu.contacts.filter((c) => c.waiting).length,
  }

  const [activePane, setActivePane] = useState(null)
  const pane = activePane && allowedPanes.has(activePane) ? activePane : firstPaneFor(me?.role)
  const navigate = (id) => {
    if (id === 'today') today.refresh()
    setActivePane(id)
    window.scrollTo({ top: 0 })
  }

  if (status === 'booting') return <div className={BASE_CLASS} />
  if (status === 'loggedOut') return <div className={BASE_CLASS}><Login onSignIn={signIn} onRequestReset={requestReset} /></div>
  if (status === 'needsSetPassword') {
    return <div className={BASE_CLASS}><SetPassword authLinkType={authLinkType} onSetPassword={setPassword} /></div>
  }

  const isSupport = me.role === 'support'
  const fuProps = { contacts: fu.contacts, outcomes: fu.outcomes, staff: fu.staff, refresh: fu.refresh }

  return (
    <MeProvider me={me}>
      <ToastProvider value={toastState}>
        <div className={BASE_CLASS}>
          <MobileTopBar onOpen={() => setMenuOpen(true)} counts={navCounts} />
          <div className="flex min-h-dvh max-mobile:min-h-[calc(100dvh-56px)]">
            <Sidebar nav={nav} activePane={pane} onNavigate={navigate} me={me} onSignOut={signOut} counts={navCounts} mobileOpen={menuOpen} onCloseMobile={() => setMenuOpen(false)} />
            <main className="flex-1 min-w-0 pt-7.5 px-9 pb-22.5 max-mobile:pt-5 max-mobile:px-4 max-mobile:pb-12 w-full">
              {me.role === 'leader' && <ReadonlyBanner />}

              {!isSupport && (
                <>
                  <Pane active={pane === 'today'}>
                    <Today people={people} contacts={fu.contacts} outcomes={fu.outcomes} sent={msg.sent} conversations={msg.conversations}
                      checkinDates={today.checkinDates} followups={today.followups} bibleSessions={bs.sessions} onNavigate={navigate} />
                  </Pane>
                  <Pane active={pane === 'session'}>
                    <SessionPane onNavigate={navigate} openSession={openSession} sessionFeed={sessionFeed} onDataChange={refreshAll} />
                  </Pane>
                  <Pane active={pane === 'videos'}><VideosPage onNavigate={navigate} onFallback={setFallbackUrl} /></Pane>
                  <Pane active={pane === 'people'}><People people={people} onDataChange={refreshAll} /></Pane>
                  <Pane active={pane === 'reports'}><Reports people={people} /></Pane>
                  <Pane active={pane === 'messaging'}>
                    <Messaging sent={msg.sent} inbound={msg.inbound} queued={msg.queued} conversations={msg.conversations}
                      contacts={fu.contacts} people={people} refresh={msg.refresh} refreshContacts={fu.refresh} />
                  </Pane>
                  <Pane active={pane === 'bible'}>
                    <BibleStudy series={bs.series} sessions={bs.sessions} loaded={bs.loaded} active={pane === 'bible'} onNavigate={navigate}
                      onEdit={(s) => { setBsEditing(s); navigate('bible-upload') }} />
                  </Pane>
                  {me.role === 'director' && (
                    <Pane active={pane === 'bible-upload'}>
                      <BibleUpload series={bs.series} editing={bsEditing} refresh={bs.refresh}
                        onDone={() => { if (bsEditing) { setBsEditing(null); navigate('bible') } }} />
                    </Pane>
                  )}
                </>
              )}

              <Pane active={pane === 'fu-dash'}><FollowUpDashboard {...fuProps} onNavigate={navigate} /></Pane>
              <Pane active={pane === 'contacts'}><Contacts {...fuProps} /></Pane>
              <Pane active={pane === 'outcomes'}><Outcomes {...fuProps} /></Pane>
              <Pane active={pane === 'membership'}><Membership {...fuProps} /></Pane>
              <Pane active={pane === 'house-church'}><HouseChurch {...fuProps} /></Pane>

              {me.role === 'director' && <Pane active={pane === 'team'}><Team /></Pane>}
              <Pane active={pane === 'profile'}><Profile onDataChange={refreshMe} /></Pane>
            </main>
          </div>
          <Toast html={toastHtml} visible={toastVisible} />
          <VideoFallbackModal url={fallbackUrl} onClose={() => setFallbackUrl(null)} />
        </div>
      </ToastProvider>
    </MeProvider>
  )
}
