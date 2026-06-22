import type { ReactNode } from 'react'
import type { RequestStatus } from '#/types'
import { cn } from '#/lib/utils'
import { STATUS_LABEL } from '#/lib/labels'

/** Status pill driven by the data-status CSS variables in styles.css. */
export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      data-status={status}
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset"
      style={{
        backgroundColor: 'var(--s-bg)',
        color: 'var(--s-fg)',
        // @ts-expect-error CSS var for ring color
        '--tw-ring-color': 'var(--s-ring)',
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

export function Pill({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600',
        className,
      )}
    >
      {children}
    </span>
  )
}
