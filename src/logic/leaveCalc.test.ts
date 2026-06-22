import { describe, expect, it } from 'vitest'
import {
  buildSubmitSummary,
  calculateTotalDays,
  deductFromBalance,
  getRemainingDays,
  restoreToBalance,
} from './leaveCalc'
import type { DateEntry, LeaveBalance, LeavePolicy } from '#/types'

const annualPolicy: LeavePolicy = {
  id: 'pol_annual',
  leaveType: 'annual',
  label: 'Annual Leave',
  annualEntitlementDays: 15,
  maxPerYearDays: null,
  requiresDocument: false,
  requiresManagerApproval: true,
  isPaid: true,
  notes: '',
}

const lwopPolicy: LeavePolicy = {
  ...annualPolicy,
  id: 'pol_lwop',
  leaveType: 'lwop',
  label: 'Leave Without Pay',
  annualEntitlementDays: 0,
  isPaid: false,
}

function balance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'bal_1',
    userId: 'u1',
    leaveType: 'annual',
    year: 2026,
    totalEntitled: 15,
    used: 0,
    manualAdjustment: 0,
    ...overrides,
  }
}

describe('calculateTotalDays', () => {
  it('counts full days as 1', () => {
    const dates: DateEntry[] = [
      { date: '2026-06-22', duration: 'full' },
      { date: '2026-06-23', duration: 'full' },
    ]
    expect(calculateTotalDays(dates)).toBe(2)
  })

  it('counts half-days as 0.5', () => {
    expect(
      calculateTotalDays([{ date: '2026-06-22', duration: 'morning_half' }]),
    ).toBe(0.5)
    expect(
      calculateTotalDays([{ date: '2026-06-22', duration: 'afternoon_half' }]),
    ).toBe(0.5)
  })

  it('sums mixed entries', () => {
    const dates: DateEntry[] = [
      { date: '2026-06-22', duration: 'full' },
      { date: '2026-06-23', duration: 'morning_half' },
      { date: '2026-06-24', duration: 'afternoon_half' },
    ]
    expect(calculateTotalDays(dates)).toBe(2)
  })

  it('returns 0 for an empty array', () => {
    expect(calculateTotalDays([])).toBe(0)
  })
})

describe('getRemainingDays', () => {
  it('subtracts used and applies manual adjustment', () => {
    expect(getRemainingDays(balance({ used: 3, manualAdjustment: 2 }))).toBe(14)
  })
})

describe('buildSubmitSummary', () => {
  it('computes total, current and after balances', () => {
    const dates: DateEntry[] = [
      { date: '2026-06-22', duration: 'full' },
      { date: '2026-06-23', duration: 'morning_half' },
    ]
    const summary = buildSubmitSummary(
      dates,
      'annual',
      annualPolicy,
      balance({ used: 5 }),
    )
    expect(summary.totalDays).toBe(1.5)
    expect(summary.currentBalance).toBe(10)
    expect(summary.balanceAfter).toBe(8.5)
    expect(summary.willExceedBalance).toBe(false)
  })

  it('flags over-balance for paid leave', () => {
    const dates: DateEntry[] = Array.from({ length: 12 }, (_, i) => ({
      date: `2026-06-${String(i + 1).padStart(2, '0')}`,
      duration: 'full' as const,
    }))
    const summary = buildSubmitSummary(
      dates,
      'annual',
      annualPolicy,
      balance({ used: 5 }),
    )
    expect(summary.balanceAfter).toBe(-2)
    expect(summary.willExceedBalance).toBe(true)
  })

  it('never flags over-balance for unpaid leave (LWOP)', () => {
    const dates: DateEntry[] = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, '0')}`,
      duration: 'full' as const,
    }))
    const summary = buildSubmitSummary(
      dates,
      'lwop',
      lwopPolicy,
      balance({ leaveType: 'lwop', totalEntitled: 0 }),
    )
    expect(summary.willExceedBalance).toBe(false)
  })

  it('handles a missing balance gracefully', () => {
    const summary = buildSubmitSummary(
      [{ date: '2026-06-22', duration: 'full' }],
      'annual',
      annualPolicy,
      null,
    )
    expect(summary.currentBalance).toBe(0)
    expect(summary.balanceAfter).toBe(-1)
  })
})

describe('deductFromBalance / restoreToBalance', () => {
  it('deduct increases used by the given days', () => {
    expect(deductFromBalance(balance({ used: 2 }), 1.5).used).toBe(3.5)
  })

  it('restore decreases used and floors at 0', () => {
    expect(restoreToBalance(balance({ used: 2 }), 1.5).used).toBe(0.5)
    expect(restoreToBalance(balance({ used: 1 }), 5).used).toBe(0)
  })
})
