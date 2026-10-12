import { useMemo } from 'react'
import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import FollowUp from './FollowUp.jsx'
import { STATUS_LABEL } from '../hooks/useFollowUp.js'

// Support's Follow Up page IS the Follow-Up Centre (org decision, 12 Oct
// 2026): same three tabs, same message preview, same buttons. The only
// difference is where the rows come from. Director/leader read followups,
// checkins and people directly; support has none of that and reads
// v_support_people instead, so this shapes those rows into what FollowUp
// expects and lets the one page do the rest. RLS still scopes every write
// support makes to support_visible_person().
export default function SupportFollowUp({ list, hadError, refresh }) {
  const { attended, awaiting, noshows } = useMemo(() => {
    const asFollowup = (p) => ({
      id: p.open_followup_id,
      status: p.open_followup_status,
      // v_support_people doesn't carry the row's updated_at; FollowUp shows
      // the status alone when it is missing.
      updated_at: null,
      people: { id: p.id, full_name: p.full_name, phone: p.phone },
      checkins: { step: p.open_followup_step },
    })
    const open = list.filter((p) => p.is_awaiting_followup && p.open_followup_id)
    return {
      attended: open.filter((p) => p.open_followup_status === 'pending').map(asFollowup),
      awaiting: open.filter((p) => p.open_followup_status !== 'pending').map(asFollowup),
      noshows: list.filter((p) => p.is_noshow),
    }
  }, [list])

  if (hadError) return <Card className="mb-0"><EmptyState>Couldn't load — check your access.</EmptyState></Card>

  return (
    <FollowUp
      people={list}
      attended={attended}
      awaiting={awaiting}
      noshows={noshows}
      STATUS_LABEL={STATUS_LABEL}
      refresh={refresh}
    />
  )
}
