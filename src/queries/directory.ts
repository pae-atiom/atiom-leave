import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { LeavePolicy, User, UserInput } from '#/types'
import { api } from '#/lib/api'
import { queryKeys } from './keys'

export const usersQuery = () =>
  queryOptions({ queryKey: queryKeys.users, queryFn: () => api.users.list() })

export const policiesQuery = () =>
  queryOptions({ queryKey: queryKeys.policies, queryFn: () => api.policies.list() })

export const useUsers = () => useQuery(usersQuery())
export const usePolicies = () => useQuery(policiesQuery())

export const useDepartments = () =>
  useQuery({ queryKey: ['departments'], queryFn: () => api.departments.list() })

export const useDirectReports = (managerId: string) =>
  useQuery({
    queryKey: ['users', 'reports', managerId],
    queryFn: () => api.users.reports(managerId),
  })

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UserInput) => api.users.create(input),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; patch: Partial<User> }) =>
      api.users.update(args.id, args.patch),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useUpdatePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; patch: Partial<LeavePolicy> }) =>
      api.policies.update(args.id, args.patch),
    onSuccess: () => qc.invalidateQueries(),
  })
}
