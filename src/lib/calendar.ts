import type { LeaveRequest } from '#/types'
import type { CalendarLeave } from '#/components/calendar/CalendarView'
import { getUserById } from '#/store/users'

export interface CalendarVisibility {
  /**
   * Decide whether the viewer may see the leave *type* for a given employee.
   * Names are always visible. Defaults to always-visible when omitted.
   */
  canSeeType?: (employeeId: string) => boolean
}

/** Expand approved/active requests into one CalendarLeave per date. */
export function toCalendarLeaves(
  requests: LeaveRequest[],
  { canSeeType }: CalendarVisibility = {},
): CalendarLeave[] {
  const out: CalendarLeave[] = []
  for (const req of requests) {
    const name = getUserById(req.employeeId)?.name ?? 'Unknown'
    const showType = canSeeType ? canSeeType(req.employeeId) : true
    for (const entry of req.currentVersion.dates) {
      out.push({
        requestId: req.id,
        employeeName: name,
        leaveType: req.currentVersion.leaveType,
        date: entry.date,
        duration: entry.duration,
        showType,
      })
    }
  }
  return out
}
