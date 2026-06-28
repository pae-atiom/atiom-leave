// Request status state machine: allowed transitions + the transition function
// that produces the updated request and its audit-log entry. Pure (no store).

import type {
  AuditAction,
  AuditLogEntry,
  LeaveRequest,
  RequestStatus,
  User,
} from '../types'
import { generateId, nowIso } from '../ids'

export const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  draft: ['pending'],
  pending: ['approved', 'rejected', 'cancelled'],
  approved: ['cancel_pending'],
  rejected: ['pending'], // employee resubmits (creates a new version)
  cancelled: [], // terminal
  cancel_pending: ['cancel_approved', 'approved'], // approve cancellation OR deny (back to approved)
  cancel_approved: [], // terminal
}

export function isTransitionAllowed(
  from: RequestStatus,
  to: RequestStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

function statusToAuditAction(
  from: RequestStatus,
  to: RequestStatus,
): AuditAction {
  switch (to) {
    case 'pending':
      return from === 'rejected' ? 'edited' : 'submitted'
    case 'approved':
      return from === 'cancel_pending' ? 'cancel_denied' : 'approved'
    case 'rejected':
      return 'rejected'
    case 'cancelled':
      return 'cancel_requested'
    case 'cancel_pending':
      return 'cancel_requested'
    case 'cancel_approved':
      return 'cancel_approved'
    default:
      return 'submitted'
  }
}

export interface TransitionOptions {
  rejectionComment?: string
  cancelReason?: string
}

export interface TransitionResult {
  updatedRequest: LeaveRequest
  auditEntry: AuditLogEntry
}

/**
 * Apply a status transition. Validates it is allowed, returns the updated
 * request plus the audit entry to append. Throws on an illegal transition or a
 * rejection missing its required comment.
 */
export function transitionRequest(
  request: LeaveRequest,
  to: RequestStatus,
  actor: User,
  options: TransitionOptions = {},
): TransitionResult {
  if (!isTransitionAllowed(request.status, to)) {
    throw new Error(`Invalid transition: ${request.status} → ${to}`)
  }
  if (to === 'rejected' && !options.rejectionComment?.trim()) {
    throw new Error('A rejection comment is required')
  }

  const timestamp = nowIso()
  const updatedRequest: LeaveRequest = {
    ...request,
    status: to,
    rejectionComment:
      to === 'rejected'
        ? (options.rejectionComment ?? null)
        : request.rejectionComment,
    cancelReason:
      to === 'cancel_pending'
        ? (options.cancelReason ?? null)
        : request.cancelReason,
    updatedAt: timestamp,
  }

  const auditEntry: AuditLogEntry = {
    id: generateId('audit'),
    requestId: request.id,
    action: statusToAuditAction(request.status, to),
    actorId: actor.id,
    timestamp,
    note: options.rejectionComment ?? options.cancelReason ?? null,
    fromStatus: request.status,
    toStatus: to,
  }

  return { updatedRequest, auditEntry }
}
