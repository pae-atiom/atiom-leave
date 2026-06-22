import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Save } from 'lucide-react'
import type { LeavePolicy } from '#/types'
import { usePolicies, useUpdatePolicy } from '#/queries/directory'
import { Button } from '#/components/ui/Button'
import { FieldGroup, Input, Textarea } from '#/components/ui/Field'
import { Card } from '#/components/ui/Card'
import { PageHeader, PageLoader } from '#/components/ui/Feedback'
import { useToast } from '#/components/ui/Toast'

export const Route = createFileRoute('/_auth/hr/policies')({
  component: Policies,
})

function Policies() {
  const { data: policies, isPending } = usePolicies()
  if (isPending) return <PageLoader />
  return (
    <div>
      <PageHeader
        title="Leave policies"
        description="Configure entitlements and document requirements."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(policies ?? []).map((p) => (
          <PolicyCard key={p.id} policy={p} />
        ))}
      </div>
    </div>
  )
}

function PolicyCard({ policy }: { policy: LeavePolicy }) {
  const update = useUpdatePolicy()
  const { toast } = useToast()
  const [draft, setDraft] = useState(policy)

  const dirty =
    draft.annualEntitlementDays !== policy.annualEntitlementDays ||
    draft.requiresDocument !== policy.requiresDocument ||
    draft.notes !== policy.notes

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">{policy.label}</h3>
        <span className="text-xs text-slate-400">
          {policy.isPaid ? 'Paid' : 'Unpaid'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FieldGroup label="Annual entitlement (days)">
          <Input
            type="number"
            step="0.5"
            min="0"
            value={draft.annualEntitlementDays}
            onChange={(e) =>
              setDraft({
                ...draft,
                annualEntitlementDays: Number(e.target.value),
              })
            }
          />
        </FieldGroup>
        <FieldGroup label="Max / year">
          <Input
            value={draft.maxPerYearDays ?? '∞'}
            disabled
            className="text-slate-400"
          />
        </FieldGroup>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={draft.requiresDocument}
          onChange={(e) =>
            setDraft({ ...draft, requiresDocument: e.target.checked })
          }
          className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        Requires supporting document
      </label>

      <FieldGroup label="Notes">
        <Textarea
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        />
      </FieldGroup>

      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={!dirty || update.isPending}
          icon={<Save className="size-4" />}
          onClick={() =>
            update.mutate(
              {
                id: policy.id,
                patch: {
                  annualEntitlementDays: draft.annualEntitlementDays,
                  requiresDocument: draft.requiresDocument,
                  notes: draft.notes,
                },
              },
              { onSuccess: () => toast('Policy updated', 'success') },
            )
          }
        >
          Save changes
        </Button>
      </div>
    </Card>
  )
}
