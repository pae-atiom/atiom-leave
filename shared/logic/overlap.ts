import type { LeaveRequest } from '../types'

const ACTIVE: LeaveRequest['status'][] = [
  'pending',
  'approved',
  'cancel_pending',
]

function dateSet(req: LeaveRequest): Set<string> {
  return new Set(req.currentVersion.dates.map((d) => d.date))
}

/**
 * Other active requests that share at least one date with the target — used to
 * warn a manager when several team members are off at the same time.
 */
export function findOverlaps(
  target: LeaveRequest,
  pool: LeaveRequest[],
): LeaveRequest[] {
  const targetDates = dateSet(target)
  return pool.filter((r) => {
    if (r.id === target.id) return false
    if (r.employeeId === target.employeeId) return false
    if (!ACTIVE.includes(r.status)) return false
    return r.currentVersion.dates.some((d) => targetDates.has(d.date))
  })
}
