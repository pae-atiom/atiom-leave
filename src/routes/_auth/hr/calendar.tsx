import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useActiveApprovedRequests } from '#/queries/requests'
import { toCalendarLeaves } from '#/lib/calendar'
import { PageHeader, PageLoader } from '#/components/ui/Feedback'
import { CalendarView } from '#/components/calendar/CalendarView'

export const Route = createFileRoute('/_auth/hr/calendar')({
  component: CompanyCalendar,
})

function CompanyCalendar() {
  const { data: requests, isPending } = useActiveApprovedRequests()
  const [privacy, setPrivacy] = useState(false)

  if (isPending) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Company calendar"
        description="All approved leave across the company."
      />
      <CalendarView
        leaves={toCalendarLeaves(requests ?? [])}
        privacy={privacy}
        onTogglePrivacy={() => setPrivacy((v) => !v)}
      />
    </div>
  )
}
