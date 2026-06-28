import type { LeaveRequest, User } from '#/types'
import type { CalendarLeave } from '#/components/calendar/CalendarView'

export interface CalendarVisibility {
  /**
   * Decide whether the viewer may see the leave *type* for a given employee.
   * Names are always visible. Defaults to always-visible when omitted.
   */
  canSeeType?: (employeeId: string) => boolean
}

/**
 * Expand approved/active requests into one CalendarLeave per date. Employee
 * names are resolved from the supplied user list (the directory query) rather
 * than a synchronous store lookup.
 */
export function toCalendarLeaves(
  requests: LeaveRequest[],
  users: User[],
  { canSeeType }: CalendarVisibility = {},
): CalendarLeave[] {
  const nameById = new Map(users.map((u) => [u.id, u.name]))
  const out: CalendarLeave[] = []
  for (const req of requests) {
    const name = nameById.get(req.employeeId) ?? 'Unknown'
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
