import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Info } from 'lucide-react'
import type {
  Attachment,
  DateEntry,
  DayDuration,
  LeaveTypeName,
  User,
} from '#/types'
import type { RequestInput } from '#/store/leaveRequests'
import { cn } from '#/lib/utils'
import { usePolicies } from '#/queries/directory'
import { useLeaveCalculation } from '#/hooks/useLeaveCalculation'
import { Button } from '#/components/ui/Button'
import { Card } from '#/components/ui/Card'
import { FieldGroup, Select, Textarea } from '#/components/ui/Field'
import { MultiDatePicker } from './MultiDatePicker'
import { DurationPicker } from './DurationPicker'
import { AttachmentUpload } from './AttachmentUpload'
import { RequestSummary } from './RequestSummary'

export interface LeaveFormInitial {
  leaveType: LeaveTypeName
  dates: DateEntry[]
  reason: string
  attachments: Attachment[]
}

const STEPS = ['Type & dates', 'Duration & details', 'Review']

export function LeaveRequestForm({
  user,
  initial,
  submitting,
  submitLabel = 'Submit request',
  onSubmit,
}: {
  user: User
  initial?: LeaveFormInitial
  submitting: boolean
  submitLabel?: string
  onSubmit: (input: RequestInput) => void
}) {
  const { data: policies = [] } = usePolicies()
  const [step, setStep] = useState(0)
  const [leaveType, setLeaveType] = useState<LeaveTypeName>(
    initial?.leaveType ?? 'annual',
  )
  const [selectedDates, setSelectedDates] = useState<string[]>(
    initial?.dates.map((d) => d.date) ?? [],
  )
  const [durations, setDurations] = useState<Record<string, DayDuration>>(
    Object.fromEntries(
      (initial?.dates ?? []).map((d) => [d.date, d.duration]),
    ),
  )
  const [reason, setReason] = useState(initial?.reason ?? '')
  const [attachments, setAttachments] = useState<Attachment[]>(
    initial?.attachments ?? [],
  )
  const [confirmed, setConfirmed] = useState(false)

  const dateEntries: DateEntry[] = useMemo(
    () =>
      [...selectedDates]
        .sort()
        .map((date) => ({ date, duration: durations[date] ?? 'full' })),
    [selectedDates, durations],
  )

  const summary = useLeaveCalculation(user.id, leaveType, dateEntries)
  const policy = policies.find((p) => p.leaveType === leaveType)

  const canNext =
    (step === 0 && selectedDates.length > 0) ||
    (step === 1 && reason.trim().length > 0) ||
    step === 2

  function submit() {
    onSubmit({ leaveType, dates: dateEntries, reason: reason.trim(), attachments })
  }

  return (
    <div>
      {/* Stepper */}
      <ol className="mb-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                i < step && 'bg-brand-600 text-white',
                i === step && 'bg-brand-600 text-white ring-4 ring-brand-100',
                i > step && 'bg-slate-200 text-slate-500',
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                'hidden text-sm font-medium sm:block',
                i <= step ? 'text-slate-900' : 'text-slate-400',
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="h-px flex-1 bg-slate-200" />
            )}
          </li>
        ))}
      </ol>

      <Card className="p-5">
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <FieldGroup label="Leave type" htmlFor="leaveType">
              <Select
                id="leaveType"
                value={leaveType}
                onChange={(e) =>
                  setLeaveType(e.target.value as LeaveTypeName)
                }
              >
                {policies.map((p) => (
                  <option key={p.id} value={p.leaveType}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup
              label="Select dates"
              hint={
                selectedDates.length > 0
                  ? `${selectedDates.length} selected`
                  : 'Tap days to toggle'
              }
            >
              <MultiDatePicker
                value={selectedDates}
                onChange={setSelectedDates}
              />
            </FieldGroup>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <FieldGroup label="Duration per day">
              <DurationPicker
                dates={[...selectedDates].sort()}
                durations={durations}
                onChange={(date, duration) =>
                  setDurations((prev) => ({ ...prev, [date]: duration }))
                }
              />
            </FieldGroup>
            <FieldGroup label="Reason / comment" htmlFor="reason">
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Add a short reason for your manager…"
              />
            </FieldGroup>
            <FieldGroup
              label="Supporting documents"
              hint={policy?.requiresDocument ? 'Recommended' : 'Optional'}
            >
              <AttachmentUpload
                attachments={attachments}
                onChange={setAttachments}
              />
            </FieldGroup>
            {policy?.requiresDocument && attachments.length === 0 && (
              <p className="flex items-center gap-2 text-xs text-amber-600">
                <Info className="size-3.5" />
                {policy.label} usually requires a supporting document.
              </p>
            )}
          </div>
        )}

        {step === 2 && summary && (
          <div className="flex flex-col gap-4">
            <RequestSummary summary={summary} />
            {reason && (
              <div className="rounded-lg bg-surface px-3 py-2 text-sm ring-1 ring-slate-200">
                <p className="text-xs text-slate-400">Reason</p>
                <p className="mt-0.5 text-slate-700">{reason}</p>
              </div>
            )}
            <label className="flex items-start gap-2.5 rounded-lg bg-brand-50/60 px-3 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              I confirm the details above are correct and want to submit this
              request for approval.
            </label>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between">
          {step > 0 ? (
            <Button
              variant="ghost"
              icon={<ArrowLeft className="size-4" />}
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </Button>
          ) : (
            <span />
          )}

          {step < 2 ? (
            <Button
              disabled={!canNext}
              icon={<ArrowRight className="size-4" />}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="success"
              disabled={!confirmed || submitting}
              icon={<Check className="size-4" />}
              onClick={submit}
            >
              {submitting ? 'Submitting…' : submitLabel}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
