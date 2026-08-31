import { useRef } from 'react'
import PageHead, { Breadcrumb, CrumbLink } from '../components/PageHead.jsx'
import Card, { CardHead } from '../components/Card.jsx'
import BtnSm from '../components/BtnSm.jsx'
import { STEPS } from '../config/site.js'
import { isDirectVideo, toEmbed, videoSourceName } from '../lib/video.js'

function StepPlayer({ step, onFallback }) {
  const videoRef = useRef(null)

  if (!step.url) {
    return (
      <div className="py-3 px-3.5 rounded-xl bg-cream border-[1.5px] border-dashed border-line text-xs text-muted-sub mb-4">
        No video linked for this step yet. Add a Google Drive share link, a YouTube/Vimeo link, or a direct video file path (e.g. /videos/session-1.mp4), for Step {step.n} in <b>src/config/site.js</b> and it will play right here.
      </div>
    )
  }

  const handleFullscreen = () => {
    const v = videoRef.current
    if (!v) return
    if (v.requestFullscreen) v.requestFullscreen()
    else if (v.webkitRequestFullscreen) v.webkitRequestFullscreen()
    else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen()
  }

  return (
    <>
      <div className="relative aspect-video rounded-[14px] overflow-hidden bg-ink-deep mb-4">
        {isDirectVideo(step.url) ? (
          <>
            <video ref={videoRef} src={step.url} controls playsInline className="absolute inset-0 w-full h-full object-contain bg-black" />
            <button
              type="button"
              onClick={handleFullscreen}
              title="Full screen"
              aria-label="Full screen"
              className="absolute right-2.5 bottom-2.5 w-9 h-9 rounded-[9px] bg-black/55 hover:bg-black/75 text-white flex items-center justify-center z-2 transition-[.15s]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3" />
              </svg>
            </button>
          </>
        ) : (
          <iframe
            src={toEmbed(step.url)}
            title={step.video}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
          />
        )}
      </div>
      {step.fallbackUrl && (
        <BtnSm variant="outline" onClick={() => onFallback(step.fallbackUrl)}>
          {isDirectVideo(step.fallbackUrl) ? 'Play local copy instead' : `Stream from ${videoSourceName(step.fallbackUrl)} instead`}
        </BtnSm>
      )}
    </>
  )
}

export default function VideosPage({ onNavigate, onFallback }) {
  return (
    <>
      <PageHead
        crumb={<Breadcrumb><CrumbLink onClick={() => onNavigate('today')}>Today</CrumbLink> / Videos</Breadcrumb>}
        title="Videos"
        sub="Each step's teaching video, for reference or catching up."
      />
      <div className="space-y-4.5">
        {STEPS.map((s) => (
          <Card key={s.n}>
            <CardHead title={`Step ${s.n} — ${s.title}`} sub={s.video} />
            <StepPlayer step={s} onFallback={onFallback} />
          </Card>
        ))}
      </div>
    </>
  )
}
