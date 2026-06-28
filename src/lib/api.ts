// Typed fetch wrapper around the API. Attaches the bearer token from the auth
// layer (a Cognito ID token, or a dev token locally), encodes/decodes JSON, and
// normalises errors. The server derives the caller from the token, so no
// actor/employee arguments are ever sent.

import type {
  AuditLogEntry,
  Department,
  LeaveBalance,
  LeavePolicy,
  LeaveRequest,
  LeaveTypeName,
  MeResponse,
  Notification,
  PresignDownloadResponse,
  PresignUploadInput,
  PresignUploadResponse,
  RequestInput,
  User,
  UserInput,
} from '#/types'
import { API_URL } from './config'
import { getIdToken } from './auth'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type Method = 'GET' | 'POST' | 'PATCH'

async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getIdToken()
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let message = res.statusText
    try {
      const data = (await res.json()) as { error?: string }
      if (data?.error) message = data.error
    } catch {
      // non-JSON body
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** GET that resolves to null on 404 instead of throwing (for detail lookups). */
async function getOrNull<T>(path: string): Promise<T | null> {
  try {
    return await request<T>('GET', path)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

const qs = (params: Record<string, string | number | undefined>): string => {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export const api = {
  me: () => request<MeResponse>('GET', '/me'),

  users: {
    list: () => request<User[]>('GET', '/users'),
    reports: (managerId: string) =>
      request<User[]>('GET', `/users/${managerId}/reports`),
    create: (input: UserInput) => request<User>('POST', '/users', input),
    update: (id: string, patch: Partial<User>) =>
      request<User>('PATCH', `/users/${id}`, patch),
  },

  attachments: {
    presign: (input: PresignUploadInput) =>
      request<PresignUploadResponse>('POST', '/attachments/presign', input),
    downloadUrl: (key: string, filename?: string) =>
      request<PresignDownloadResponse>(
        'GET',
        `/attachments/download${qs({ key, filename })}`,
      ),
  },

  departments: {
    list: () => request<Department[]>('GET', '/departments'),
  },

  policies: {
    list: () => request<LeavePolicy[]>('GET', '/policies'),
    update: (id: string, patch: Partial<LeavePolicy>) =>
      request<LeavePolicy>('PATCH', `/policies/${id}`, patch),
  },

  balances: {
    byUser: (userId: string, year?: number) =>
      request<LeaveBalance[]>('GET', `/balances${qs({ userId, year })}`),
    all: () => request<LeaveBalance[]>('GET', '/balances'),
    setEntitlement: (args: {
      userId: string
      leaveType: LeaveTypeName
      totalEntitled: number
      year?: number
    }) => request<LeaveBalance>('POST', '/balances/entitlement', args),
    adjust: (args: {
      userId: string
      leaveType: LeaveTypeName
      manualAdjustment: number
      year?: number
    }) => request<LeaveBalance>('POST', '/balances/adjust', args),
  },

  requests: {
    all: () => request<LeaveRequest[]>('GET', '/requests'),
    byEmployee: (employeeId: string) =>
      request<LeaveRequest[]>('GET', `/requests${qs({ employeeId })}`),
    byManager: (managerId: string) =>
      request<LeaveRequest[]>('GET', `/requests${qs({ managerId })}`),
    activeApproved: () =>
      request<LeaveRequest[]>('GET', '/requests?view=active-approved'),
    pending: (managerId: string) =>
      request<LeaveRequest[]>('GET', `/requests/pending${qs({ managerId })}`),
    detail: (id: string) => getOrNull<LeaveRequest>(`/requests/${id}`),
    audit: (id: string) =>
      request<AuditLogEntry[]>('GET', `/requests/${id}/audit`),
    create: (input: RequestInput) =>
      request<LeaveRequest>('POST', '/requests', input),
    edit: (id: string, input: RequestInput) =>
      request<LeaveRequest>('PATCH', `/requests/${id}`, input),
    approve: (id: string) =>
      request<LeaveRequest>('POST', `/requests/${id}/approve`),
    reject: (id: string, comment: string) =>
      request<LeaveRequest>('POST', `/requests/${id}/reject`, { comment }),
    cancel: (id: string) =>
      request<LeaveRequest>('POST', `/requests/${id}/cancel`),
    requestCancellation: (id: string, reason: string) =>
      request<LeaveRequest>('POST', `/requests/${id}/request-cancellation`, {
        reason,
      }),
    decideCancellation: (id: string, approve: boolean) =>
      request<LeaveRequest>('POST', `/requests/${id}/decide-cancellation`, {
        approve,
      }),
  },

  notifications: {
    list: (userId: string) =>
      request<Notification[]>('GET', `/notifications${qs({ userId })}`),
    markRead: (id: string) =>
      request<{ ok: true }>('POST', `/notifications/${id}/read`),
    markAllRead: () =>
      request<{ ok: true }>('POST', '/notifications/read-all'),
  },
}
