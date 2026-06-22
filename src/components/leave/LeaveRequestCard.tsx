import { Link } from '@tanstack/react-router'
import { CalendarRange, Paperclip } from 'lucide-react'
import type { LeaveRequest } from '#/types'
import { formatDateRange, formatDays } from '#/lib/utils'
import { LEAVE_TYPE_LABEL } from '#/lib/labels'
import { StatusBadge } from '#/components/ui/Badge'

export function requestDateRange(request: LeaveRequest): string {
  return formatDateRange(request.currentVersion.dates.map((d) => d.date))
}

export function LeaveRequestCard({
  request,
  to,
  showEmployee,
  employeeName,
}: {
  request: LeaveRequest
  to: string
  showEmployee?: boolean
  employeeName?: string
}) {
  const v = request.currentVersion
  const attachments = v.attachments.length

  return (
    <Link
      to={to}
      className="block rounded-xl bg-white p-4 ring-1 ring-slate-200/80 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showEmployee && employeeName && (
            <p className="truncate text-xs font-medium text-slate-400">
              {employeeName}
            </p>
          )}
          <p className="font-medium text-slate-900">
            {LEAVE_TYPE_LABEL[v.leaveType]}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <CalendarRange className="size-4 shrink-0 text-slate-400" />
            {requestDateRange(request)}
          </p>
        </div>
        <StatusBadge status={request.status} />
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
        <span className="font-medium text-slate-600">
          {formatDays(v.totalDays)}
        </span>
        {request.versions.length > 1 && (
          <span>· v{request.versions.length}</span>
        )}
        {attachments > 0 && (
          <span className="inline-flex items-center gap-1">
            <Paperclip className="size-3.5" /> {attachments}
          </span>
        )}
      </div>
    </Link>
  )
}
