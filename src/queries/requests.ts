import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { User } from '#/types'
import {
  approveRequest,
  cancelPendingRequest,
  createRequest,
  decideCancellation,
  editRequest,
  getActiveApprovedRequests,
  getPendingForManager,
  getRequestById,
  getRequests,
  getRequestsByEmployee,
  getRequestsByManager,
  rejectRequest,
  requestCancellation,
} from '#/store/leaveRequests'
import type { RequestInput } from '#/store/leaveRequests'
import { getAuditByRequest } from '#/store/auditLog'
import { queryKeys } from './keys'

// ─── Query options ──────────────────────────────────────────────────────────

export const allRequestsQuery = () =>
  queryOptions({ queryKey: queryKeys.requests, queryFn: () => getRequests() })

export const requestsByUserQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.requestsByUser(userId),
    queryFn: () => getRequestsByEmployee(userId),
  })

export const requestsByManagerQuery = (managerId: string) =>
  queryOptions({
    queryKey: queryKeys.requestsByManager(managerId),
    queryFn: () => getRequestsByManager(managerId),
  })

export const requestDetailQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.requestDetail(id),
    queryFn: () => getRequestById(id) ?? null,
  })

export const auditQuery = (requestId: string) =>
  queryOptions({
    queryKey: queryKeys.audit(requestId),
    queryFn: () => getAuditByRequest(requestId),
  })

// ─── Read hooks ───────────────────────────────────────────────────────────────

export const useAllRequests = () => useQuery(allRequestsQuery())

export const useRequestsByUser = (userId: string) =>
  useQuery(requestsByUserQuery(userId))

export const useRequestsByManager = (managerId: string) =>
  useQuery(requestsByManagerQuery(managerId))

export const useRequestDetail = (id: string) =>
  useQuery(requestDetailQuery(id))

export const useAuditTrail = (requestId: string) =>
  useQuery(auditQuery(requestId))

export const usePendingForManager = (managerId: string) =>
  useQuery({
    queryKey: [...queryKeys.requestsByManager(managerId), 'pending'],
    queryFn: () => getPendingForManager(managerId),
  })

export const useActiveApprovedRequests = () =>
  useQuery({
    queryKey: [...queryKeys.requests, 'approved'],
    queryFn: () => getActiveApprovedRequests(),
  })

// ─── Mutations ────────────────────────────────────────────────────────────────
// Data lives in one localStorage-backed store, so we invalidate everything after
// each mutation — cheap (no network) and guarantees balances/notifications/audit
// all reflect the change.

function useStoreMutation<TArgs, TResult>(fn: (args: TArgs) => TResult) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: TArgs): Promise<TResult> => fn(args),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export const useCreateRequest = () =>
  useStoreMutation(({ employee, input }: { employee: User; input: RequestInput }) =>
    createRequest(employee, input),
  )

export const useEditRequest = () =>
  useStoreMutation(
    ({
      id,
      actor,
      input,
    }: {
      id: string
      actor: User
      input: RequestInput
    }) => editRequest(id, actor, input),
  )

export const useApproveRequest = () =>
  useStoreMutation(({ id, actor }: { id: string; actor: User }) =>
    approveRequest(id, actor),
  )

export const useRejectRequest = () =>
  useStoreMutation(
    ({ id, actor, comment }: { id: string; actor: User; comment: string }) =>
      rejectRequest(id, actor, comment),
  )

export const useCancelPending = () =>
  useStoreMutation(({ id, actor }: { id: string; actor: User }) =>
    cancelPendingRequest(id, actor),
  )

export const useRequestCancellation = () =>
  useStoreMutation(
    ({ id, actor, reason }: { id: string; actor: User; reason: string }) =>
      requestCancellation(id, actor, reason),
  )

export const useDecideCancellation = () =>
  useStoreMutation(
    ({ id, actor, approve }: { id: string; actor: User; approve: boolean }) =>
      decideCancellation(id, actor, approve),
  )
