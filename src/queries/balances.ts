import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { LeaveTypeName } from '#/types'
import {
  adjustBalance,
  getBalances,
  getBalancesByUser,
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
