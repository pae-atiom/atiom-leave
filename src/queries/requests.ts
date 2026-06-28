import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { RequestInput } from '#/types'
import { api } from '#/lib/api'
import { queryKeys } from './keys'

// ─── Query options ──────────────────────────────────────────────────────────

export const allRequestsQuery = () =>
  queryOptions({ queryKey: queryKeys.requests, queryFn: () => api.requests.all() })

export const requestsByUserQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.requestsByUser(userId),
    queryFn: () => api.requests.byEmployee(userId),
  })

export const requestsByManagerQuery = (managerId: string) =>
  queryOptions({
    queryKey: queryKeys.requestsByManager(managerId),
    queryFn: () => api.requests.byManager(managerId),
  })

export const requestDetailQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.requestDetail(id),
    queryFn: () => api.requests.detail(id),
  })

export const auditQuery = (requestId: string) =>
  queryOptions({
    queryKey: queryKeys.audit(requestId),
    queryFn: () => api.requests.audit(requestId),
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
    queryFn: () => api.requests.pending(managerId),
  })

export const useActiveApprovedRequests = () =>
  useQuery({
    queryKey: [...queryKeys.requests, 'approved'],
    queryFn: () => api.requests.activeApproved(),
  })

// ─── Mutations ────────────────────────────────────────────────────────────────
// The server derives the caller from the JWT, so mutations no longer pass
// actor/employee. We invalidate everything on success so balances, notifications
// and audit all reflect the change.

function useApiMutation<TArgs, TData>(fn: (args: TArgs) => Promise<TData>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries(),
  })
}

export const useCreateRequest = () =>
  useApiMutation((input: RequestInput) => api.requests.create(input))

export const useEditRequest = () =>
  useApiMutation(({ id, input }: { id: string; input: RequestInput }) =>
    api.requests.edit(id, input),
  )

export const useApproveRequest = () =>
  useApiMutation((id: string) => api.requests.approve(id))

export const useRejectRequest = () =>
  useApiMutation(({ id, comment }: { id: string; comment: string }) =>
    api.requests.reject(id, comment),
  )

export const useCancelPending = () =>
  useApiMutation((id: string) => api.requests.cancel(id))

export const useRequestCancellation = () =>
  useApiMutation(({ id, reason }: { id: string; reason: string }) =>
    api.requests.requestCancellation(id, reason),
  )

export const useDecideCancellation = () =>
  useApiMutation(({ id, approve }: { id: string; approve: boolean }) =>
    api.requests.decideCancellation(id, approve),
  )
