import type { ReactNode } from 'react'
import { CalendarRange, FileText, History, MessageSquare } from 'lucide-react'
import type { AuditLogEntry, LeaveRequest } from '#/types'
import { DURATION_LABEL } from '#/logic/leaveCalc'
import { formatDate, formatDateTime, formatDays } from '#/lib/utils'
import { LEAVE_TYPE_LABEL } from '#/lib/labels'
import { getUserById } from '#/store/users'
import { Card, CardHeader } from '#/components/ui/Card'
import { StatusBadge } from '#/components/ui/Badge'
import { AuditTrail } from './AuditTrail'

export function LeaveRequestDetail({
  request,
  audit,
  showEmployee,
  actions,
}: {
  request: LeaveRequest
  audit: AuditLogEntry[]
  showEmployee?: boolean
  actions?: ReactNode
}) {
  const v = request.currentVersion
  const employee = getUserById(request.employeeId)
  const manager = getUserById(request.managerId)

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="flex flex-col gap-5 lg:col-span-2">
        <Card>
          <div className="flex items-start justify-between gap-3 px-5 py-4">
            <div>
              {showEmployee && employee && (
                <p className="text-xs font-medium text-slate-400">
                  {employee.name} · reports to {manager?.name ?? '—'}
                </p>
              )}
              <h2 className="text-lg font-semibold text-slate-900">
                {LEAVE_TYPE_LABEL[v.leaveType]}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                <CalendarRange className="size-4 text-slate-400" />
                {formatDays(v.totalDays)} total
              </p>
            </div>
            <StatusBadge status={request.status} />
          </div>

          <div className="border-t border-slate-100 px-5 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Dates
            </p>
            <ul className="flex flex-col gap-1.5">
              {v.dates.map((d) => (
                <li
                  key={d.date}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-700">{formatDate(d.date)}</span>
                  <span className="text-slate-500">
                    {DURATION_LABEL[d.duration]}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {v.reason && (
            <div className="border-t border-slate-100 px-5 py-4">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <MessageSquare className="size-3.5" /> Reason
              </p>
              <p className="text-sm text-slate-700">{v.reason}</p>
            </div>
          )}

          {v.attachments.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Attachments
              </p>
              <ul className="flex flex-col gap-1.5">
                {v.attachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <FileText className="size-4 text-slate-400" />
                    {a.filename}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {request.rejectionComment && (
            <div className="border-t border-slate-100 bg-red-50/50 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                Rejection reason
              </p>
              <p className="mt-1 text-sm text-red-700">
                {request.rejectionComment}
              </p>
            </div>
          )}

          {request.cancelReason &&
            (request.status === 'cancel_pending' ||
              request.status === 'cancel_approved') && (
              <div className="border-t border-slate-100 bg-orange-50/50 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
                  Cancellation reason
                </p>
                <p className="mt-1 text-sm text-orange-700">
                  {request.cancelReason}
                </p>
              </div>
            )}

          {actions && (
            <div className="border-t border-slate-100 px-5 py-4">{actions}</div>
          )}
        </Card>

        {request.versions.length > 1 && (
          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-1.5">
                  <History className="size-4 text-slate-400" /> Version history
                </span>
              }
              subtitle={`${request.versions.length} versions submitted`}
            />
            <ul className="divide-y divide-slate-100">
              {[...request.versions].reverse().map((ver) => (
                <li
                  key={ver.versionNumber}
                  className="flex items-center justify-between px-5 py-3 text-sm"
                >
                  <span className="font-medium text-slate-700">
                    v{ver.versionNumber}
                    {ver.versionNumber === request.versions.length && (
                      <span className="ml-2 text-xs font-normal text-brand-600">
                        current
                      </span>
                    )}
                  </span>
                  <span className="text-slate-500">
                    {formatDays(ver.totalDays)} · {formatDateTime(ver.submittedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <div className="lg:col-span-1">
        <Card>
          <CardHeader title="Activity" />
          <div className="px-5 py-4">
            <AuditTrail entries={audit} />
          </div>
        </Card>
      </div>
    </div>
  )
}
