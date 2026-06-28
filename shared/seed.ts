// Seeded demo dataset. Ported unchanged from the old localStorage store so the
// DynamoDB seeder (`api/scripts/seed.ts`) writes the exact same demo world.
// Balances' `used` is derived from the seeded requests so the demo is
// internally consistent on first load.

import type {
  AuditLogEntry,
  Department,
  LeaveBalance,
  LeavePolicy,
  LeaveRequest,
  LeaveRequestVersion,
  LeaveTypeName,
  Notification,
  RequestStatus,
  User,
} from './types'
import { calculateTotalDays } from './logic/leaveCalc'

export const SEED_VERSION = 2
export const SEED_YEAR = 2026

/** The full seeded dataset (no localStorage / no AppStore wrapper). */
export interface SeedDataset {
  users: User[]
  departments: Department[]
  leavePolicies: LeavePolicy[]
  leaveBalances: LeaveBalance[]
  leaveRequests: LeaveRequest[]
  notifications: Notification[]
  auditLog: AuditLogEntry[]
}

// Annual leave is not uniform across the company — it varies per person (e.g. by
// seniority). The policy's `annualEntitlementDays` is only the company default;
// these per-user overrides demonstrate individual entitlements. HR can edit any
// user's entitlement from the employee detail page.
const ANNUAL_ENTITLEMENT_BY_USER: Record<string, number> = {
  emp1: 15, // Alice — standard
  emp2: 18, // Bob — 3 years' tenure
  emp3: 20, // Citra — 5 years' tenure
  mgr1: 22, // Dana — manager
  mgr2: 22, // Eva — manager
  hr1: 25, // Frank — most senior
}

// ─── Users & departments ──────────────────────────────────────────────────────

const users: User[] = [
  {
    id: 'emp1',
    name: 'Alice Kaur',
    email: 'alice@atiom.app',
    role: 'employee',
    managerId: 'mgr1',
    departmentId: 'dep_eng',
    avatarInitials: 'AK',
    isActive: true,
  },
  {
    id: 'emp2',
    name: 'Bob Tanaka',
    email: 'bob@atiom.app',
    role: 'employee',
    managerId: 'mgr1',
    departmentId: 'dep_eng',
    avatarInitials: 'BT',
    isActive: true,
  },
  {
    id: 'emp3',
    name: 'Citra Lim',
    email: 'citra@atiom.app',
    role: 'employee',
    managerId: 'mgr2',
    departmentId: 'dep_design',
    avatarInitials: 'CL',
    isActive: true,
  },
  {
    id: 'mgr1',
    name: 'Dana Osei',
    email: 'dana@atiom.app',
    role: 'manager',
    managerId: 'hr1',
    departmentId: 'dep_eng',
    avatarInitials: 'DO',
    isActive: true,
  },
  {
    id: 'mgr2',
    name: 'Eva Reyes',
    email: 'eva@atiom.app',
    role: 'manager',
    managerId: 'hr1',
    departmentId: 'dep_design',
    avatarInitials: 'ER',
    isActive: true,
  },
  {
    id: 'hr1',
    name: 'Frank Ng',
    email: 'frank@atiom.app',
    role: 'hr',
    managerId: null,
    departmentId: 'dep_people',
    avatarInitials: 'FN',
    isActive: true,
  },
]

const departments: Department[] = [
  { id: 'dep_eng', name: 'Engineering', managerId: 'mgr1' },
  { id: 'dep_design', name: 'Design', managerId: 'mgr2' },
  { id: 'dep_people', name: 'People & HR', managerId: 'hr1' },
]

// ─── Leave policies ─────────────────────────────────────────────────────────

const leavePolicies: LeavePolicy[] = [
  {
    id: 'pol_annual',
    leaveType: 'annual',
    label: 'Annual Leave',
    annualEntitlementDays: 15,
    maxPerYearDays: null,
    requiresDocument: false,
    requiresManagerApproval: true,
    isPaid: true,
    notes: 'Deducted from the annual leave balance.',
  },
  {
    id: 'pol_sick',
    leaveType: 'sick',
    label: 'Sick Leave',
    annualEntitlementDays: 14,
    maxPerYearDays: null,
    requiresDocument: true,
    requiresManagerApproval: true,
    isPaid: true,
    notes: 'Medical certificate required for 3+ consecutive days.',
  },
  {
    id: 'pol_birthday',
    leaveType: 'birthday',
    label: 'Birthday Leave',
    annualEntitlementDays: 1,
    maxPerYearDays: 1,
    requiresDocument: false,
    requiresManagerApproval: true,
    isPaid: true,
    notes: 'One day per year.',
  },
  {
    id: 'pol_bereavement',
    leaveType: 'bereavement',
    label: 'Bereavement Leave',
    annualEntitlementDays: 9,
    maxPerYearDays: 9,
    requiresDocument: false,
    requiresManagerApproval: true,
    isPaid: true,
    notes: 'Maximum 9 days per year.',
  },
  {
    id: 'pol_maternity',
    leaveType: 'maternity',
    label: 'Maternity Leave',
    annualEntitlementDays: 90,
    maxPerYearDays: null,
    requiresDocument: true,
    requiresManagerApproval: true,
    isPaid: true,
    notes: 'Based on company policy.',
  },
  {
    id: 'pol_paternity',
    leaveType: 'paternity',
    label: 'Paternity Leave',
    annualEntitlementDays: 5,
    maxPerYearDays: null,
    requiresDocument: false,
    requiresManagerApproval: true,
    isPaid: true,
    notes: 'Based on company policy.',
  },
  {
    id: 'pol_lwop',
    leaveType: 'lwop',
    label: 'Leave Without Pay',
    annualEntitlementDays: 0,
    maxPerYearDays: null,
    requiresDocument: false,
    requiresManagerApproval: true,
    isPaid: false,
    notes: 'Unpaid leave; does not draw from a paid balance.',
  },
  {
    id: 'pol_personal',
    leaveType: 'personal',
    label: 'Personal Business Leave',
    annualEntitlementDays: 5,
    maxPerYearDays: null,
    requiresDocument: false,
    requiresManagerApproval: true,
    isPaid: true,
    notes: 'Paid or unpaid depending on policy.',
  },
]

// ─── Seeded requests (specs → full records) ───────────────────────────────────

interface RequestSpec {
  id: string
  employeeId: string
  leaveType: LeaveTypeName
  dates: Array<{ date: string; duration: 'full' | 'morning_half' | 'afternoon_half' }>
  reason: string
  status: RequestStatus
  createdAt: string
  rejectionComment?: string
  cancelReason?: string
}

// "today" in the seeded world is mid-2026.
const requestSpecs: RequestSpec[] = [
  {
    id: 'req_alice_annual_past',
    employeeId: 'emp1',
    leaveType: 'annual',
    dates: [
      { date: '2026-03-10', duration: 'full' },
      { date: '2026-03-11', duration: 'full' },
    ],
    reason: 'Long weekend trip',
    status: 'approved',
    createdAt: '2026-02-20T09:15:00.000Z',
  },
  {
    id: 'req_alice_annual_pending',
    employeeId: 'emp1',
    leaveType: 'annual',
    dates: [
      { date: '2026-07-06', duration: 'full' },
      { date: '2026-07-07', duration: 'full' },
      { date: '2026-07-08', duration: 'morning_half' },
    ],
    reason: 'Family holiday',
    status: 'pending',
    createdAt: '2026-06-18T10:30:00.000Z',
  },
  {
    id: 'req_alice_birthday_pending',
    employeeId: 'emp1',
    leaveType: 'birthday',
    dates: [{ date: '2026-09-01', duration: 'full' }],
    reason: 'Birthday off',
    status: 'pending',
    createdAt: '2026-06-19T08:00:00.000Z',
  },
  {
    id: 'req_bob_sick_rejected',
    employeeId: 'emp2',
    leaveType: 'sick',
    dates: [{ date: '2026-05-04', duration: 'full' }],
    reason: 'Flu',
    status: 'rejected',
    createdAt: '2026-05-03T07:45:00.000Z',
    rejectionComment: 'Please attach a medical certificate and resubmit.',
  },
  {
    id: 'req_bob_personal_pending',
    employeeId: 'emp2',
    leaveType: 'personal',
    dates: [{ date: '2026-06-25', duration: 'morning_half' }],
    reason: 'Bank appointment',
    status: 'pending',
    createdAt: '2026-06-20T11:00:00.000Z',
  },
  {
    id: 'req_bob_annual_approved',
    employeeId: 'emp2',
    leaveType: 'annual',
    dates: [
      { date: '2026-07-06', duration: 'full' },
      { date: '2026-07-07', duration: 'full' },
    ],
    reason: 'Wedding',
    status: 'approved',
    createdAt: '2026-06-10T14:20:00.000Z',
  },
  {
    id: 'req_citra_annual_approved',
    employeeId: 'emp3',
    leaveType: 'annual',
    dates: [
      { date: '2026-07-20', duration: 'full' },
      { date: '2026-07-21', duration: 'full' },
      { date: '2026-07-22', duration: 'full' },
      { date: '2026-07-23', duration: 'full' },
      { date: '2026-07-24', duration: 'full' },
    ],
    reason: 'Annual leave',
    status: 'approved',
    createdAt: '2026-05-28T09:00:00.000Z',
  },
  {
    id: 'req_citra_annual_cancel_pending',
    employeeId: 'emp3',
    leaveType: 'annual',
    dates: [
      { date: '2026-08-03', duration: 'full' },
      { date: '2026-08-04', duration: 'full' },
    ],
    reason: 'Short break',
    status: 'cancel_pending',
    createdAt: '2026-05-30T09:00:00.000Z',
    cancelReason: 'Plans fell through',
  },
  {
    id: 'req_alice_personal_cancelled',
    employeeId: 'emp1',
    leaveType: 'personal',
    dates: [{ date: '2026-04-15', duration: 'afternoon_half' }],
    reason: 'Errand',
    status: 'cancelled',
    createdAt: '2026-04-10T13:00:00.000Z',
  },
]

// States in which a request's days are currently deducted from the balance.
const DEDUCTED_STATES: RequestStatus[] = ['approved', 'cancel_pending']

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()
}

function userById(id: string): User {
  const u = users.find((x) => x.id === id)
  if (!u) throw new Error(`Seed: unknown user ${id}`)
  return u
}

function buildRequest(spec: RequestSpec): {
  request: LeaveRequest
  audit: AuditLogEntry[]
  notifications: Notification[]
} {
  const employee = userById(spec.employeeId)
  const managerId = employee.managerId ?? 'hr1'
  const totalDays = calculateTotalDays(spec.dates)

  const version: LeaveRequestVersion = {
    versionNumber: 1,
    submittedAt: spec.createdAt,
    leaveType: spec.leaveType,
    dates: spec.dates,
    totalDays,
    reason: spec.reason,
    attachments: [],
  }

  const request: LeaveRequest = {
    id: spec.id,
    employeeId: spec.employeeId,
    managerId,
    status: spec.status,
    currentVersion: version,
    versions: [version],
    rejectionComment: spec.rejectionComment ?? null,
    cancelReason: spec.cancelReason ?? null,
    createdAt: spec.createdAt,
    updatedAt: spec.createdAt,
  }

  const audit: AuditLogEntry[] = [
    {
      id: `${spec.id}_a0`,
      requestId: spec.id,
      action: 'submitted',
      actorId: spec.employeeId,
      timestamp: spec.createdAt,
      note: null,
      fromStatus: null,
      toStatus: 'pending',
    },
  ]
  const notifications: Notification[] = []
  const decidedAt = addMinutes(spec.createdAt, 90)

  if (spec.status === 'pending') {
    notifications.push({
      id: `${spec.id}_n0`,
      recipientId: managerId,
      type: 'request_submitted',
      requestId: spec.id,
      message: `${employee.name} submitted a leave request for your approval.`,
      isRead: false,
      createdAt: spec.createdAt,
    })
  }
  if (spec.status === 'approved') {
    audit.push({
      id: `${spec.id}_a1`,
      requestId: spec.id,
      action: 'approved',
      actorId: managerId,
      timestamp: decidedAt,
      note: null,
      fromStatus: 'pending',
      toStatus: 'approved',
    })
    request.updatedAt = decidedAt
    notifications.push({
      id: `${spec.id}_n0`,
      recipientId: spec.employeeId,
      type: 'request_approved',
      requestId: spec.id,
      message: `Your ${spec.leaveType} leave request was approved.`,
      isRead: true,
      createdAt: decidedAt,
    })
  }
  if (spec.status === 'rejected') {
    audit.push({
      id: `${spec.id}_a1`,
      requestId: spec.id,
      action: 'rejected',
      actorId: managerId,
      timestamp: decidedAt,
      note: spec.rejectionComment ?? null,
      fromStatus: 'pending',
      toStatus: 'rejected',
    })
    request.updatedAt = decidedAt
    notifications.push({
      id: `${spec.id}_n0`,
      recipientId: spec.employeeId,
      type: 'request_rejected',
      requestId: spec.id,
      message: `Your ${spec.leaveType} leave request was rejected.`,
      isRead: false,
      createdAt: decidedAt,
    })
  }
  if (spec.status === 'cancelled') {
    audit.push({
      id: `${spec.id}_a1`,
      requestId: spec.id,
      action: 'cancel_requested',
      actorId: spec.employeeId,
      timestamp: decidedAt,
      note: null,
      fromStatus: 'pending',
      toStatus: 'cancelled',
    })
    request.updatedAt = decidedAt
  }
  if (spec.status === 'cancel_pending') {
    const approvedAt = addMinutes(spec.createdAt, 60)
    const cancelReqAt = addMinutes(spec.createdAt, 5000)
    audit.push(
      {
        id: `${spec.id}_a1`,
        requestId: spec.id,
        action: 'approved',
        actorId: managerId,
        timestamp: approvedAt,
        note: null,
        fromStatus: 'pending',
        toStatus: 'approved',
      },
      {
        id: `${spec.id}_a2`,
        requestId: spec.id,
        action: 'cancel_requested',
        actorId: spec.employeeId,
        timestamp: cancelReqAt,
        note: spec.cancelReason ?? null,
        fromStatus: 'approved',
        toStatus: 'cancel_pending',
      },
    )
    request.updatedAt = cancelReqAt
    notifications.push({
      id: `${spec.id}_n0`,
      recipientId: managerId,
      type: 'cancel_requested',
      requestId: spec.id,
      message: `${employee.name} requested to cancel approved leave.`,
      isRead: false,
      createdAt: cancelReqAt,
    })
  }

  return { request, audit, notifications }
}

function buildBalances(requests: LeaveRequest[]): LeaveBalance[] {
  const balances: LeaveBalance[] = []
  for (const user of users) {
    for (const policy of leavePolicies) {
      const used = requests
        .filter(
          (r) =>
            r.employeeId === user.id &&
            r.currentVersion.leaveType === policy.leaveType &&
            DEDUCTED_STATES.includes(r.status),
        )
        .reduce((sum, r) => sum + r.currentVersion.totalDays, 0)
      const totalEntitled =
        policy.leaveType === 'annual'
          ? (ANNUAL_ENTITLEMENT_BY_USER[user.id] ?? policy.annualEntitlementDays)
          : policy.annualEntitlementDays
      balances.push({
        id: `bal_${user.id}_${policy.leaveType}`,
        userId: user.id,
        leaveType: policy.leaveType,
        year: SEED_YEAR,
        totalEntitled,
        used,
        manualAdjustment: 0,
      })
    }
  }
  return balances
}

/** Build the full seeded dataset, ready to write to DynamoDB. */
export function buildSeedDataset(): SeedDataset {
  const built = requestSpecs.map(buildRequest)
  const leaveRequests = built.map((b) => b.request)
  const auditLog = built.flatMap((b) => b.audit)
  const notifications = built.flatMap((b) => b.notifications)
  const leaveBalances = buildBalances(leaveRequests)

  return {
    users,
    departments,
    leavePolicies,
    leaveBalances,
    leaveRequests,
    notifications,
    auditLog,
  }
}
