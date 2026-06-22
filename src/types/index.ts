// Single source of truth for all domain types in the Leave Request System POC.

// ─── Enums / unions ──────────────────────────────────────────────────────────

export type UserRole = 'employee' | 'manager' | 'hr'

export type LeaveTypeName =
  | 'annual'
  | 'sick'
  | 'birthday'
  | 'bereavement'
  | 'maternity'
  | 'paternity'
  | 'lwop' // Leave Without Pay
  | 'personal'

export type DayDuration = 'full' | 'morning_half' | 'afternoon_half'

export type RequestStatus =
  | 'draft' // saved locally, not submitted (reserved for future)
  | 'pending' // submitted, awaiting manager
  | 'approved'
  | 'rejected'
  | 'cancelled' // cancelled before approval
  | 'cancel_pending' // cancellation of an approved leave requested; awaiting manager
  | 'cancel_approved' // cancellation approved; balance restored

export type AuditAction =
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'edited'
  | 'cancel_requested'
  | 'cancel_approved'
  | 'cancel_denied'
  | 'balance_adjusted' // HR manual adjustment

export type NotificationType =
  | 'request_submitted'
  | 'request_approved'
  | 'request_rejected'
  | 'request_modified'
  | 'request_cancelled'
  | 'pending_reminder'
  | 'cancel_requested'
  | 'cancel_approved'
  | 'cancel_denied'

export type AttachmentMime = 'application/pdf' | 'image/jpeg' | 'image/png'

// ─── Core entities ───────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  managerId: string | null // null = top of reporting tree
  departmentId: string
  avatarInitials: string // e.g. "AK" — no real images in the POC
  isActive: boolean
}

export interface Department {
  id: string
  name: string
  managerId: string // User.id of the department manager
}

export interface LeavePolicy {
  id: string
  leaveType: LeaveTypeName
  label: string // display name e.g. "Annual Leave"
  annualEntitlementDays: number // base entitlement; 0 for LWOP
  maxPerYearDays: number | null // null = unlimited; 9 for bereavement, 1 for birthday
  requiresDocument: boolean
  requiresManagerApproval: boolean // always true in POC; kept for future
  isPaid: boolean
  notes: string // HR-editable free-text description
}

export interface LeaveBalance {
  id: string
  userId: string
  leaveType: LeaveTypeName
  year: number // balances are per calendar year
  totalEntitled: number // days
  used: number // days; +on approval, -on cancel_approved
  manualAdjustment: number // HR delta; +added / -deducted
  // derived: remaining = totalEntitled + manualAdjustment - used
}

export interface DateEntry {
  date: string // ISO date "YYYY-MM-DD"
  duration: DayDuration
}

export interface Attachment {
  id: string
  filename: string
  mimeType: AttachmentMime
  sizeBytes: number
  uploadedAt: string // ISO datetime
  mockDataUrl: string | null // POC: metadata-only, no real binary
}

export interface LeaveRequestVersion {
  versionNumber: number // 1 = original, 2+ = edits
  submittedAt: string // ISO datetime
  leaveType: LeaveTypeName
  dates: DateEntry[]
  totalDays: number // sum of durationDays across dates
  reason: string
  attachments: Attachment[]
}

export interface LeaveRequest {
  id: string
  employeeId: string
  managerId: string // denormalised at submission time
  status: RequestStatus
  currentVersion: LeaveRequestVersion // latest version (live)
  versions: LeaveRequestVersion[] // full history; index 0 = v1
  rejectionComment: string | null
  cancelReason: string | null
  createdAt: string // ISO datetime of first submission
  updatedAt: string // ISO datetime of last state change
}

export interface Notification {
  id: string
  recipientId: string
  type: NotificationType
  requestId: string | null
  message: string // pre-rendered, human-readable
  isRead: boolean
  createdAt: string
}

export interface AuditLogEntry {
  id: string
  requestId: string
  action: AuditAction
  actorId: string
  timestamp: string // ISO datetime
  note: string | null // rejection comment, HR note, etc.
  fromStatus: RequestStatus | null
  toStatus: RequestStatus
}

// ─── Auth session (localStorage) ──────────────────────────────────────────────

export interface AuthSession {
  userId: string
  // Role can be overridden by the dev role switcher without mutating User.role.
  role: UserRole
}

// ─── Store shape (serialised to localStorage) ─────────────────────────────────

export interface AppStore {
  users: User[]
  departments: Department[]
  leavePolicies: LeavePolicy[]
  leaveBalances: LeaveBalance[]
  leaveRequests: LeaveRequest[]
  notifications: Notification[]
  auditLog: AuditLogEntry[]
  seedVersion: number // bump to force a re-seed on breaking schema changes
}
