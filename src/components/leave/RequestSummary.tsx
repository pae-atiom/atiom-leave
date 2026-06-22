import { AlertTriangle } from 'lucide-react'
import type { SubmitSummary } from '#/logic/leaveCalc'
import { DURATION_LABEL } from '#/logic/leaveCalc'
import { cn, formatDate, formatDays } from '#/lib/utils'

/** The confirmation summary the employee reviews before submitting. */
export function RequestSummary({ summary }: { summary: SubmitSummary }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <dl className="flex flex-col divide-y divide-slate-200/70">
        <Row label="Leave type" value={summary.leaveLabel} />
        <div className="py-2.5">
          <dt className="text-sm text-slate-500">Dates</dt>
          <dd className="mt-1 flex flex-col gap-1">
            {summary.dates.map((d) => (
              <div
                key={d.date}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-slate-700">{formatDate(d.date)}</span>
                <span className="text-slate-500">
                  {DURATION_LABEL[d.duration]} · {formatDays(d.days)}
                </span>
              </div>
            ))}
          </dd>
        </div>
        <Row
          label="Total deduction"
          value={summary.isPaid ? formatDays(summary.totalDays) : 'Unpaid'}
          strong
        />
        {summary.isPaid && (
          <Row
            label="Balance after"
            value={formatDays(summary.balanceAfter)}
            valueClassName={
              summary.willExceedBalance ? 'text-red-600' : 'text-slate-900'
            }
          />
        )}
      </dl>

      {summary.willExceedBalance && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          This request exceeds the available balance ({formatDays(
            summary.currentBalance,
          )}{' '}
          remaining). You can still submit it for manager review.
        </p>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  strong,
  valueClassName,
}: {
  label: string
  value: string
  strong?: boolean
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd
        className={cn(
          'text-sm',
          strong ? 'font-semibold text-slate-900' : 'text-slate-700',
          valueClassName,
        )}
      >
        {value}
      </dd>
    </div>
  )
}
