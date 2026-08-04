export default function StatTile({ label, value, detail }) {
  return (
    <div className="bg-white border border-line rounded-[14px] py-4 px-4.5 shadow-card">
      <div className="font-mono text-[9.5px] tracking-[.12em] uppercase text-muted-label font-semibold">{label}</div>
      <div className="text-[30px] font-black tracking-[-.03em] text-ink-deep mt-0.75 leading-none">{value}</div>
      {detail && <div className="text-[11px] text-muted-label mt-1">{detail}</div>}
    </div>
  )
}
