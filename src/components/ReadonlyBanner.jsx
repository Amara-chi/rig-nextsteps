// Shown for the leader role only: director has full write access, and
// support is not read-only (it sends messages and logs outcomes), so the
// banner was wrong there and was dropped from that view on 12 Oct 2026.
// Old app toggled this via a body.leader/body.support CSS
// rule; here it's a plain conditional render in App.jsx.
export default function ReadonlyBanner() {
  return (
    <div className="flex items-center gap-2.5 mb-5 py-2.75 px-3.75 rounded-xl bg-orange-soft border-[1.5px] border-[#F3C3B0] text-[12.5px] font-semibold text-orange-deep">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="flex-none">
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
      Read-only view — you can add notes on people, but records can only be edited by the Next Steps Admin.
    </div>
  )
}
