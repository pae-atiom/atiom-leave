import { useMemo } from 'react'
import type { DateEntry, LeaveTypeName } from '#/types'
import { buildSubmitSummary } from '#/logic/leaveCalc'
import type { SubmitSummary } from '#/logic/leaveCalc'
import { usePolicies } from '#/queries/directory'
import { useBalancesByUser } from '#/queries/balances'

/**
 * Reactive adapter over buildSubmitSummary: recomputes the pre-submit summary
 * whenever dates or leave type change, pulling the live policy + balance.
 */
export function useLeaveCalculation(
  userId: string,
  leaveType: LeaveTypeName,
  dates: DateEntry[],
): SubmitSummary | null {
  const { data: policies } = usePolicies()
  const { data: balances } = useBalancesByUser(userId)

  return useMemo(() => {
    const policy = policies?.find((p) => p.leaveType === leaveType)
    if (!policy) return null
    const balance = balances?.find((b) => b.leaveType === leaveType) ?? null
    return buildSubmitSummary(dates, leaveType, policy, balance)
  }, [policies, balances, leaveType, dates])
}
