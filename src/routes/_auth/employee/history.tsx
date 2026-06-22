import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { CalendarPlus, Inbox } from 'lucide-react'
import type { RequestStatus } from '#/types'
import { useCurrentUser } from '#/hooks/useAuth'
import { useRequestsByUser } from '#/queries/requests'
import { Button } from '#/components/ui/Button'
import { Tabs } from '#/components/ui/Tabs'
import { EmptyState, PageHeader, PageLoader } from '#/components/ui/Feedback'
import { LeaveRequestCard } from '#/components/leave/LeaveRequestCard'

export const Route = createFileRoute('/_auth/employee/history')({
  component: History,
})

type Filter = 'all' | 'pending' | 'approved' | 'other'

const MATCH: Record<Filter, (s: RequestStatus) => boolean> = {
  all: () => true,
  pending: (s) => s === 'pending' || s === 'cancel_pending',
  approved: (s) => s === 'approved',
  other: (s) => s === 'rejected' || s === 'cancelled' || s === 'cancel_approved',
}

function History() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const { data: requests, isPending } = useRequestsByUser(user.id)
  const [filter, setFilter] = useState<Filter>('all')

  if (isPending) return <PageLoader />
  const all = requests ?? []
  const filtered = all.filter((r) => MATCH[filter](r.status))

  return (
    <div>
      <PageHeader
        title="My requests"
        description="All your leave requests and their status."
        action={
          <Button
            icon={<CalendarPlus className="size-4" />}
            onClick={() => navigate({ to: '/employee/request/new' })}
          >
            Request leave
          </Button>
        }
      />

      <Tabs<Filter>
        className="mb-4"
        value={filter}
        onChange={setFilter}
        items={[
          { value: 'all', label: 'All', count: all.length },
          {
            value: 'pending',
            label: 'Pending',
            count: all.filter((r) => MATCH.pending(r.status)).length,
          },
          {
            value: 'approved',
            label: 'Approved',
            count: all.filter((r) => MATCH.approved(r.status)).length,
          },
          { value: 'other', label: 'Closed' },
        ]}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-8" />}
          title="Nothing here"
          description="No requests match this filter."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((r) => (
            <LeaveRequestCard
              key={r.id}
              request={r}
              to={`/employee/request/${r.id}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
