import { useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useCurrentUser } from '#/hooks/useAuth'
import { useActiveApprovedRequests } from '#/queries/requests'
import { toCalendarLeaves } from '#/lib/calendar'
import { getDirectReports } from '#/store/users'
import { PageHeader, PageLoader } from '#/components/ui/Feedback'
import { CalendarView } from '#/components/calendar/CalendarView'

export const Route = createFileRoute('/_auth/manager/calendar')({
  component: TeamCalendar,
})

function TeamCalendar() {
  const manager = useCurrentUser()
  const { data: requests, isPending } = useActiveApprovedRequests()

  const teamIds = useMemo(
    () => new Set(getDirectReports(manager.id).map((u) => u.id)),
    [manager.id],
  )

  if (isPending) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Company calendar"
        description="Approved leave across the company. Leave types shown for your team only."
      />
      <CalendarView
        leaves={toCalendarLeaves(requests ?? [], {
          canSeeType: (employeeId) => teamIds.has(employeeId),
        })}
      />
    </div>
  )
}
