import type { LeaveRequest } from '#/types'
import type { CalendarLeave } from '#/components/calendar/CalendarView'
import { getUserById } from '#/store/users'

/** Expand approved/active requests into one CalendarLeave per date. */
export function toCalendarLeaves(requests: LeaveRequest[]): CalendarLeave[] {
  const out: CalendarLeave[] = []
  for (const req of requests) {
    const name = getUserById(req.employeeId)?.name ?? 'Unknown'
    for (const entry of req.currentVersion.dates) {
      out.push({
        requestId: req.id,
        employeeName: name,
        leaveType: req.currentVersion.leaveType,
        date: entry.date,
        duration: entry.duration,
      })
    }
  }
  return out
}
