// Google Drive share links, in every shape Drive hands out: /file/d/<id>/view,
// /open?id=<id>, /uc?id=<id>. The id is 25-44 chars in practice.
const DRIVE = /(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^&]*&)*id=)([\w-]{10,})/

export function toEmbed(url) {
  if (!url) return null
  let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/)
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1`
  m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (m) return `https://player.vimeo.com/video/${m[1]}`
  // Drive only plays inside its own /preview iframe. There is no direct file
  // URL to feed a <video> tag: the old uc?export=download trick serves an
  // HTML interstitial (virus-scan / quota notice) rather than a video stream
  // for anything Drive considers a large file, so a <video src> on it just
  // shows a broken player. Convert whatever was pasted to /preview instead.
  m = url.match(DRIVE)
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`
  return url // already an embed link
}

export function isDirectVideo(url) {
  return /\.(mp4|webm|ogv|ogg|mov|m4v)(\?.*)?$/i.test(url || '')
}

export function isDriveVideo(url) {
  return DRIVE.test(url || '')
}

// Names the source for the fallback button's label, so a Drive link doesn't
// get announced as "Stream from YouTube instead".
export function videoSourceName(url) {
  if (isDriveVideo(url)) return 'Google Drive'
  if (/vimeo\.com/.test(url || '')) return 'Vimeo'
  if (/youtu\.?be/.test(url || '')) return 'YouTube'
  return 'the backup link'
}
