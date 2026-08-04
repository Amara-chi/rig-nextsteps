import { initials } from '../lib/format.js'

// Sized per call site via inline style in the old app (28px in feeds/rows,
// 34px in the sidebar user block) — kept as a size prop rather than
// hardcoding one size, since both are genuinely used.
export default function Avatar({ name, size = 34, fontSize = 12, className = '' }) {
  return (
    <div
      className={`shrink-0 rounded-full bg-orange grid place-items-center font-extrabold text-white ${className}`}
      style={{ width: size, height: size, fontSize }}
    >
      {initials(name)}
    </div>
  )
}
