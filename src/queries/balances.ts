import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { LeaveBalance, LeaveTypeName } from '#/types'
import {
  adjustBalance,
  getBalances,
  getBalancesByUser,
  setEntitlement,
} from '#/store/leaveBalances'
import { queryKeys } from './keys'

export const balancesByUserQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.balancesByUser(userId),
    queryFn: () => getBalancesByUser(userId),
  })

export const allBalancesQuery = () =>
  queryOptions({ queryKey: queryKeys.balances, queryFn: () => getBalances() })

export const useBalancesByUser = (userId: string) =>
  useQuery(balancesByUserQuery(userId))

export const useAllBalances = () => useQuery(allBalancesQuery())

export function useAdjustBalance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      userId: string
      leaveType: LeaveTypeName
      manualAdjustment: number
      actorId: string
    }) =>
      adjustBalance(
        args.userId,
        args.leaveType,
        args.manualAdjustment,
        args.actorId,
      ),
    onSuccess: () => qc.invalidateQueries(),
  })
}

/**
 * Persist a user's per-leave-type balance settings. Writes the base entitlement
 * and/or the manual adjustment, but only the fields that actually changed — so
 * each edit produces a single, meaningful audit entry.
 */
export function useSaveBalanceSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      balance: LeaveBalance
      totalEntitled: number
      manualAdjustment: number
      actorId: string
    }) => {
      const { balance, totalEntitled, manualAdjustment, actorId } = args
      if (totalEntitled !== balance.totalEntitled) {
        setEntitlement(balance.userId, balance.leaveType, totalEntitled, actorId)
      }
      if (manualAdjustment !== balance.manualAdjustment) {
        adjustBalance(
          balance.userId,
          balance.leaveType,
          manualAdjustment,
          actorId,
        )
      }
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}
