import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { LeavePolicy, User } from '#/types'
import {
  getDepartments,
  getDirectReports,
  getUsers,
  updateUser,
} from '#/store/users'
import { getLeavePolicies, updateLeavePolicy } from '#/store/leaveTypes'
import { queryKeys } from './keys'

export const usersQuery = () =>
  queryOptions({ queryKey: queryKeys.users, queryFn: () => getUsers() })

export const policiesQuery = () =>
  queryOptions({ queryKey: queryKeys.policies, queryFn: () => getLeavePolicies() })

export const useUsers = () => useQuery(usersQuery())
export const usePolicies = () => useQuery(policiesQuery())

export const useDepartments = () =>
  useQuery({ queryKey: ['departments'], queryFn: () => getDepartments() })

export const useDirectReports = (managerId: string) =>
  useQuery({
    queryKey: ['users', 'reports', managerId],
    queryFn: () => getDirectReports(managerId),
  })

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { id: string; patch: Partial<User> }) =>
      updateUser(args.id, args.patch),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useUpdatePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { id: string; patch: Partial<LeavePolicy> }) =>
      updateLeavePolicy(args.id, args.patch),
    onSuccess: () => qc.invalidateQueries(),
  })
}
