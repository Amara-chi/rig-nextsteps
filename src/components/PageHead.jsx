export function Breadcrumb({ children }) {
  return <div className="font-mono text-[10px] tracking-[.08em] uppercase text-muted-label font-semibold mb-1.5">{children}</div>
}

export function CrumbLink({ onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="bg-transparent border-0 p-0 font-inherit text-inherit cursor-pointer hover:text-orange hover:underline">
      {children}
    </button>
  )
}

export default function PageHead({ crumb, title, sub, right }) {
  return (
    <div className="mb-5.5 flex items-end justify-between gap-4 flex-wrap">
      <div>
        {crumb}
        <h1 className="text-[clamp(26px,4.5vw,34px)] font-black tracking-[-.03em] text-ink-deep leading-[1.05]">{title}</h1>
        {sub && <p className="mt-1.25 text-muted-sub text-sm">{sub}</p>}
      </div>
      {right}
    </div>
  )
}
