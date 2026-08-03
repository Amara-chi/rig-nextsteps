import { CHURCH_NAME } from '../config/site.js'

export default function CheckinApp() {
  return (
    <div className="min-h-screen bg-cream text-ink font-sans flex items-center justify-center">
      <p className="text-ink-deep font-bold">{CHURCH_NAME} — Check-in (scaffold placeholder)</p>
    </div>
  )
}
