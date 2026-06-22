import { createFileRoute } from '@tanstack/react-router'
import { useCurrentUser } from '#/hooks/useAuth'
import { useRequestsByManager } from '#/queries/requests'
import { toCalendarLeaves } from '#/lib/calendar'
import { PageHeader, PageLoader } from '#/components/ui/Feedback'
import { CalendarView } from '#/components/calendar/CalendarView'

export const Route = createFileRoute('/_auth/manager/calendar')({
  component: TeamCalendar,
})

function TeamCalendar() {
  const manager = useCurrentUser()
  const { data: requests, isPending } = useRequestsByManager(manager.id)

  if (isPending) return <PageLoader />

  const active = (requests ?? []).filter(
    (r) => r.status === 'approved' || r.status === 'cancel_pending',
  )

  return (
    <div>
      <PageHeader
        title="Team calendar"
        description="Approved leave across your team."
      />
      <CalendarView leaves={toCalendarLeaves(active)} />
    </div>
  )
}
