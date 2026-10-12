import PageHead from '../components/PageHead.jsx'
import SupportPersonList from '../components/SupportPersonList.jsx'

export default function SupportHouseChurch({ list, hadError, refresh, conversations, refreshMessages }) {
  return (
    <>
      <PageHead title="House Church" sub="Everyone who's expressed interest." />
      <SupportPersonList list={list} context="hc" hadError={hadError} refresh={refresh} conversations={conversations} refreshMessages={refreshMessages} />
    </>
  )
}
