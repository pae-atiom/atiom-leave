import type { LeavePolicy, LeaveTypeName } from '#/types'
import { getStore, mutateStore } from './index'

export function getLeavePolicies(): LeavePolicy[] {
  return getStore().leavePolicies
}

export function getPolicyByType(
  leaveType: LeaveTypeName,
): LeavePolicy | undefined {
  return getStore().leavePolicies.find((p) => p.leaveType === leaveType)
}

export function updateLeavePolicy(
  id: string,
  patch: Partial<LeavePolicy>,
): LeavePolicy {
  return mutateStore((store) => {
    const idx = store.leavePolicies.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error(`Unknown policy ${id}`)
    store.leavePolicies[idx] = { ...store.leavePolicies[idx], ...patch, id }
    return store.leavePolicies[idx]
  })
}
