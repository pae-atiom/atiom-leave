import {
  GetCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb'
import type {
  AuditLogEntry,
  LeaveRequest,
  LeaveRequestVersion,
  RequestInput,
  RequestStatus,
  User,
} from '#shared/types'
import { generateId, nowIso } from '#shared/ids'
import { calculateTotalDays } from '#shared/logic/leaveCalc'
import { transitionRequest } from '#shared/logic/stateMachine'
import { SEED_YEAR } from '#shared/seed'
import { ddb, TableNames } from '../db'
import {
  REQ_SK,
  balanceSk,
  fromAuditItem,
  fromReqItem,
  toAuditItem,
  toReqItem,
} from './_mappers'
import { transactWrite, withRetry } from './_tx'
import { getBalance } from './balances'
import { newNotification, notificationSk } from './notifications'
import { getUserById } from './users'
import { sendEmail } from '../email'

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'

/**
 * Best-effort email to a recipient, mirroring an in-app notification. Resolves
 * the recipient's address by id and never throws — email augments the
 * transactional Notification record and must not fail the mutation.
 */
async function emailEvent(
  recipientId: string,
  subject: string,
  body: string,
): Promise<void> {
  try {
    const recipient = await getUserById(recipientId)
    if (!recipient?.email) return
    await sendEmail({
      to: recipient.email,
      subject,
      text: `Hi ${recipient.name},\n\n${body}\n\nOpen Atiom Leave: ${APP_URL}\n`,
    })
  } catch (err) {
    console.error('email dispatch failed (non-fatal):', err)
  }
}

// Balances are per calendar year; the seeded world (and current deductions)
// operate in SEED_YEAR, matching the old store's CURRENT_YEAR.
const OPERATING_YEAR = SEED_YEAR

// ─── Reads ────────────────────────────────────────────────────────────────────

function sortByUpdatedDesc(list: LeaveRequest[]): LeaveRequest[] {
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getRequests(): Promise<LeaveRequest[]> {
  const out = await ddb.send(
    new ScanCommand({
      TableName: TableNames.requests,
      FilterExpression: 'sk = :req',
      ExpressionAttributeValues: { ':req': REQ_SK },
    }),
  )
  return sortByUpdatedDesc((out.Items ?? []).map(fromReqItem))
}

export async function getRequestById(
  id: string,
): Promise<LeaveRequest | undefined> {
  const out = await ddb.send(
    new GetCommand({
      TableName: TableNames.requests,
      Key: { pk: id, sk: REQ_SK },
    }),
  )
  return out.Item ? fromReqItem(out.Item) : undefined
}

export async function getAuditByRequest(
  requestId: string,
): Promise<AuditLogEntry[]> {
  const out = await ddb.send(
    new QueryCommand({
      TableName: TableNames.requests,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :a)',
      ExpressionAttributeValues: { ':pk': requestId, ':a': 'AUDIT#' },
    }),
  )
  return (out.Items ?? [])
    .map(fromAuditItem)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

export async function getRequestsByEmployee(
  employeeId: string,
): Promise<LeaveRequest[]> {
  const out = await ddb.send(
    new QueryCommand({
      TableName: TableNames.requests,
      IndexName: 'byEmployee',
      KeyConditionExpression: 'employeeId = :e',
      ExpressionAttributeValues: { ':e': employeeId },
    }),
  )
  return sortByUpdatedDesc((out.Items ?? []).map(fromReqItem))
}

export async function getRequestsByManager(
  managerId: string,
): Promise<LeaveRequest[]> {
  const out = await ddb.send(
    new QueryCommand({
      TableName: TableNames.requests,
      IndexName: 'byManager',
      KeyConditionExpression: 'managerId = :m',
      ExpressionAttributeValues: { ':m': managerId },
    }),
  )
  return sortByUpdatedDesc((out.Items ?? []).map(fromReqItem))
}

export async function getPendingForManager(
  managerId: string,
): Promise<LeaveRequest[]> {
  const out = await ddb.send(
    new QueryCommand({
      TableName: TableNames.requests,
      IndexName: 'byManager',
      KeyConditionExpression: 'managerId = :m',
      FilterExpression: '#st IN (:p, :cp)',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: {
        ':m': managerId,
        ':p': 'pending',
        ':cp': 'cancel_pending',
      },
    }),
  )
  return (out.Items ?? [])
    .map(fromReqItem)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

async function queryByStatus(status: RequestStatus): Promise<LeaveRequest[]> {
  const out = await ddb.send(
    new QueryCommand({
      TableName: TableNames.requests,
      IndexName: 'byStatus',
      KeyConditionExpression: '#st = :s',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':s': status },
    }),
  )
  return (out.Items ?? []).map(fromReqItem)
}

export async function getActiveApprovedRequests(): Promise<LeaveRequest[]> {
  const [approved, cancelPending] = await Promise.all([
    queryByStatus('approved'),
    queryByStatus('cancel_pending'),
  ])
  return [...approved, ...cancelPending]
}

// ─── Transaction item builders ─────────────────────────────────────────────────

function putReq(request: LeaveRequest, requireNew = false) {
  return {
    Put: {
      TableName: TableNames.requests,
      Item: toReqItem(request),
      ...(requireNew
        ? { ConditionExpression: 'attribute_not_exists(pk)' }
        : {}),
    },
  }
}

function putAudit(entry: AuditLogEntry) {
  return { Put: { TableName: TableNames.requests, Item: toAuditItem(entry) } }
}

function putNotification(
  recipientId: string,
  type: Parameters<typeof newNotification>[0]['type'],
  requestId: string,
  message: string,
) {
  const n = newNotification({ recipientId, type, requestId, message })
  return {
    Put: { TableName: TableNames.notifications, Item: { ...n, sk: notificationSk(n) } },
  }
}

/**
 * Conditional balance update for approval (deduct) / cancellation (restore).
 * Mirrors the old `applyDelta`: no-op when the balance row is missing, floors
 * `used` at 0, and guards on the prior `used` so concurrent updates retry.
 */
async function balanceDeltaItem(
  userId: string,
  leaveType: LeaveRequest['currentVersion']['leaveType'],
  days: number,
) {
  const balance = await getBalance(userId, leaveType, OPERATING_YEAR)
  if (!balance) return null
  const prior = balance.used
  const next = Math.max(0, prior + days)
  return {
    Update: {
      TableName: TableNames.balances,
      Key: { userId, sk: balanceSk(OPERATING_YEAR, leaveType) },
      UpdateExpression: 'SET used = :next',
      ConditionExpression: 'used = :prior',
      ExpressionAttributeValues: { ':next': next, ':prior': prior },
    },
  }
}

async function loadRequestOrThrow(id: string): Promise<LeaveRequest> {
  const r = await getRequestById(id)
  if (!r) throw new Error(`Unknown request ${id}`)
  return r
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export async function createRequest(
  employee: User,
  input: RequestInput,
): Promise<LeaveRequest> {
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
  const audit: AuditLogEntry = {
    id: generateId('audit'),
    requestId: request.id,
    action: 'submitted',
    actorId: employee.id,
    timestamp,
    note: null,
    fromStatus: null,
    toStatus: 'pending',
  }
  await transactWrite([
    putReq(request, true),
    putAudit(audit),
    putNotification(
      managerId,
      'request_submitted',
      request.id,
      `${employee.name} submitted a ${input.leaveType} leave request for your approval.`,
    ),
  ])
  await emailEvent(
    managerId,
    'New leave request to approve',
    `${employee.name} submitted a ${input.leaveType} leave request (${version.totalDays} day(s)) for your approval.`,
  )
  return request
}

export async function editRequest(
  id: string,
  actor: User,
  input: RequestInput,
): Promise<LeaveRequest> {
  const request = await loadRequestOrThrow(id)
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
  const audit: AuditLogEntry = {
    id: generateId('audit'),
    requestId: id,
    action: 'edited',
    actorId: actor.id,
    timestamp,
    note: `Resubmitted as version ${version.versionNumber}`,
    fromStatus: request.status,
    toStatus: 'pending',
  }
  await transactWrite([
    putReq(updated),
    putAudit(audit),
    putNotification(
      request.managerId,
      'request_modified',
      id,
      `${actor.name} modified a leave request and resubmitted it for approval.`,
    ),
  ])
  await emailEvent(
    request.managerId,
    'Leave request modified',
    `${actor.name} modified a leave request and resubmitted it (v${version.versionNumber}) for your approval.`,
  )
  return updated
}

export async function approveRequest(
  id: string,
  actor: User,
): Promise<LeaveRequest> {
  return withRetry(async () => {
    const request = await loadRequestOrThrow(id)
    const { updatedRequest, auditEntry } = transitionRequest(
      request,
      'approved',
      actor,
    )
    const balance = await balanceDeltaItem(
      request.employeeId,
      request.currentVersion.leaveType,
      request.currentVersion.totalDays, // deduct
    )
    await transactWrite([
      putReq(updatedRequest),
      putAudit(auditEntry),
      ...(balance ? [balance] : []),
      putNotification(
        request.employeeId,
        'request_approved',
        id,
        `Your ${request.currentVersion.leaveType} leave request was approved.`,
      ),
    ])
    await emailEvent(
      request.employeeId,
      'Your leave request was approved',
      `Your ${request.currentVersion.leaveType} leave request (${request.currentVersion.totalDays} day(s)) was approved by ${actor.name}.`,
    )
    return updatedRequest
  })
}

export async function rejectRequest(
  id: string,
  actor: User,
  comment: string,
): Promise<LeaveRequest> {
  const request = await loadRequestOrThrow(id)
  const { updatedRequest, auditEntry } = transitionRequest(
    request,
    'rejected',
    actor,
    { rejectionComment: comment },
  )
  await transactWrite([
    putReq(updatedRequest),
    putAudit(auditEntry),
    putNotification(
      request.employeeId,
      'request_rejected',
      id,
      `Your ${request.currentVersion.leaveType} leave request was rejected.`,
    ),
  ])
  await emailEvent(
    request.employeeId,
    'Your leave request was rejected',
    `Your ${request.currentVersion.leaveType} leave request was rejected by ${actor.name}.${comment ? `\n\nReason: ${comment}` : ''}`,
  )
  return updatedRequest
}

export async function cancelPendingRequest(
  id: string,
  actor: User,
): Promise<LeaveRequest> {
  const request = await loadRequestOrThrow(id)
  const { updatedRequest, auditEntry } = transitionRequest(
    request,
    'cancelled',
    actor,
  )
  await transactWrite([
    putReq(updatedRequest),
    putAudit(auditEntry),
    putNotification(
      request.managerId,
      'request_cancelled',
      id,
      `${actor.name} withdrew a pending leave request.`,
    ),
  ])
  await emailEvent(
    request.managerId,
    'Leave request withdrawn',
    `${actor.name} withdrew a pending ${request.currentVersion.leaveType} leave request.`,
  )
  return updatedRequest
}

export async function requestCancellation(
  id: string,
  actor: User,
  reason: string,
): Promise<LeaveRequest> {
  const request = await loadRequestOrThrow(id)
  const { updatedRequest, auditEntry } = transitionRequest(
    request,
    'cancel_pending',
    actor,
    { cancelReason: reason },
  )
  await transactWrite([
    putReq(updatedRequest),
    putAudit(auditEntry),
    putNotification(
      request.managerId,
      'cancel_requested',
      id,
      `${actor.name} requested to cancel approved leave.`,
    ),
  ])
  await emailEvent(
    request.managerId,
    'Leave cancellation requested',
    `${actor.name} requested to cancel approved ${request.currentVersion.leaveType} leave.${reason ? `\n\nReason: ${reason}` : ''}`,
  )
  return updatedRequest
}

export async function decideCancellation(
  id: string,
  actor: User,
  approve: boolean,
): Promise<LeaveRequest> {
  return withRetry(async () => {
    const request = await loadRequestOrThrow(id)
    const target: RequestStatus = approve ? 'cancel_approved' : 'approved'
    const { updatedRequest, auditEntry } = transitionRequest(
      request,
      target,
      actor,
    )
    const balance = approve
      ? await balanceDeltaItem(
          request.employeeId,
          request.currentVersion.leaveType,
          -request.currentVersion.totalDays, // restore
        )
      : null
    await transactWrite([
      putReq(updatedRequest),
      putAudit(auditEntry),
      ...(balance ? [balance] : []),
      putNotification(
        request.employeeId,
        approve ? 'cancel_approved' : 'cancel_denied',
        id,
        approve
          ? `Your leave cancellation was approved and the balance restored.`
          : `Your leave cancellation request was denied; the leave remains approved.`,
      ),
    ])
    await emailEvent(
      request.employeeId,
      approve ? 'Leave cancellation approved' : 'Leave cancellation denied',
      approve
        ? `Your ${request.currentVersion.leaveType} leave cancellation was approved by ${actor.name} and the balance restored.`
        : `Your ${request.currentVersion.leaveType} leave cancellation was denied by ${actor.name}; the leave remains approved.`,
    )
    return updatedRequest
  })
}
