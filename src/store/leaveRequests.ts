import type {
  AppStore,
  Attachment,
  DateEntry,
  LeaveRequest,
  LeaveRequestVersion,
  LeaveTypeName,
  RequestStatus,
  User,
} from '#/types'
import { calculateTotalDays } from '#/logic/leaveCalc'
import { transitionRequest } from '#/logic/stateMachine'
import { CURRENT_YEAR, generateId, nowIso } from '#/lib/utils'
import { getStore, mutateStore } from './index'
import { appendAudit } from './auditLog'
import { pushNotification } from './notifications'
import { getUserById } from './users'

// ─── Reads ────────────────────────────────────────────────────────────────────

export function getRequests(): LeaveRequest[] {
  return getStore().leaveRequests
}

export function getRequestById(id: string): LeaveRequest | undefined {
  return getStore().leaveRequests.find((r) => r.id === id)
}

export function getRequestsByEmployee(employeeId: string): LeaveRequest[] {
  return sortByUpdated(
    getStore().leaveRequests.filter((r) => r.employeeId === employeeId),
  )
}

export function getRequestsByManager(managerId: string): LeaveRequest[] {
  return sortByUpdated(
    getStore().leaveRequests.filter((r) => r.managerId === managerId),
  )
}

/** Requests awaiting a decision by the given manager (new approvals + cancellations). */
export function getPendingForManager(managerId: string): LeaveRequest[] {
  return getStore()
    .leaveRequests.filter(
      (r) =>
        r.managerId === managerId &&
        (r.status === 'pending' || r.status === 'cancel_pending'),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** Approved (and cancel-pending, still-active) requests — what shows on a calendar. */
export function getActiveApprovedRequests(): LeaveRequest[] {
  return getStore().leaveRequests.filter(
    (r) => r.status === 'approved' || r.status === 'cancel_pending',
  )
}

function sortByUpdated(list: LeaveRequest[]): LeaveRequest[] {
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

// ─── Internal balance helper (operates on a held store) ───────────────────────

function applyDelta(
  store: AppStore,
  userId: string,
  leaveType: LeaveTypeName,
  delta: number,
): void {
  const idx = store.leaveBalances.findIndex(
    (b) =>
      b.userId === userId &&
      b.leaveType === leaveType &&
      b.year === CURRENT_YEAR,
  )
  if (idx === -1) return
  store.leaveBalances[idx] = {
    ...store.leaveBalances[idx],
    used: Math.max(0, store.leaveBalances[idx].used + delta),
  }
}

function findRequest(store: AppStore, id: string): LeaveRequest {
  const r = store.leaveRequests.find((x) => x.id === id)
  if (!r) throw new Error(`Unknown request ${id}`)
  return r
}

function replaceRequest(store: AppStore, updated: LeaveRequest): void {
  const idx = store.leaveRequests.findIndex((r) => r.id === updated.id)
  store.leaveRequests[idx] = updated
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export interface RequestInput {
  leaveType: LeaveTypeName
  dates: DateEntry[]
  reason: string
  attachments: Attachment[]
}

export function createRequest(
  employee: User,
  input: RequestInput,
): LeaveRequest {
  return mutateStore((store) => {
    const managerId = employee.managerId ?? 'hr1'
    const timestamp = nowIso()
    const version: LeaveRequestVersion = {
      versionNumber: 1,
      submittedAt: timestamp,
      leaveType: input.leaveType,
      dates: input.dates,
      totalDays: calculateTotalDays(input.dates),
      reason: input.reason,
      attachments: input.attachments,
    }
    const request: LeaveRequest = {
      id: generateId('req'),
      employeeId: employee.id,
      managerId,
      status: 'pending',
      currentVersion: version,
      versions: [version],
      rejectionComment: null,
      cancelReason: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    store.leaveRequests.push(request)
    appendAudit(store, {
      id: generateId('audit'),
      requestId: request.id,
      action: 'submitted',
      actorId: employee.id,
      timestamp,
      note: null,
      fromStatus: null,
      toStatus: 'pending',
    })
    pushNotification(store, {
      recipientId: managerId,
      type: 'request_submitted',
      requestId: request.id,
      message: `${employee.name} submitted a ${input.leaveType} leave request for your approval.`,
    })
    return request
  })
}

/** Edit a pending or rejected request: append a new version and reset to pending. */
export function editRequest(
  id: string,
  actor: User,
  input: RequestInput,
): LeaveRequest {
  return mutateStore((store) => {
    const request = findRequest(store, id)
    if (request.status !== 'pending' && request.status !== 'rejected') {
      throw new Error('Only pending or rejected requests can be edited')
    }
    const timestamp = nowIso()
    const version: LeaveRequestVersion = {
      versionNumber: request.versions.length + 1,
      submittedAt: timestamp,
      leaveType: input.leaveType,
      dates: input.dates,
      totalDays: calculateTotalDays(input.dates),
      reason: input.reason,
      attachments: input.attachments,
    }
    const updated: LeaveRequest = {
      ...request,
      status: 'pending',
      currentVersion: version,
      versions: [...request.versions, version],
      rejectionComment: null,
      updatedAt: timestamp,
    }
    replaceRequest(store, updated)
    appendAudit(store, {
      id: generateId('audit'),
      requestId: id,
      action: 'edited',
      actorId: actor.id,
      timestamp,
      note: `Resubmitted as version ${version.versionNumber}`,
      fromStatus: request.status,
      toStatus: 'pending',
    })
    pushNotification(store, {
      recipientId: request.managerId,
      type: 'request_modified',
      requestId: id,
      message: `${actor.name} modified a leave request and resubmitted it for approval.`,
    })
    return updated
  })
}

export function approveRequest(id: string, actor: User): LeaveRequest {
  return mutateStore((store) => {
    const request = findRequest(store, id)
    const { updatedRequest, auditEntry } = transitionRequest(
      request,
      'approved',
      actor,
    )
    replaceRequest(store, updatedRequest)
    appendAudit(store, auditEntry)
    // Deduct balance on approval.
    applyDelta(
      store,
      request.employeeId,
      request.currentVersion.leaveType,
      request.currentVersion.totalDays,
    )
    pushNotification(store, {
      recipientId: request.employeeId,
      type: 'request_approved',
      requestId: id,
      message: `Your ${request.currentVersion.leaveType} leave request was approved.`,
    })
    return updatedRequest
  })
}

export function rejectRequest(
  id: string,
  actor: User,
  comment: string,
): LeaveRequest {
  return mutateStore((store) => {
    const request = findRequest(store, id)
    const { updatedRequest, auditEntry } = transitionRequest(
      request,
      'rejected',
      actor,
      { rejectionComment: comment },
    )
    replaceRequest(store, updatedRequest)
    appendAudit(store, auditEntry)
    pushNotification(store, {
      recipientId: request.employeeId,
      type: 'request_rejected',
      requestId: id,
      message: `Your ${request.currentVersion.leaveType} leave request was rejected.`,
    })
    return updatedRequest
  })
}

/** Employee cancels their own still-pending request. */
export function cancelPendingRequest(id: string, actor: User): LeaveRequest {
  return mutateStore((store) => {
    const request = findRequest(store, id)
    const { updatedRequest, auditEntry } = transitionRequest(
      request,
      'cancelled',
      actor,
    )
    replaceRequest(store, updatedRequest)
    appendAudit(store, auditEntry)
    pushNotification(store, {
      recipientId: request.managerId,
      type: 'request_cancelled',
      requestId: id,
      message: `${actor.name} withdrew a pending leave request.`,
    })
    return updatedRequest
  })
}

/** Employee requests cancellation of an already-approved leave. */
export function requestCancellation(
  id: string,
  actor: User,
  reason: string,
): LeaveRequest {
  return mutateStore((store) => {
    const request = findRequest(store, id)
    const { updatedRequest, auditEntry } = transitionRequest(
      request,
      'cancel_pending',
      actor,
      { cancelReason: reason },
    )
    replaceRequest(store, updatedRequest)
    appendAudit(store, auditEntry)
    pushNotification(store, {
      recipientId: request.managerId,
      type: 'cancel_requested',
      requestId: id,
      message: `${actor.name} requested to cancel approved leave.`,
    })
    return updatedRequest
  })
}

/** Manager approves or denies a cancellation request. */
export function decideCancellation(
  id: string,
  actor: User,
  approve: boolean,
): LeaveRequest {
  return mutateStore((store) => {
    const request = findRequest(store, id)
    const target: RequestStatus = approve ? 'cancel_approved' : 'approved'
    const { updatedRequest, auditEntry } = transitionRequest(
      request,
      target,
      actor,
    )
    replaceRequest(store, updatedRequest)
    appendAudit(store, auditEntry)
    if (approve) {
      // Restore the previously-deducted balance.
      applyDelta(
        store,
        request.employeeId,
        request.currentVersion.leaveType,
        -request.currentVersion.totalDays,
      )
    }
    pushNotification(store, {
      recipientId: request.employeeId,
      type: approve ? 'cancel_approved' : 'cancel_denied',
      requestId: id,
      message: approve
        ? `Your leave cancellation was approved and the balance restored.`
        : `Your leave cancellation request was denied; the leave remains approved.`,
    })
    return updatedRequest
  })
}

/** Convenience: resolve the employee + manager display names for a request. */
export function getRequestParticipants(request: LeaveRequest) {
  return {
    employee: getUserById(request.employeeId),
    manager: getUserById(request.managerId),
  }
}
