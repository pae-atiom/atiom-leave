import type { LeaveBalance, LeavePolicy } from '#/types'
import { getRemainingDays } from '#/logic/leaveCalc'
import { cn, formatDays } from '#/lib/utils'

const DOT: Record<string, string> = {
  annual: 'bg-brand-500',
  sick: 'bg-rose-500',
  birthday: 'bg-pink-500',
  bereavement: 'bg-slate-500',
  maternity: 'bg-purple-500',
  paternity: 'bg-cyan-500',
  lwop: 'bg-amber-500',
  personal: 'bg-emerald-500',
}

export function BalanceCard({
  balance,
  policy,
}: {
  balance: LeaveBalance
  policy: LeavePolicy
}) {
  const entitled = balance.totalEntitled + balance.manualAdjustment
  const remaining = getRemainingDays(balance)
  const pct = entitled > 0 ? Math.min(100, (balance.used / entitled) * 100) : 0
  const unlimited = entitled === 0 && !policy.isPaid

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200/80">
      <div className="flex items-center gap-2">
        <span
          className={cn('size-2.5 rounded-full', DOT[balance.leaveType])}
        />
        <span className="text-sm font-medium text-slate-700">
          {policy.label}
        </span>
      </div>

      {unlimited ? (
        <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
          Unpaid
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tracking-tight text-slate-900">
              {remaining}
            </span>
            <span className="text-sm text-slate-400">
              / {entitled} days left
            </span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn('h-full rounded-full', DOT[balance.leaveType])}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            {formatDays(balance.used)} used
            {balance.manualAdjustment !== 0 &&
              ` · adj ${balance.manualAdjustment > 0 ? '+' : ''}${balance.manualAdjustment}`}
          </p>
        </>
      )}
    </div>
  )
}
