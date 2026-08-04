export function toEmbed(url) {
  if (!url) return null
  let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/)
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1`
  m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (m) return `https://player.vimeo.com/video/${m[1]}`
  return url // already an embed link
}

export function isDirectVideo(url) {
  return /\.(mp4|webm|ogv|ogg|mov|m4v)(\?.*)?$/i.test(url || '')
}
