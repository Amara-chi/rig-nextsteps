// Recharts' default tooltip is unstyled generic HTML — this restyles it to
// match the app's card language (see marks-and-anatomy: text always wears
// text tokens, never the series color).
export default function ChartTooltip({ active, payload, render }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-white border border-line rounded-[10px] py-2 px-3 shadow-card text-[12px]">
      {render(payload[0].payload)}
    </div>
  )
}
