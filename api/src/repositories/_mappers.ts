// Item ↔ entity mappers. DynamoDB items carry partition/sort key attributes
// (pk/sk) that aren't part of the domain entity; these helpers add/strip them.

import type {
  AuditLogEntry,
  LeaveBalance,
  LeaveRequest,
  Notification,
  User,
} from '#shared/types'

export const REQ_SK = 'REQ'

// ─── User ──────────────────────────────────────────────────────────────────
// `managerId` is a GSI hash key (byManager). DynamoDB forbids NULL on an indexed
// attribute, so we OMIT it for the top-of-tree user (sparse index) and restore
// it to null on read. Same for the optional cognitoSub.

export function toUserItem(u: User): Record<string, unknown> {
  const { managerId, cognitoSub, ...rest } = u
  const item: Record<string, unknown> = { ...rest }
  if (managerId != null) item.managerId = managerId
  if (cognitoSub != null) item.cognitoSub = cognitoSub
  return item
}

export function fromUserItem(item: Record<string, unknown>): User {
  return { managerId: null, ...(item as User) }
}

// ─── LeaveRequest (requests table, sk="REQ") ──────────────────────────────────
// The REQ item is the LeaveRequest plus pk=id/sk="REQ". GSI key attributes
// (employeeId, managerId, status, createdAt, updatedAt) are already top-level
// fields on LeaveRequest, so they index automatically.

export function toReqItem(r: LeaveRequest): Record<string, unknown> {
  return { ...r, pk: r.id, sk: REQ_SK }
}

export function fromReqItem(item: Record<string, unknown>): LeaveRequest {
  const { pk: _pk, sk: _sk, ...rest } = item
  return rest as unknown as LeaveRequest
}

// ─── AuditLogEntry (requests table, sk="AUDIT#<ts>#<id>") ──────────────────────
// Audit rows are co-located under the request partition but carry none of the
// GSI hash keys (employeeId/managerId/status), so they never pollute the indexes.

export function auditSk(e: AuditLogEntry): string {
  return `AUDIT#${e.timestamp}#${e.id}`
}

export function toAuditItem(e: AuditLogEntry): Record<string, unknown> {
  return { ...e, pk: e.requestId, sk: auditSk(e) }
}

export function fromAuditItem(item: Record<string, unknown>): AuditLogEntry {
  const { pk: _pk, sk: _sk, ...rest } = item
  return rest as unknown as AuditLogEntry
}

// ─── LeaveBalance (balances table, pk=userId, sk="<year>#<leaveType>") ─────────

export function balanceSk(year: number, leaveType: string): string {
  return `${year}#${leaveType}`
}

export function toBalanceItem(b: LeaveBalance): Record<string, unknown> {
  return { ...b, sk: balanceSk(b.year, b.leaveType) }
}

export function fromBalanceItem(item: Record<string, unknown>): LeaveBalance {
  const { sk: _sk, ...rest } = item
  return rest as unknown as LeaveBalance
}

// ─── Notification (notifications table, pk=recipientId, sk="<createdAt>#<id>") ─

export function notificationSk(n: Notification): string {
  return `${n.createdAt}#${n.id}`
}

export function toNotificationItem(n: Notification): Record<string, unknown> {
  return { ...n, sk: notificationSk(n) }
}

export function fromNotificationItem(
  item: Record<string, unknown>,
): Notification {
  const { sk: _sk, ...rest } = item
  return rest as unknown as Notification
}
