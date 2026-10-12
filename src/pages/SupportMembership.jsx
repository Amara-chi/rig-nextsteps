import PageHead from '../components/PageHead.jsx'
import SupportPersonList from '../components/SupportPersonList.jsx'

export default function SupportMembership({ list, hadError, refresh, conversations, refreshMessages }) {
  return (
    <>
      <PageHead title="Membership" sub="Completed all 4 steps — in the window, ready, or already welcomed." />
      <SupportPersonList list={list} context="membership" hadError={hadError} refresh={refresh} conversations={conversations} refreshMessages={refreshMessages} />
    </>
  )
}
