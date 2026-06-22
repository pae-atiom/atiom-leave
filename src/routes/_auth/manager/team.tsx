import { createFileRoute } from '@tanstack/react-router'
import { Users } from 'lucide-react'
import type { LeaveTypeName } from '#/types'
import { useCurrentUser } from '#/hooks/useAuth'
import { useDirectReports } from '#/queries/directory'
import { useAllBalances } from '#/queries/balances'
import { getRemainingDays } from '#/logic/leaveCalc'
import { EmptyState, PageHeader, PageLoader } from '#/components/ui/Feedback'
import { Card } from '#/components/ui/Card'

export const Route = createFileRoute('/_auth/manager/team')({
  component: TeamBalances,
})

const COLUMNS: Array<{ type: LeaveTypeName; label: string }> = [
  { type: 'annual', label: 'Annual' },
  { type: 'sick', label: 'Sick' },
  { type: 'personal', label: 'Personal' },
  { type: 'bereavement', label: 'Bereavement' },
]

function TeamBalances() {
  const manager = useCurrentUser()
  const reports = useDirectReports(manager.id)
  const balances = useAllBalances()

  if (reports.isPending || balances.isPending) return <PageLoader />
  const team = reports.data ?? []

  if (team.length === 0) {
    return (
      <div>
        <PageHeader title="Team balances" />
        <EmptyState
          icon={<Users className="size-8" />}
          title="No direct reports"
          description="You don’t have anyone reporting to you in this demo."
        />
      </div>
    )
  }

  function remaining(userId: string, type: LeaveTypeName): number {
    const b = (balances.data ?? []).find(
      (x) => x.userId === userId && x.leaveType === type,
    )
    return b ? getRemainingDays(b) : 0
  }

  return (
    <div>
      <PageHeader
        title="Team balances"
        description="Remaining leave for your direct reports (days)."
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto scroll-slim">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Employee</th>
                {COLUMNS.map((c) => (
                  <th key={c.type} className="px-4 py-3 text-right font-medium">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {team.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {u.avatarInitials}
                      </span>
                      <span className="font-medium text-slate-800">
                        {u.name}
                      </span>
                    </div>
                  </td>
                  {COLUMNS.map((c) => (
                    <td
                      key={c.type}
                      className="px-4 py-3 text-right tabular-nums text-slate-700"
                    >
                      {remaining(u.id, c.type)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
