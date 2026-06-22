import type {
  AuditAction,
  LeaveTypeName,
  NotificationType,
  RequestStatus,
} from '#/types'

export const STATUS_LABEL: Record<RequestStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  cancel_pending: 'Cancellation pending',
  cancel_approved: 'Cancelled',
}

export const LEAVE_TYPE_LABEL: Record<LeaveTypeName, string> = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  birthday: 'Birthday Leave',
  bereavement: 'Bereavement Leave',
  maternity: 'Maternity Leave',
  paternity: 'Paternity Leave',
  lwop: 'Leave Without Pay',
  personal: 'Personal Business Leave',
}

export const AUDIT_LABEL: Record<AuditAction, string> = {
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  edited: 'Edited & resubmitted',
  cancel_requested: 'Cancellation requested',
  cancel_approved: 'Cancellation approved',
  cancel_denied: 'Cancellation denied',
  balance_adjusted: 'Balance adjusted',
}

export const NOTIFICATION_TITLE: Record<NotificationType, string> = {
  request_submitted: 'New request',
  request_approved: 'Approved',
  request_rejected: 'Rejected',
  request_modified: 'Request modified',
  request_cancelled: 'Request withdrawn',
  pending_reminder: 'Reminder',
  cancel_requested: 'Cancellation requested',
  cancel_approved: 'Cancellation approved',
  cancel_denied: 'Cancellation denied',
}
