// Central query-key factory so invalidation stays consistent across modules.

export const queryKeys = {
  users: ['users'] as const,
  policies: ['leavePolicies'] as const,
  balances: ['leaveBalances'] as const,
  balancesByUser: (userId: string) =>
    ['leaveBalances', 'byUser', userId] as const,
  requests: ['leaveRequests'] as const,
  requestsByUser: (userId: string) =>
    ['leaveRequests', 'byUser', userId] as const,
  requestsByManager: (managerId: string) =>
    ['leaveRequests', 'byManager', managerId] as const,
  requestDetail: (id: string) => ['leaveRequests', 'detail', id] as const,
  audit: (requestId: string) => ['auditLog', requestId] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
}
