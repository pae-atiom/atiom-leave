import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { LeaveBalance, LeaveTypeName } from '#/types'
import { api } from '#/lib/api'
import { queryKeys } from './keys'

export const balancesByUserQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.balancesByUser(userId),
    queryFn: () => api.balances.byUser(userId),
  })

export const allBalancesQuery = () =>
  queryOptions({ queryKey: queryKeys.balances, queryFn: () => api.balances.all() })

export const useBalancesByUser = (userId: string) =>
  useQuery(balancesByUserQuery(userId))

export const useAllBalances = () => useQuery(allBalancesQuery())

export function useAdjustBalance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      userId: string
      leaveType: LeaveTypeName
      manualAdjustment: number
    }) => api.balances.adjust(args),
    onSuccess: () => qc.invalidateQueries(),
  })
}

/**
 * Persist a user's per-leave-type balance settings. Writes the base entitlement
 * and/or the manual adjustment, but only the fields that actually changed — so
 * each edit produces a single, meaningful audit entry. The acting HR user is
 * derived server-side from the JWT.
 */
export function useSaveBalanceSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      balance: LeaveBalance
      totalEntitled: number
      manualAdjustment: number
    }) => {
      const { balance, totalEntitled, manualAdjustment } = args
      if (totalEntitled !== balance.totalEntitled) {
        await api.balances.setEntitlement({
          userId: balance.userId,
          leaveType: balance.leaveType,
          totalEntitled,
        })
      }
      if (manualAdjustment !== balance.manualAdjustment) {
        await api.balances.adjust({
          userId: balance.userId,
          leaveType: balance.leaveType,
          manualAdjustment,
        })
      }
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}
