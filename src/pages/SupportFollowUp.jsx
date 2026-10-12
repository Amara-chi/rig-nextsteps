import PageHead from '../components/PageHead.jsx'
import SupportPersonList from '../components/SupportPersonList.jsx'

export default function SupportFollowUp({ list, hadError, refresh, conversations, refreshMessages }) {
  return (
    <>
      <PageHead title="Follow Up" sub="A pending message, awaiting an outcome, or a no-show." />
      <SupportPersonList list={list} context="followup" hadError={hadError} refresh={refresh} conversations={conversations} refreshMessages={refreshMessages} />
    </>
  )
}
