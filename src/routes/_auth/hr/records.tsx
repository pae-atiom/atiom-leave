import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Download, FileSpreadsheet } from 'lucide-react'
import type { LeaveRequest, RequestStatus } from '#/types'
import {
  downloadFile,
  formatDate,
  formatDateRange,
  toCsv,
} from '#/lib/utils'
import { LEAVE_TYPE_LABEL, STATUS_LABEL } from '#/lib/labels'
import { useAllRequests, useAuditTrail } from '#/queries/requests'
import { useUsers } from '#/queries/directory'
import { Button } from '#/components/ui/Button'
import { Select } from '#/components/ui/Field'
import { Card } from '#/components/ui/Card'
import { Modal } from '#/components/ui/Modal'
import { StatusBadge } from '#/components/ui/Badge'
import { EmptyState, PageHeader, PageLoader } from '#/components/ui/Feedback'
import { LeaveRequestDetail } from '#/components/leave/LeaveRequestDetail'

export const Route = createFileRoute('/_auth/hr/records')({
  component: Records,
})

const STATUSES: RequestStatus[] = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'cancel_pending',
  'cancel_approved',
]

function Records() {
  const { data: requests, isPending } = useAllRequests()
  const { data: users = [] } = useUsers()
  const [status, setStatus] = useState<string>('all')
  const [type, setType] = useState<string>('all')
  const [selected, setSelected] = useState<LeaveRequest | null>(null)

  const userById = useMemo(
    () => new Map(users.map((u) => [u.id, u])),
    [users],
  )

  const filtered = useMemo(() => {
    return (requests ?? []).filter((r) => {
      if (status !== 'all' && r.status !== status) return false
      if (type !== 'all' && r.currentVersion.leaveType !== type) return false
      return true
    })
  }, [requests, status, type])

  if (isPending) return <PageLoader />

  function exportCsv() {
    const rows = filtered.map((r) => {
      const emp = userById.get(r.employeeId)
      const mgr = userById.get(r.managerId)
      const dates = r.currentVersion.dates.map((d) => d.date).sort()
      return [
        emp?.name ?? r.employeeId,
        emp?.email ?? '',
        LEAVE_TYPE_LABEL[r.currentVersion.leaveType],
        dates[0] ?? '',
        dates[dates.length - 1] ?? '',
        r.currentVersion.totalDays,
        STATUS_LABEL[r.status],
        mgr?.name ?? '',
        r.createdAt.slice(0, 10),
      ]
    })
    const csv = toCsv(
      [
        'Employee',
        'Email',
        'Leave Type',
        'Start',
        'End',
        'Total Days',
        'Status',
        'Manager',
        'Submitted',
      ],
      rows,
    )
    downloadFile('leave-records.csv', csv)
  }

  return (
    <div>
      <PageHeader
        title="All records"
        description="Every leave request across the company."
        action={
          <Button
            variant="secondary"
            icon={<Download className="size-4" />}
            onClick={exportCsv}
            disabled={filtered.length === 0}
          >
            Export CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-auto"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <Select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-auto"
        >
          <option value="all">All types</option>
          {Object.entries(LEAVE_TYPE_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileSpreadsheet className="size-8" />}
          title="No records match"
          description="Try a different filter."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 text-right font-medium">Days</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="cursor-pointer hover:bg-slate-50/60"
                  >
                    <td className="px-5 py-3 font-medium text-slate-800">
                      {userById.get(r.employeeId)?.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {LEAVE_TYPE_LABEL[r.currentVersion.leaveType]}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateRange(
                        r.currentVersion.dates.map((d) => d.date),
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                      {r.currentVersion.totalDays}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Request detail"
        size="lg"
      >
        {selected && <RecordDetail request={selected} />}
      </Modal>
    </div>
  )
}

/** Request detail for the records modal — pulls the audit trail by query. */
function RecordDetail({ request }: { request: LeaveRequest }) {
  const { data: audit = [] } = useAuditTrail(request.id)
  return <LeaveRequestDetail request={request} audit={audit} showEmployee />
}
