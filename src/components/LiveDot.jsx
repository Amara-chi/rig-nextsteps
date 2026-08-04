export default function LiveDot({ className = '' }) {
  return <span className={`inline-block w-2 h-2 rounded-full bg-green mr-1.75 animate-pulse-slow ${className}`} />
}
