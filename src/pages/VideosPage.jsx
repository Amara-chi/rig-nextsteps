import PageHead, { Breadcrumb, CrumbLink } from '../components/PageHead.jsx'

export default function VideosPage({ onNavigate }) {
  return (
    <>
      <PageHead
        crumb={<Breadcrumb><CrumbLink onClick={() => onNavigate('today')}>Today</CrumbLink> / Videos</Breadcrumb>}
        title="Videos"
        sub="Each step's teaching video, for reference or catching up."
      />
      <div className="text-muted-faint text-sm">Videos pane — coming soon.</div>
    </>
  )
}
