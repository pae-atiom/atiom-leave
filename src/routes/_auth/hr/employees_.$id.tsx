import { useState } from 'react'
import {
  Link,
  createFileRoute,
  useParams,
} from '@tanstack/react-router'
import { ArrowLeft, Save } from 'lucide-react'
import type { LeaveBalance } from '#/types'
import { useCurrentUser } from '#/hooks/useAuth'
import { useUpdateUser, useUsers } from '#/queries/directory'
import { useBalancesByUser, useSaveBalanceSettings } from '#/queries/balances'
import { getRemainingDays } from '#/logic/leaveCalc'
import { LEAVE_TYPE_LABEL } from '#/lib/labels'
import { Button } from '#/components/ui/Button'
import { FieldGroup, Select } from '#/components/ui/Field'
import { Card, CardHeader } from '#/components/ui/Card'
import { EmptyState, PageHeader, PageLoader } from '#/components/ui/Feedback'
import { useToast } from '#/components/ui/Toast'

export const Route = createFileRoute('/_auth/hr/employees_/$id')({
  component: EmployeeDetail,
})

interface BalanceDraft {
  entitled: number
  adjustment: number
}

function EmployeeDetail() {
  const { id } = useParams({ from: '/_auth/hr/employees_/$id' })
  const hr = useCurrentUser()
  const { toast } = useToast()
  const users = useUsers()
  const balances = useBalancesByUser(id)
  const updateUser = useUpdateUser()
  const save = useSaveBalanceSettings()

  const [drafts, setDrafts] = useState<Record<string, BalanceDraft>>({})

  if (users.isPending || balances.isPending) return <PageLoader />
  const employee = (users.data ?? []).find((u) => u.id === id)
  if (!employee) return <EmptyState title="Employee not found" />

  const managers = (users.data ?? []).filter(
    (u) => u.role === 'manager' || u.role === 'hr',
  )

  function draftFor(balance: LeaveBalance): BalanceDraft {
    return (
      drafts[balance.leaveType] ?? {
        entitled: balance.totalEntitled,
        adjustment: balance.manualAdjustment,
      }
    )
  }

  function patchDraft(balance: LeaveBalance, patch: Partial<BalanceDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [balance.leaveType]: { ...draftFor(balance), ...patch },
    }))
  }

  function saveBalance(balance: LeaveBalance) {
    const draft = draftFor(balance)
    save.mutate(
      {
        balance,
        totalEntitled: draft.entitled,
        manualAdjustment: draft.adjustment,
        actorId: hr.id,
      },
      {
        onSuccess: () => {
          setDrafts((prev) => {
            const next = { ...prev }
            delete next[balance.leaveType]
            return next
          })
          toast('Balance updated', 'success')
        },
      },
    )
  }

  return (
    <div>
      <Link
        to="/hr/employees"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="size-4" /> Back to employees
      </Link>

      <PageHeader title={employee.name} description={employee.email} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Reporting line" />
          <div className="px-5 py-4">
            <FieldGroup label="Direct manager" htmlFor="manager">
              <Select
                id="manager"
                value={employee.managerId ?? ''}
                onChange={(e) =>
                  updateUser.mutate(
                    {
                      id: employee.id,
                      patch: { managerId: e.target.value || null },
                    },
                    { onSuccess: () => toast('Reporting line updated', 'success') },
                  )
                }
              >
                <option value="">No manager</option>
                {managers
                  .filter((m) => m.id !== employee.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </Select>
            </FieldGroup>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Leave balances"
            subtitle="Set each employee's entitlement individually — e.g. annual leave by seniority"
          />
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 text-right font-medium">Used</th>
                  <th className="px-3 py-2.5 text-right font-medium">Entitled</th>
                  <th className="px-3 py-2.5 text-right font-medium">Adj.</th>
                  <th className="px-3 py-2.5 text-right font-medium">Left</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(balances.data ?? []).map((b) => {
                  const draft = draftFor(b)
                  const dirty =
                    draft.entitled !== b.totalEntitled ||
                    draft.adjustment !== b.manualAdjustment
                  return (
                    <tr key={b.id}>
                      <td className="px-5 py-2.5 text-slate-700">
                        {LEAVE_TYPE_LABEL[b.leaveType]}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                        {b.used}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={draft.entitled}
                          onChange={(e) =>
                            patchDraft(b, { entitled: Number(e.target.value) })
                          }
                          className="w-16 rounded-md px-2 py-1 text-right ring-1 ring-inset ring-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="number"
                          step="0.5"
                          value={draft.adjustment}
                          onChange={(e) =>
                            patchDraft(b, { adjustment: Number(e.target.value) })
                          }
                          className="w-16 rounded-md px-2 py-1 text-right ring-1 ring-inset ring-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium tabular-nums text-slate-700">
                        {getRemainingDays({
                          ...b,
                          totalEntitled: draft.entitled,
                          manualAdjustment: draft.adjustment,
                        })}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {dirty && (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<Save className="size-3.5" />}
                            disabled={save.isPending}
                            onClick={() => saveBalance(b)}
                          >
                            Save
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
