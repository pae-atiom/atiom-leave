import { useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useCurrentUser } from '#/hooks/useAuth'
import { useActiveApprovedRequests } from '#/queries/requests'
import { useDirectReports, useUsers } from '#/queries/directory'
import { toCalendarLeaves } from '#/lib/calendar'
import { PageHeader, PageLoader } from '#/components/ui/Feedback'
import { CalendarView } from '#/components/calendar/CalendarView'

export const Route = createFileRoute('/_auth/manager/calendar')({
  component: TeamCalendar,
})

function TeamCalendar() {
  const manager = useCurrentUser()
  const { data: requests, isPending } = useActiveApprovedRequests()
  const { data: users = [] } = useUsers()
  const { data: reports = [] } = useDirectReports(manager.id)

  const teamIds = useMemo(
    () => new Set(reports.map((u) => u.id)),
    [reports],
  )

  if (isPending) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Company calendar"
        description="Approved leave across the company. Leave types shown for your team only."
      />
      <CalendarView
        leaves={toCalendarLeaves(requests ?? [], users, {
          canSeeType: (employeeId) => teamIds.has(employeeId),
        })}
      />
    </div>
  )
}
