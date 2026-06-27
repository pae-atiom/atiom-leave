import { createFileRoute } from '@tanstack/react-router'
import { useActiveApprovedRequests } from '#/queries/requests'
import { toCalendarLeaves } from '#/lib/calendar'
import { PageHeader, PageLoader } from '#/components/ui/Feedback'
import { CalendarView } from '#/components/calendar/CalendarView'

export const Route = createFileRoute('/_auth/employee/calendar')({
  component: CompanyCalendar,
})

function CompanyCalendar() {
  const { data: requests, isPending } = useActiveApprovedRequests()

  if (isPending) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Company calendar"
        description="Who's off across the company."
      />
      <CalendarView
        leaves={toCalendarLeaves(requests ?? [], { canSeeType: () => false })}
      />
    </div>
  )
}
