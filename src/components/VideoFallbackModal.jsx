import Btn from './Btn.jsx'
import { isDirectVideo, toEmbed } from '../lib/video.js'

// The old #yt-modal — a second, simpler modal (no save/cancel, just Close)
// used only for the "Stream from YouTube instead"/"Play local copy instead"
// fallback popup. url is null when closed; closing must unmount the player
// (not just hide it) so playback actually stops, same as the old
// closeFallbackPlayer() emptying #yt-modal-player's innerHTML.
export default function VideoFallbackModal({ url, onClose }) {
  if (!url) return null
  return (
    <div
      className="fixed inset-0 z-200 p-4.5 overflow-auto bg-ink-deep/50 grid place-items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[min(820px,100%)] animate-fade-fast">
        <div className="relative aspect-video rounded-[14px] overflow-hidden bg-ink-deep mb-4">
          {isDirectVideo(url)
            ? <video src={url} controls autoPlay playsInline className="absolute inset-0 w-full h-full object-contain bg-black" />
            : <iframe src={toEmbed(url)} title="Session video (fallback)" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="absolute inset-0 w-full h-full border-0" />}
        </div>
        <Btn variant="secondary" onClick={onClose}>Close</Btn>
      </div>
    </div>
  )
}
