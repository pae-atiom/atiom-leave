// Pure leave-calculation functions. No store access, no React, no I/O — fully
// unit-testable. The reactive React adapter lives in src/hooks/useLeaveCalculation.ts.

import type {
  DateEntry,
  DayDuration,
  LeaveBalance,
  LeavePolicy,
  LeaveTypeName,
} from '#/types'

// Day weight per duration. NOTE: hourly leave is out of scope for the POC — if
// added, this map gains finer-grained fractions. (TODO: hourly support.)
export const DURATION_DAYS: Record<DayDuration, number> = {
  full: 1,
  morning_half: 0.5,
  afternoon_half: 0.5,
}

export const DURATION_LABEL: Record<DayDuration, string> = {
  full: 'Full day',
  morning_half: 'Morning (half)',
  afternoon_half: 'Afternoon (half)',
}

/** Total leave days across a set of per-date entries (half-day = 0.5). */
export function calculateTotalDays(dates: DateEntry[]): number {
  return dates.reduce((sum, entry) => sum + DURATION_DAYS[entry.duration], 0)
}

/** Remaining balance = entitlement + manual adjustment − used. */
export function getRemainingDays(balance: LeaveBalance): number {
  return balance.totalEntitled + balance.manualAdjustment - balance.used
}

export interface SummaryDate {
  date: string
  duration: DayDuration
  days: number
}

export interface SubmitSummary {
  leaveType: LeaveTypeName
  leaveLabel: string
  dates: SummaryDate[]
  totalDays: number
  currentBalance: number // remaining before deduction
  balanceAfter: number // remaining after deduction
  willExceedBalance: boolean
  isPaid: boolean
}

/**
 * Build the pre-submit confirmation summary the employee must approve before
 * the request is sent. Unpaid leave (LWOP) never exceeds balance.
 */
export function buildSubmitSummary(
  dates: DateEntry[],
  leaveType: LeaveTypeName,
  policy: LeavePolicy,
  balance: LeaveBalance | null,
): SubmitSummary {
  const totalDays = calculateTotalDays(dates)
  const remaining = balance ? getRemainingDays(balance) : 0
  const balanceAfter = remaining - totalDays
  return {
    leaveType,
    leaveLabel: policy.label,
    dates: dates.map((e) => ({
      date: e.date,
      duration: e.duration,
      days: DURATION_DAYS[e.duration],
    })),
    totalDays,
    currentBalance: remaining,
    balanceAfter,
    willExceedBalance: policy.isPaid && balanceAfter < 0,
    isPaid: policy.isPaid,
  }
}

/** Deduct days from a balance (on approval). Returns a new object. */
export function deductFromBalance(
  balance: LeaveBalance,
  days: number,
): LeaveBalance {
  return { ...balance, used: balance.used + days }
}

/** Restore days to a balance (on cancellation approval). Floors `used` at 0. */
export function restoreToBalance(
  balance: LeaveBalance,
  days: number,
): LeaveBalance {
  return { ...balance, used: Math.max(0, balance.used - days) }
}
