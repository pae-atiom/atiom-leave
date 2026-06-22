import type { LeaveBalance, LeaveTypeName } from '#/types'
import { CURRENT_YEAR, generateId, nowIso } from '#/lib/utils'
import { getStore, mutateStore } from './index'
import { appendAudit } from './auditLog'

export function getBalances(): LeaveBalance[] {
  return getStore().leaveBalances
}

export function getBalancesByUser(
  userId: string,
  year = CURRENT_YEAR,
): LeaveBalance[] {
  return getStore().leaveBalances.filter(
    (b) => b.userId === userId && b.year === year,
  )
}

export function getBalance(
  userId: string,
  leaveType: LeaveTypeName,
  year = CURRENT_YEAR,
): LeaveBalance | undefined {
  return getStore().leaveBalances.find(
    (b) => b.userId === userId && b.leaveType === leaveType && b.year === year,
  )
}

function indexOfBalance(
  store: ReturnType<typeof getStore>,
  userId: string,
  leaveType: LeaveTypeName,
  year: number,
): number {
  return store.leaveBalances.findIndex(
    (b) => b.userId === userId && b.leaveType === leaveType && b.year === year,
  )
}

/** Apply a delta to `used` (positive = deduct, negative = restore). Floors at 0. */
export function applyUsedDelta(
  userId: string,
  leaveType: LeaveTypeName,
  delta: number,
  year = CURRENT_YEAR,
): void {
  mutateStore((store) => {
    const idx = indexOfBalance(store, userId, leaveType, year)
    if (idx === -1) return
    const next = store.leaveBalances[idx].used + delta
    store.leaveBalances[idx] = {
      ...store.leaveBalances[idx],
      used: Math.max(0, next),
    }
  })
}

/**
 * Set a user's base entitlement for a leave type and log it on the audit trail.
 * Entitlement is per-user (e.g. annual leave varies by seniority); the policy's
 * `annualEntitlementDays` is only the company default applied at seed time.
 */
export function setEntitlement(
  userId: string,
  leaveType: LeaveTypeName,
  totalEntitled: number,
  actorId: string,
  year = CURRENT_YEAR,
): LeaveBalance {
  return mutateStore((store) => {
    let idx = indexOfBalance(store, userId, leaveType, year)
    if (idx === -1) {
      store.leaveBalances.push({
        id: generateId('bal'),
        userId,
        leaveType,
        year,
        totalEntitled: 0,
        used: 0,
        manualAdjustment: 0,
      })
      idx = store.leaveBalances.length - 1
    }
    const previous = store.leaveBalances[idx].totalEntitled
    store.leaveBalances[idx] = {
      ...store.leaveBalances[idx],
      totalEntitled,
    }
    appendAudit(store, {
      id: generateId('audit'),
      requestId: `balance:${userId}:${leaveType}`,
      action: 'balance_adjusted',
      actorId,
      timestamp: nowIso(),
      note: `Set ${leaveType} entitlement to ${totalEntitled} day(s) (was ${previous})`,
      fromStatus: null,
      toStatus: 'approved',
    })
    return store.leaveBalances[idx]
  })
}

/** HR manual adjustment: set the adjustment delta and log it on the audit trail. */
export function adjustBalance(
  userId: string,
  leaveType: LeaveTypeName,
  manualAdjustment: number,
  actorId: string,
  year = CURRENT_YEAR,
): LeaveBalance {
  return mutateStore((store) => {
    let idx = indexOfBalance(store, userId, leaveType, year)
    if (idx === -1) {
      store.leaveBalances.push({
        id: generateId('bal'),
        userId,
        leaveType,
        year,
        totalEntitled: 0,
        used: 0,
        manualAdjustment: 0,
      })
      idx = store.leaveBalances.length - 1
    }
    store.leaveBalances[idx] = {
      ...store.leaveBalances[idx],
      manualAdjustment,
    }
    appendAudit(store, {
      id: generateId('audit'),
      requestId: `balance:${userId}:${leaveType}`,
      action: 'balance_adjusted',
      actorId,
      timestamp: nowIso(),
      note: `Set manual adjustment to ${manualAdjustment} day(s) for ${leaveType}`,
      fromStatus: null,
      toStatus: 'approved',
    })
    return store.leaveBalances[idx]
  })
}
