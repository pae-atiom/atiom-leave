import { createFileRoute } from '@tanstack/react-router'
import {
  CalendarClock,
  CalendarDays,
  Clock,
  Users as UsersIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { todayIso } from '#/lib/utils'
import { LEAVE_TYPE_LABEL } from '#/lib/labels'
import { useUsers } from '#/queries/directory'
import { useAllRequests } from '#/queries/requests'
import { PageHeader, PageLoader } from '#/components/ui/Feedback'
import { Card, CardHeader } from '#/components/ui/Card'

export const Route = createFileRoute('/_auth/hr/dashboard')({
  component: HrDashboard,
})

function HrDashboard() {
  const users = useUsers()
  const requests = useAllRequests()

  if (users.isPending || requests.isPending) return <PageLoader />

  const allUsers = users.data ?? []
  const allRequests = requests.data ?? []
  const today = todayIso()

  const pending = allRequests.filter(
    (r) => r.status === 'pending' || r.status === 'cancel_pending',
  ).length
  const onLeaveToday = allRequests.filter(
    (r) =>
      r.status === 'approved' &&
      r.currentVersion.dates.some((d) => d.date === today),
  ).length

  // Approved days by leave type (this year).
  const byType = new Map<string, number>()
  for (const r of allRequests) {
    if (r.status !== 'approved') continue
    byType.set(
      r.currentVersion.leaveType,
      (byType.get(r.currentVersion.leaveType) ?? 0) + r.currentVersion.totalDays,
    )
  }
  const typeBreakdown = [...byType.entries()].sort((a, b) => b[1] - a[1])

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Company-wide leave at a glance."
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={UsersIcon} label="Employees" value={allUsers.length} />
        <Stat icon={Clock} label="Pending approvals" value={pending} tone="amber" />
        <Stat
          icon={CalendarClock}
          label="On leave today"
          value={onLeaveToday}
          tone="brand"
        />
        <Stat
          icon={CalendarDays}
          label="Requests (total)"
          value={allRequests.length}
        />
      </section>

      <Card className="mt-6">
        <CardHeader
          title="Approved leave by type"
          subtitle="Total approved days this year"
        />
        <div className="px-5 py-4">
          {typeBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400">No approved leave yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {typeBreakdown.map(([type, days]) => {
                const max = typeBreakdown[0][1] || 1
                return (
                  <li key={type}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-slate-600">
                        {LEAVE_TYPE_LABEL[type as keyof typeof LEAVE_TYPE_LABEL]}
                      </span>
                      <span className="font-medium text-slate-700">
                        {days} days
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${(days / max) * 100}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </Card>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = 'slate',
}: {
  icon: LucideIcon
  label: string
  value: number
  tone?: 'slate' | 'amber' | 'brand'
}) {
  const color =
    tone === 'amber'
      ? 'text-amber-600'
      : tone === 'brand'
        ? 'text-brand-600'
        : 'text-slate-900'
  return (
    <div className="rounded-xl bg-surface p-4 ring-1 ring-slate-200/80">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="size-4" />
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  )
}
