import { useMemo, useState } from 'react'
import { useAuth } from './hooks/useAuth.js'
import { useToast } from './hooks/useToast.js'
import { useAppData } from './hooks/useAppData.js'
import { useFollowUp } from './hooks/useFollowUp.js'
import { useSupportPeople } from './hooks/useSupportPeople.js'
import { MeProvider } from './context/MeContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { NAV_FULL, NAV_SUPPORT, NAV_TEAM } from './nav.jsx'
import Login from './auth/Login.jsx'
import SetPassword from './auth/SetPassword.jsx'
import Sidebar from './components/Sidebar.jsx'
import BottomNav from './components/BottomNav.jsx'
import ReadonlyBanner from './components/ReadonlyBanner.jsx'
import Toast from './components/Toast.jsx'
import VideoFallbackModal from './components/VideoFallbackModal.jsx'
import Pane from './components/Pane.jsx'
import Today from './pages/Today.jsx'
import SessionPane from './pages/SessionPane.jsx'
import VideosPage from './pages/VideosPage.jsx'
import People from './pages/People.jsx'
import FollowUp from './pages/FollowUp.jsx'
import Reports from './pages/Reports.jsx'
import SupportHouseChurch from './pages/SupportHouseChurch.jsx'
import SupportFollowUp from './pages/SupportFollowUp.jsx'
import SupportMembership from './pages/SupportMembership.jsx'
import Team from './pages/Team.jsx'

// Base styles ported from the old global body{} rule (font, background, text
// color/size, antialiasing) — applied here rather than as a shared body{}
// CSS rule, since checkin's body styles differ (own overflow/padding/flex
// rules for its own layout, not shared with the admin app).
const BASE_CLASS = 'min-h-dvh font-sans bg-cream text-ink text-[15px] leading-[1.55] antialiased'

export default function App() {
  const { status, me, authLinkType, signIn, requestReset, setPassword, signOut } = useAuth()
  const toastState = useToast()
  const { html: toastHtml, visible: toastVisible, toast } = toastState
  const { people, openSession, todaysCheckins, sessionFeed, refreshAll } = useAppData(me)
  const followUp = useFollowUp(me, people)
  const support = useSupportPeople(me)
  const [fallbackUrl, setFallbackUrl] = useState(null)

  const nav = useMemo(() => {
    if (!me) return []
    if (me.role === 'support') return NAV_SUPPORT
    return me.role === 'director' ? [...NAV_FULL, NAV_TEAM] : NAV_FULL
  }, [me])

  const [activePane, setActivePane] = useState(null)
  const pane = activePane ?? (me?.role === 'support' ? 'support-hc' : 'today')

  if (status === 'booting') return <div className={BASE_CLASS} />
  if (status === 'loggedOut') return <div className={BASE_CLASS}><Login onSignIn={signIn} onRequestReset={requestReset} /></div>
  if (status === 'needsSetPassword') {
    return <div className={BASE_CLASS}><SetPassword authLinkType={authLinkType} onSetPassword={setPassword} /></div>
  }

  return (
    <MeProvider me={me}>
      <ToastProvider value={toastState}>
        <div className={BASE_CLASS}>
          <div className="flex min-h-dvh">
            <Sidebar nav={nav} activePane={pane} onNavigate={setActivePane} me={me} onSignOut={signOut} followupCount={followUp.attended.length} />
            <main className="flex-1 pt-7.5 px-9 pb-22.5 max-mobile:pt-5 max-mobile:px-4 max-mobile:pb-24 max-w-290 w-full">
              {me.role !== 'director' && <ReadonlyBanner />}

              <Pane active={pane === 'today'}><Today people={people} openSession={openSession} todaysCheckins={todaysCheckins} /></Pane>
              <Pane active={pane === 'session'}>
                <SessionPane onNavigate={setActivePane} openSession={openSession} sessionFeed={sessionFeed} onDataChange={refreshAll} />
              </Pane>
              <Pane active={pane === 'videos'}><VideosPage onNavigate={setActivePane} onFallback={setFallbackUrl} /></Pane>
              <Pane active={pane === 'people'}><People people={people} onDataChange={refreshAll} /></Pane>
              <Pane active={pane === 'followup'}>
                <FollowUp people={people} attended={followUp.attended} awaiting={followUp.awaiting} noshows={followUp.noshows} STATUS_LABEL={followUp.STATUS_LABEL} refresh={followUp.refresh} />
              </Pane>
              <Pane active={pane === 'reports'}><Reports people={people} /></Pane>
              <Pane active={pane === 'support-hc'}>
                <SupportHouseChurch list={support.hc} hadError={support.hadError} refresh={support.refresh} />
              </Pane>
              <Pane active={pane === 'support-followup'}>
                <SupportFollowUp list={support.followup} hadError={support.hadError} refresh={support.refresh} />
              </Pane>
              <Pane active={pane === 'support-membership'}>
                <SupportMembership list={support.membership} hadError={support.hadError} refresh={support.refresh} />
              </Pane>
              {me.role === 'director' && <Pane active={pane === 'team'}><Team /></Pane>}
            </main>
            <BottomNav nav={nav} activePane={pane} onNavigate={setActivePane} followupCount={followUp.attended.length} />
          </div>
          <Toast html={toastHtml} visible={toastVisible} />
          <VideoFallbackModal url={fallbackUrl} onClose={() => setFallbackUrl(null)} />
        </div>
      </ToastProvider>
    </MeProvider>
  )
}
