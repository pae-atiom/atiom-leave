import { createFileRoute } from '@tanstack/react-router'
import { CheckCheck } from 'lucide-react'
import { useCurrentUser } from '#/hooks/useAuth'
import {
  usePendingForManager,
  useRequestsByManager,
} from '#/queries/requests'
import { getUserById } from '#/store/users'
import { EmptyState, PageHeader, PageLoader } from '#/components/ui/Feedback'
import { LeaveRequestCard } from '#/components/leave/LeaveRequestCard'

export const Route = createFileRoute('/_auth/manager/dashboard')({
  component: ManagerDashboard,
})

function ManagerDashboard() {
  const manager = useCurrentUser()
  const pending = usePendingForManager(manager.id)
  const all = useRequestsByManager(manager.id)

  if (pending.isPending || all.isPending) return <PageLoader />

  const queue = pending.data ?? []
  const decidedThisCount = (all.data ?? []).filter(
    (r) => r.status === 'approved',
  ).length

  return (
    <div>
      <PageHeader
        title="Approvals"
        description={
          queue.length > 0
            ? `${queue.length} request${queue.length > 1 ? 's' : ''} need your decision.`
            : 'You’re all caught up.'
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:max-w-md">
        <Stat label="Awaiting you" value={queue.length} tone="amber" />
        <Stat label="Approved (team)" value={decidedThisCount} tone="emerald" />
      </div>

      {queue.length === 0 ? (
        <EmptyState
          icon={<CheckCheck className="size-8" />}
          title="No pending approvals"
          description="New requests from your team will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {queue.map((r) => (
            <LeaveRequestCard
              key={r.id}
              request={r}
              to={`/manager/approve/${r.id}`}
              showEmployee
              employeeName={getUserById(r.employeeId)?.name}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'amber' | 'emerald'
}) {
  const ring = tone === 'amber' ? 'text-amber-600' : 'text-emerald-600'
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200/80">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${ring}`}>{value}</p>
    </div>
  )
}
