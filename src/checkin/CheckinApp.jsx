import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { STEPS, HEARD_OPTIONS } from '../config/site.js'

const QUEUE_KEY = 'rig_pending_checkins'

// Custom dropdown arrow — kept as an inline style (not a Tailwind class)
// since the data: URI's quotes/percent-escapes don't survive being embedded
// in a className string cleanly.
const selectArrowStyle = {
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23454B59' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 16px center',
}

async function sendCheckin(payload) {
  const { data, error } = await supabase.rpc('check_in', payload)
  if (error) throw error
  return data
}

function queueCheckin(payload) {
  const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  q.push(payload)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
}

async function flushQueue() {
  const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  if (!q.length || !navigator.onLine) return
  const remaining = []
  for (const p of q) {
    try { await sendCheckin(p) } catch { remaining.push(p) }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining))
}

const fieldClass = 'w-full py-3.75 px-4 border-[1.5px] border-line rounded-xl bg-white text-base font-sans text-inherit transition-[.15s] outline-none focus:border-orange focus:shadow-focus'
const primaryBtnClass = 'flex items-center justify-center gap-2 w-full p-4.25 rounded-[14px] bg-orange text-white font-extrabold text-base tracking-[-.01em] transition-[.15s] hover:bg-orange-deep disabled:opacity-55 disabled:cursor-wait'
const ghostBtnClass = 'flex items-center justify-center gap-2 w-full rounded-[14px] bg-transparent text-ink font-semibold text-sm p-3 transition-[.15s] hover:text-orange'
const footClass = 'mt-auto pt-5.5 text-center font-mono text-[10px] tracking-[.12em] uppercase text-muted-faint'

export default function CheckinApp() {
  const [KIOSK] = useState(() => new URLSearchParams(window.location.search).has('kiosk'))
  const kioskTimerRef = useRef(null)

  const [screen, setScreen] = useState('phone')
  const [offline, setOffline] = useState(!navigator.onLine)

  const [phone, setPhone] = useState('')
  const [phoneErr, setPhoneErr] = useState(false)
  const [continuing, setContinuing] = useState(false)
  const [returning, setReturning] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [doneSteps, setDoneSteps] = useState([])

  const [fullname, setFullname] = useState('')
  const [nameErr, setNameErr] = useState(false)
  const [email, setEmail] = useState('')
  const [firstTime, setFirstTime] = useState(null)
  const [heard, setHeard] = useState(HEARD_OPTIONS[0])

  const [step, setStep] = useState(null)
  const [stepsShake, setStepsShake] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [doneTitle, setDoneTitle] = useState('')
  const [doneSub, setDoneSub] = useState('')

  useEffect(() => {
    flushQueue()
    window.addEventListener('online', flushQueue)
    return () => window.removeEventListener('online', flushQueue)
  }, [])

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])

  const handlePhoneContinue = async () => {
    const raw = phone.trim()
    const digits = raw.replace(/\D/g, '')
    if (digits.length < 10) { setPhoneErr(true); return }
    setPhoneErr(false)
    setContinuing(true)
    let found = false
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase.rpc('lookup_person', { p_phone: raw })
        if (!error && data && data.found) {
          found = true
          setReturning(true)
          setFirstName(data.first_name || '')
          setDoneSteps(data.steps || [])
        }
      } catch { /* fall through to new-visitor flow */ }
    }
    setContinuing(false)
    if (found) { setScreen('step') }
    else { setReturning(false); setDoneSteps([]); setScreen('details') }
  }

  const handleDetailsContinue = () => {
    if (!fullname.trim()) { setNameErr(true); return }
    setNameErr(false)
    setScreen('step')
  }

  const resetForm = () => {
    clearTimeout(kioskTimerRef.current)
    setPhone(''); setFullname(''); setEmail('')
    setReturning(false); setFirstName(''); setDoneSteps([]); setStep(null); setFirstTime(null)
    setPhoneErr(false); setNameErr(false)
    setScreen('phone')
  }

  const handleSubmit = async () => {
    if (!step) {
      setStepsShake(true)
      setTimeout(() => setStepsShake(false), 900)
      return
    }
    const payload = {
      p_phone: phone,
      p_step: step,
      p_name: returning ? null : fullname.trim(),
      p_email: returning ? null : email.trim(),
      p_first_time: returning ? false : firstTime === true,
      p_heard: (!returning && firstTime) ? heard : null,
    }
    setSubmitting(true)
    const first = returning ? firstName : (payload.p_name || '').split(' ')[0]
    const stepTitle = STEPS[step - 1].title
    try {
      if (!navigator.onLine) throw new Error('offline')
      const res = await sendCheckin(payload)
      if (res && res.ok === false) {
        setSubmitting(false)
        if (res.error === 'name_required') { setScreen('details'); setNameErr(true) }
        else alert("Something didn't look right — please check your details and try again.")
        return
      }
      setDoneTitle(res && res.already ? `Already in, ${first}!` : `You're in, ${first}.`)
      setDoneSub(res && res.already
        ? "You were already checked in today. Grab a seat — we're glad you're here."
        : `Checked in for Step ${step} — ${stepTitle}. Grab a seat, grab a snack. We're so glad you're here.`)
    } catch {
      queueCheckin(payload)
      setDoneTitle(`You're in, ${first}.`)
      setDoneSub(`Checked in for Step ${step} — ${stepTitle}. (Saved on this phone — it will send automatically when you're back online.)`)
    }
    setSubmitting(false)
    setScreen('done')
    if (KIOSK) {
      setDoneSub((s) => s + ' This screen resets in a few seconds for the next person.')
      clearTimeout(kioskTimerRef.current)
      kioskTimerRef.current = setTimeout(resetForm, 8000)
    }
  }

  return (
    <div className="min-h-dvh font-sans bg-cream text-ink text-base leading-[1.55] antialiased flex flex-col relative overflow-x-hidden p-[max(18px,env(safe-area-inset-top))_20px_max(24px,env(safe-area-inset-bottom))] before:content-[''] before:fixed before:left-[-30vw] before:right-[-30vw] before:bottom-[-42vh] before:h-[70vh] before:bg-orange before:rounded-[999px_999px_0_0] before:opacity-5 before:pointer-events-none">
      <div className="w-full max-w-[430px] mx-auto flex flex-col flex-1">
        <div className="flex items-center gap-2.5 py-1.5 pb-1">
          <img src="/images/logo.png" alt="Rig Church Lagos" className="h-8 w-auto block" />
        </div>

        {screen === 'phone' && (
          <section className="flex-1 flex flex-col animate-fade-checkin">
            <div className="pt-[8vh] pb-4.5">
              <div className="font-mono text-[10.5px] font-semibold tracking-[.16em] uppercase text-orange">Next Steps · Sunday check-in</div>
              <h1 className="text-[clamp(38px,11vw,48px)] font-black tracking-[-.035em] leading-[.98] text-ink-deep mt-2.5">You belong <em className="not-italic text-orange">here.</em></h1>
              <p className="mt-3 text-[15.5px] text-checkin-lead max-w-[32ch]">Welcome home. Check in below — it takes less than a minute.</p>
            </div>
            <div className="mt-4">
              <label htmlFor="phone" className="block text-[12.5px] font-bold mb-1.75 text-ink-deep">Your phone number</label>
              <input
                id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 000 0000" enterKeyHint="go"
                value={phone} onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePhoneContinue() }}
                className={fieldClass}
              />
              {phoneErr && <div className="mt-2 text-[12.5px] font-semibold text-orange-deep">Please enter a valid phone number.</div>}
              {/* Meta classifies our follow-up template as Marketing, which expects
                  people to have been told they'll be messaged. Keep this visible. */}
              <p className="mt-2.5 text-[12px] leading-[1.45] text-checkin-lead">
                We'll send you a WhatsApp message after Next Steps to say hello. Nothing else, and you can tell us to stop any time.
              </p>
            </div>
            <button type="button" disabled={continuing} onClick={handlePhoneContinue} className={`${primaryBtnClass} mt-4.5`}>
              {continuing ? 'One moment…' : 'Continue'}
            </button>
            {offline && (
              <div className="mt-3.5 py-2.75 px-3.5 rounded-xl bg-amber-bg border-[1.5px] border-amber-border text-[12.5px] font-semibold text-amber-text">
                You're offline right now — no problem. Your check-in will be saved on this phone and sent automatically once you're back online.
              </div>
            )}
            <div className={footClass}>Rig Church Lagos · Next Steps</div>
          </section>
        )}

        {screen === 'details' && (
          <section className="flex-1 flex flex-col animate-fade-checkin">
            <div className="pt-[5vh]">
              <div className="font-mono text-[10.5px] font-semibold tracking-[.16em] uppercase text-orange">First things first</div>
              <h2 className="text-[clamp(26px,7.5vw,30px)] font-black tracking-[-.03em] leading-[1.05] text-ink-deep mt-2">Nice to meet you.</h2>
            </div>
            <div className="mt-4">
              <label htmlFor="fullname" className="block text-[12.5px] font-bold mb-1.75 text-ink-deep">Full name</label>
              <input id="fullname" type="text" autoComplete="name" placeholder="Ada Obi" enterKeyHint="next" value={fullname} onChange={(e) => setFullname(e.target.value)} className={fieldClass} />
              {nameErr && <div className="mt-2 text-[12.5px] font-semibold text-orange-deep">Please enter your name.</div>}
            </div>
            <div className="mt-4">
              <label htmlFor="email" className="block text-[12.5px] font-bold mb-1.75 text-ink-deep">Email address <span className="font-medium text-muted-label">(optional)</span></label>
              <input id="email" type="email" autoComplete="email" placeholder="ada@email.com" enterKeyHint="next" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
            </div>
            <div className="mt-4">
              <label className="block text-[12.5px] font-bold mb-1.75 text-ink-deep">Is this your first time at Rig Church?</label>
              <div className="flex gap-2 mt-1.5">
                <button type="button" onClick={() => setFirstTime(true)} className={`flex-1 py-3.25 px-2 rounded-xl border-[1.5px] font-bold text-sm transition-[.15s] ${firstTime === true ? 'bg-ink-deep border-ink-deep text-white' : 'bg-white border-line text-ink'}`}>Yes, first time</button>
                <button type="button" onClick={() => setFirstTime(false)} className={`flex-1 py-3.25 px-2 rounded-xl border-[1.5px] font-bold text-sm transition-[.15s] ${firstTime === false ? 'bg-ink-deep border-ink-deep text-white' : 'bg-white border-line text-ink'}`}>I've been before</button>
              </div>
            </div>
            {firstTime === true && (
              <div className="mt-4">
                <label htmlFor="heard" className="block text-[12.5px] font-bold mb-1.75 text-ink-deep">How did you hear about us?</label>
                <select id="heard" value={heard} onChange={(e) => setHeard(e.target.value)} className={`${fieldClass} appearance-none`} style={selectArrowStyle}>
                  {HEARD_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            )}
            <button type="button" onClick={handleDetailsContinue} className={`${primaryBtnClass} mt-4.5`}>Continue</button>
            <button type="button" onClick={() => setScreen('phone')} className={`${ghostBtnClass} mt-1`}>Back</button>
          </section>
        )}

        {screen === 'step' && (
          <section className="flex-1 flex flex-col animate-fade-checkin">
            <div className="pt-[5vh]">
              <div className="font-mono text-[10.5px] font-semibold tracking-[.16em] uppercase text-orange">One last thing</div>
              <h2 className="text-[clamp(26px,7.5vw,30px)] font-black tracking-[-.03em] leading-[1.05] text-ink-deep mt-2">Which step are you here for?</h2>
            </div>
            {returning && (
              <div className="mt-5 mb-0.5 py-4 px-4.5 rounded-2xl bg-green-soft border-[1.5px] border-welcome-border text-sm">
                <b className="text-green">Welcome back, {firstName}!</b><br />
                We've got your details{doneSteps.length ? ` — step${doneSteps.length > 1 ? 's' : ''} ${doneSteps.join(' & ')} already done` : ''}. Just pick today's step.
              </div>
            )}
            <div className={`grid gap-2.25 mt-3 ${stepsShake ? 'outline outline-2 outline-orange' : ''}`}>
              {STEPS.map((s) => (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => setStep(s.n)}
                  className={`flex items-center gap-3.25 text-left w-full py-3.5 px-3.75 rounded-[13px] border-[1.5px] transition-[.15s] ${step === s.n ? 'border-orange bg-orange-soft' : 'border-line bg-white'}`}
                >
                  <div className={`w-8.5 h-10 flex-none grid place-items-center rounded-arch font-black text-[15px] ${step === s.n ? 'bg-orange text-white' : 'bg-cream text-ink-deep'}`}>{s.n}</div>
                  <div>
                    <div className="font-extrabold text-[14.5px] tracking-[-.01em] leading-[1.25] text-ink-deep">
                      {s.title}
                      {doneSteps.includes(s.n) && <span className="inline-block ml-1.5 py-0.5 px-2 rounded-full bg-green-soft text-green text-[10px] font-extrabold align-[2px]">done</span>}
                    </div>
                    <div className="text-[11.5px] text-muted-label mt-0.25">{s.video}</div>
                  </div>
                </button>
              ))}
            </div>
            <button type="button" disabled={submitting} onClick={handleSubmit} className={`${primaryBtnClass} mt-4.5`}>
              {submitting ? 'Checking you in…' : 'Check me in'}
            </button>
            <button type="button" onClick={() => setScreen('phone')} className={`${ghostBtnClass} mt-1`}>Back</button>
          </section>
        )}

        {screen === 'done' && (
          <section className="flex-1 flex flex-col animate-fade-checkin">
            <div className="flex-1 flex flex-col justify-center text-center py-5">
              <div className="w-23 h-26.5 mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-orange rounded-arch" />
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute inset-0 m-auto w-10.5 h-10.5"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <h2 className="text-[clamp(30px,9vw,36px)] font-black tracking-[-.03em] leading-[1.05] text-ink-deep mt-2">{doneTitle}</h2>
              <p className="mt-3 text-checkin-lead text-[15px]">{doneSub}</p>
              <button type="button" onClick={resetForm} className={`${ghostBtnClass} mt-5.5`}>Check in another person</button>
            </div>
            <div className={footClass}>Rig Church Lagos · Next Steps</div>
          </section>
        )}
      </div>
    </div>
  )
}
