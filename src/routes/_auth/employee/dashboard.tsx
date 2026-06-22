import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { CalendarPlus, Inbox } from 'lucide-react'
import { useCurrentUser } from '#/hooks/useAuth'
import { useBalancesByUser } from '#/queries/balances'
import { usePolicies } from '#/queries/directory'
import { useRequestsByUser } from '#/queries/requests'
import { Button } from '#/components/ui/Button'
import { EmptyState, PageHeader, PageLoader } from '#/components/ui/Feedback'
import { BalanceCard } from '#/components/leave/BalanceCard'
import { LeaveRequestCard } from '#/components/leave/LeaveRequestCard'

export const Route = createFileRoute('/_auth/employee/dashboard')({
  component: EmployeeDashboard,
})

function EmployeeDashboard() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const balances = useBalancesByUser(user.id)
  const policies = usePolicies()
  const requests = useRequestsByUser(user.id)

  if (balances.isPending || policies.isPending || requests.isPending) {
    return <PageLoader />
  }

  const policyByType = new Map(
    (policies.data ?? []).map((p) => [p.leaveType, p]),
  )
  // Show paid, entitled balances first.
  const visibleBalances = (balances.data ?? [])
    .filter((b) => {
      const p = policyByType.get(b.leaveType)
      return p && (p.isPaid || b.used > 0)
    })
    .sort((a, b) => b.totalEntitled - a.totalEntitled)

  const recent = (requests.data ?? []).slice(0, 5)
  const pendingCount = (requests.data ?? []).filter(
    (r) => r.status === 'pending' || r.status === 'cancel_pending',
  ).length

  return (
    <div>
      <PageHeader
        title={`Hi, ${user.name.split(' ')[0]}`}
        description={
          pendingCount > 0
            ? `You have ${pendingCount} request${pendingCount > 1 ? 's' : ''} awaiting approval.`
            : 'Your leave at a glance.'
        }
        action={
          <Button
            icon={<CalendarPlus className="size-4" />}
            onClick={() => navigate({ to: '/employee/request/new' })}
          >
            Request leave
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visibleBalances.map((b) => {
          const policy = policyByType.get(b.leaveType)
          return policy ? (
            <BalanceCard key={b.id} balance={b} policy={policy} />
          ) : null
        })}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Recent requests
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: '/employee/history' })}
          >
            View all
          </Button>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-8" />}
            title="No leave requests yet"
            description="Submit your first leave request to see it here."
            action={
              <Button
                size="sm"
                icon={<CalendarPlus className="size-4" />}
                onClick={() => navigate({ to: '/employee/request/new' })}
              >
                Request leave
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recent.map((r) => (
              <LeaveRequestCard
                key={r.id}
                request={r}
                to={`/employee/request/${r.id}`}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
