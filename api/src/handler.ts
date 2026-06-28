// Single Hono app: maps every route to a repository call, deriving the caller
// from the JWT (never from the request body) and enforcing authorization.

import { Hono } from 'hono'
import type { Context } from 'hono'
import { cors } from 'hono/cors'
import type {
  LeaveTypeName,
  PresignUploadInput,
  RequestInput,
  UserInput,
} from '#shared/types'
import {
  MAX_ATTACHMENT_BYTES,
  isAllowedMime,
  presignDownload,
  presignUpload,
} from './storage'
import {
  AppEnv,
  HttpError,
  assert,
  authMiddleware,
  canDecideRequest,
  canViewEmployee,
  isHr,
  isOwnerOrHr,
} from './auth'
import * as users from './repositories/users'
import * as departments from './repositories/departments'
import * as policies from './repositories/policies'
import * as balances from './repositories/balances'
import * as requests from './repositories/requests'
import * as notifications from './repositories/notifications'

export const app = new Hono<AppEnv>()

app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type', 'x-dev-email'],
  }),
)

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status as never)
  console.error(err)
  return c.json({ error: (err as Error).message ?? 'Internal error' }, 500)
})

// All routes below require an authenticated caller.
app.use('*', authMiddleware)

// ─── Identity ──────────────────────────────────────────────────────────────────

app.get('/me', (c) => {
  const caller = c.var.caller
  return c.json({ user: caller, role: caller.role })
})

// ─── Directory ─────────────────────────────────────────────────────────────────

app.get('/users', async (c) => c.json(await users.getUsers()))

app.post('/users', async (c) => {
  assert(isHr(c.var.caller), 403, 'HR only')
  const input = await c.req.json<UserInput>()
  const email = input.email?.trim().toLowerCase()
  assert(input.name?.trim() && email && input.role && input.departmentId, 400, 'Missing fields')
  assert(!(await users.getUserByEmail(email)), 409, 'A user with that email already exists')
  return c.json(await users.createUser(input), 201)
})

app.get('/users/:id', async (c) => {
  const target = await users.getUserById(c.req.param('id'))
  assert(target, 404, 'User not found')
  assert(canViewEmployee(c.var.caller, target), 403, 'Forbidden')
  return c.json(target)
})

app.patch('/users/:id', async (c) => {
  assert(isHr(c.var.caller), 403, 'HR only')
  const patch = await c.req.json()
  return c.json(await users.updateUser(c.req.param('id'), patch))
})

app.get('/users/:id/reports', async (c) => {
  const id = c.req.param('id')
  assert(
    isHr(c.var.caller) || c.var.caller.id === id,
    403,
    'Forbidden',
  )
  return c.json(await users.getDirectReports(id))
})

app.get('/departments', async (c) => c.json(await departments.getDepartments()))

// ─── Policies ──────────────────────────────────────────────────────────────────

app.get('/policies', async (c) => c.json(await policies.getLeavePolicies()))

app.patch('/policies/:id', async (c) => {
  assert(isHr(c.var.caller), 403, 'HR only')
  const patch = await c.req.json()
  return c.json(await policies.updateLeavePolicy(c.req.param('id'), patch))
})

// ─── Balances ──────────────────────────────────────────────────────────────────

app.get('/balances', async (c) => {
  const caller = c.var.caller
  const userId = c.req.query('userId')
  const year = c.req.query('year') ? Number(c.req.query('year')) : undefined
  if (userId) {
    const target = await users.getUserById(userId)
    assert(target, 404, 'User not found')
    assert(canViewEmployee(caller, target), 403, 'Forbidden')
    return c.json(await balances.getBalancesByUser(userId, year))
  }
  // No userId → all balances (HR + managers, who filter to their team).
  assert(caller.role !== 'employee', 403, 'Forbidden')
  return c.json(await balances.getBalances())
})

app.post('/balances/entitlement', async (c) => {
  assert(isHr(c.var.caller), 403, 'HR only')
  const body = await c.req.json<{
    userId: string
    leaveType: LeaveTypeName
    totalEntitled: number
    year?: number
  }>()
  return c.json(
    await balances.setEntitlement(
      body.userId,
      body.leaveType,
      body.totalEntitled,
      c.var.caller.id,
      body.year,
    ),
  )
})

app.post('/balances/adjust', async (c) => {
  assert(isHr(c.var.caller), 403, 'HR only')
  const body = await c.req.json<{
    userId: string
    leaveType: LeaveTypeName
    manualAdjustment: number
    year?: number
  }>()
  return c.json(
    await balances.adjustBalance(
      body.userId,
      body.leaveType,
      body.manualAdjustment,
      c.var.caller.id,
      body.year,
    ),
  )
})

// ─── Requests ──────────────────────────────────────────────────────────────────

app.get('/requests', async (c) => {
  const caller = c.var.caller
  const employeeId = c.req.query('employeeId')
  const managerId = c.req.query('managerId')
  const view = c.req.query('view')

  if (view === 'active-approved') {
    return c.json(await requests.getActiveApprovedRequests())
  }
  if (employeeId) {
    const target = await users.getUserById(employeeId)
    assert(target, 404, 'User not found')
    assert(canViewEmployee(caller, target), 403, 'Forbidden')
    return c.json(await requests.getRequestsByEmployee(employeeId))
  }
  if (managerId) {
    assert(isHr(caller) || caller.id === managerId, 403, 'Forbidden')
    return c.json(await requests.getRequestsByManager(managerId))
  }
  // No filter → all requests (HR only).
  assert(isHr(caller), 403, 'HR only')
  return c.json(await requests.getRequests())
})

app.get('/requests/pending', async (c) => {
  const caller = c.var.caller
  const managerId = c.req.query('managerId') ?? caller.id
  assert(isHr(caller) || caller.id === managerId, 403, 'Forbidden')
  return c.json(await requests.getPendingForManager(managerId))
})

async function loadRequestForView(c: Context<AppEnv>) {
  const request = await requests.getRequestById(c.req.param('id'))
  assert(request, 404, 'Request not found')
  const caller = c.var.caller
  assert(
    isHr(caller) ||
      request.employeeId === caller.id ||
      request.managerId === caller.id,
    403,
    'Forbidden',
  )
  return request
}

app.get('/requests/:id', async (c) => c.json(await loadRequestForView(c)))

app.get('/requests/:id/audit', async (c) => {
  await loadRequestForView(c)
  return c.json(await requests.getAuditByRequest(c.req.param('id')))
})

app.post('/requests', async (c) => {
  const input = await c.req.json<RequestInput>()
  return c.json(await requests.createRequest(c.var.caller, input))
})

app.patch('/requests/:id', async (c) => {
  const request = await requests.getRequestById(c.req.param('id'))
  assert(request, 404, 'Request not found')
  assert(isOwnerOrHr(c.var.caller, request), 403, 'Forbidden')
  const input = await c.req.json<RequestInput>()
  return c.json(await requests.editRequest(request.id, c.var.caller, input))
})

app.post('/requests/:id/approve', async (c) => {
  const request = await requests.getRequestById(c.req.param('id'))
  assert(request, 404, 'Request not found')
  assert(canDecideRequest(c.var.caller, request), 403, 'Forbidden')
  return c.json(await requests.approveRequest(request.id, c.var.caller))
})

app.post('/requests/:id/reject', async (c) => {
  const request = await requests.getRequestById(c.req.param('id'))
  assert(request, 404, 'Request not found')
  assert(canDecideRequest(c.var.caller, request), 403, 'Forbidden')
  const { comment } = await c.req.json<{ comment: string }>()
  return c.json(await requests.rejectRequest(request.id, c.var.caller, comment))
})

app.post('/requests/:id/cancel', async (c) => {
  const request = await requests.getRequestById(c.req.param('id'))
  assert(request, 404, 'Request not found')
  assert(isOwnerOrHr(c.var.caller, request), 403, 'Forbidden')
  return c.json(await requests.cancelPendingRequest(request.id, c.var.caller))
})

app.post('/requests/:id/request-cancellation', async (c) => {
  const request = await requests.getRequestById(c.req.param('id'))
  assert(request, 404, 'Request not found')
  assert(isOwnerOrHr(c.var.caller, request), 403, 'Forbidden')
  const { reason } = await c.req.json<{ reason: string }>()
  return c.json(
    await requests.requestCancellation(request.id, c.var.caller, reason),
  )
})

app.post('/requests/:id/decide-cancellation', async (c) => {
  const request = await requests.getRequestById(c.req.param('id'))
  assert(request, 404, 'Request not found')
  assert(canDecideRequest(c.var.caller, request), 403, 'Forbidden')
  const { approve } = await c.req.json<{ approve: boolean }>()
  return c.json(
    await requests.decideCancellation(request.id, c.var.caller, approve),
  )
})

// ─── Attachments (S3 presigned URLs) ─────────────────────────────────────────
// The browser uploads/downloads bytes directly to S3; the API only signs URLs,
// never proxies the file. Object keys are unguessable (uuid), and request-level
// authorization gates who ever learns a key (it lives inside the request body).

app.post('/attachments/presign', async (c) => {
  const body = await c.req.json<PresignUploadInput>()
  assert(body?.filename && body?.mimeType, 400, 'filename and mimeType are required')
  assert(isAllowedMime(body.mimeType), 400, 'Unsupported file type')
  assert(
    typeof body.sizeBytes === 'number' && body.sizeBytes > 0 && body.sizeBytes <= MAX_ATTACHMENT_BYTES,
    400,
    'File too large',
  )
  return c.json(await presignUpload(c.var.caller.id, body))
})

app.get('/attachments/download', async (c) => {
  const key = c.req.query('key')
  assert(key, 400, 'key is required')
  const filename = c.req.query('filename') ?? undefined
  return c.json({ url: await presignDownload(key, filename) })
})

// ─── Notifications ─────────────────────────────────────────────────────────────

app.get('/notifications', async (c) => {
  const caller = c.var.caller
  const userId = c.req.query('userId') ?? caller.id
  assert(isHr(caller) || caller.id === userId, 403, 'Forbidden')
  return c.json(await notifications.getNotificationsForUser(userId))
})

app.post('/notifications/:id/read', async (c) => {
  await notifications.markNotificationRead(c.var.caller.id, c.req.param('id'))
  return c.json({ ok: true })
})

app.post('/notifications/read-all', async (c) => {
  await notifications.markAllNotificationsRead(c.var.caller.id)
  return c.json({ ok: true })
})
