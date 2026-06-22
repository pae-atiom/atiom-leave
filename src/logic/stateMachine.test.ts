import { describe, expect, it } from 'vitest'
import { isTransitionAllowed, transitionRequest } from './stateMachine'
import type { LeaveRequest, LeaveRequestVersion, User } from '#/types'

const manager: User = {
  id: 'mgr1',
  name: 'Dana Osei',
  email: 'dana@atiom.app',
  role: 'manager',
  managerId: 'hr1',
  departmentId: 'dep_eng',
  avatarInitials: 'DO',
  isActive: true,
}

const employee: User = {
  id: 'emp1',
  name: 'Alice Kaur',
  email: 'alice@atiom.app',
  role: 'employee',
  managerId: 'mgr1',
  departmentId: 'dep_eng',
  avatarInitials: 'AK',
  isActive: true,
}

const version: LeaveRequestVersion = {
  versionNumber: 1,
  submittedAt: '2026-06-01T09:00:00.000Z',
  leaveType: 'annual',
  dates: [{ date: '2026-06-22', duration: 'full' }],
  totalDays: 1,
  reason: 'Trip',
  attachments: [],
}

function request(status: LeaveRequest['status']): LeaveRequest {
  return {
    id: 'req1',
    employeeId: 'emp1',
    managerId: 'mgr1',
    status,
    currentVersion: version,
    versions: [version],
    rejectionComment: null,
    cancelReason: null,
    createdAt: '2026-06-01T09:00:00.000Z',
    updatedAt: '2026-06-01T09:00:00.000Z',
  }
}

describe('isTransitionAllowed', () => {
  it('allows pending → approved', () => {
    expect(isTransitionAllowed('pending', 'approved')).toBe(true)
  })
  it('forbids approved → rejected', () => {
    expect(isTransitionAllowed('approved', 'rejected')).toBe(false)
  })
  it('treats cancelled and cancel_approved as terminal', () => {
    expect(isTransitionAllowed('cancelled', 'pending')).toBe(false)
    expect(isTransitionAllowed('cancel_approved', 'approved')).toBe(false)
  })
})

describe('transitionRequest', () => {
  it('approves a pending request and logs an audit entry', () => {
    const { updatedRequest, auditEntry } = transitionRequest(
      request('pending'),
      'approved',
      manager,
    )
    expect(updatedRequest.status).toBe('approved')
    expect(auditEntry.action).toBe('approved')
    expect(auditEntry.actorId).toBe('mgr1')
    expect(auditEntry.fromStatus).toBe('pending')
    expect(auditEntry.toStatus).toBe('approved')
  })

  it('throws on an illegal transition', () => {
    expect(() =>
      transitionRequest(request('approved'), 'rejected', manager),
    ).toThrow(/Invalid transition/)
  })

  it('requires a comment to reject', () => {
    expect(() =>
      transitionRequest(request('pending'), 'rejected', manager),
    ).toThrow(/comment is required/)
  })

  it('stores the rejection comment', () => {
    const { updatedRequest, auditEntry } = transitionRequest(
      request('pending'),
      'rejected',
      manager,
      { rejectionComment: 'Too short notice' },
    )
    expect(updatedRequest.rejectionComment).toBe('Too short notice')
    expect(auditEntry.note).toBe('Too short notice')
  })

  it('marks a resubmission (rejected → pending) as an edit', () => {
    const { auditEntry } = transitionRequest(
      request('rejected'),
      'pending',
      employee,
    )
    expect(auditEntry.action).toBe('edited')
  })

  it('records cancellation request reason on approved → cancel_pending', () => {
    const { updatedRequest, auditEntry } = transitionRequest(
      request('approved'),
      'cancel_pending',
      employee,
      { cancelReason: 'Plans changed' },
    )
    expect(updatedRequest.status).toBe('cancel_pending')
    expect(updatedRequest.cancelReason).toBe('Plans changed')
    expect(auditEntry.action).toBe('cancel_requested')
  })

  it('treats cancel_pending → approved as a cancel denial', () => {
    const { auditEntry } = transitionRequest(
      request('cancel_pending'),
      'approved',
      manager,
    )
    expect(auditEntry.action).toBe('cancel_denied')
  })
})
