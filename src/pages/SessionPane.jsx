import PageHead, { Breadcrumb, CrumbLink } from '../components/PageHead.jsx'

export default function SessionPane({ onNavigate }) {
  return (
    <>
      <PageHead
        crumb={<Breadcrumb><CrumbLink onClick={() => onNavigate('session')}>Today</CrumbLink> / Check-in</Breadcrumb>}
        title="Check-in"
        sub="Open today's step, put the QR on the TV, watch people arrive."
      />
      <div className="text-muted-faint text-sm">Check-in pane — coming soon.</div>
    </>
  )
}
