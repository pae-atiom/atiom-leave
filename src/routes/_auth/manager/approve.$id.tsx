import { useState } from 'react'
import {
  Link,
  createFileRoute,
  useNavigate,
  useParams,
} from '@tanstack/react-router'
import { ArrowLeft, Check, Users, X } from 'lucide-react'
import { useCurrentUser } from '#/hooks/useAuth'
import {
  useApproveRequest,
  useAuditTrail,
  useDecideCancellation,
  useRejectRequest,
  useRequestDetail,
  useRequestsByManager,
} from '#/queries/requests'
import { useBalancesByUser } from '#/queries/balances'
import { useUsers } from '#/queries/directory'
import { findOverlaps } from '#/logic/overlap'
import { getRemainingDays } from '#/logic/leaveCalc'
import { formatDateRange, formatDays } from '#/lib/utils'
import { Button } from '#/components/ui/Button'
import { Modal } from '#/components/ui/Modal'
import { Textarea } from '#/components/ui/Field'
import { EmptyState, PageLoader } from '#/components/ui/Feedback'
import { useToast } from '#/components/ui/Toast'
import { LeaveRequestDetail } from '#/components/leave/LeaveRequestDetail'

export const Route = createFileRoute('/_auth/manager/approve/$id')({
  component: ApprovePage,
})

function ApprovePage() {
  const { id } = useParams({ from: '/_auth/manager/approve/$id' })
  const manager = useCurrentUser()
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: request, isPending } = useRequestDetail(id)
  const { data: audit = [] } = useAuditTrail(id)
  const { data: teamRequests = [] } = useRequestsByManager(manager.id)
  const { data: balances = [] } = useBalancesByUser(request?.employeeId ?? '')
  const { data: users = [] } = useUsers()

  const approve = useApproveRequest()
  const reject = useRejectRequest()
  const decideCancel = useDecideCancellation()

  const [rejectOpen, setRejectOpen] = useState(false)
  const [comment, setComment] = useState('')

  if (isPending) return <PageLoader />
  if (!request) return <EmptyState title="Request not found" />

  const nameById = new Map(users.map((u) => [u.id, u.name]))
  const employeeName = nameById.get(request.employeeId)
  const overlaps = findOverlaps(request, teamRequests)
  const balance = balances.find(
    (b) => b.leaveType === request.currentVersion.leaveType,
  )
  const isApprovalStage = request.status === 'pending'
  const isCancelStage = request.status === 'cancel_pending'

  function done(msg: string) {
    toast(msg, 'success')
    navigate({ to: '/manager/dashboard' })
  }

  const actions = (
    <div className="flex flex-col gap-4">
      {/* Context: balance + overlaps */}
      <div className="flex flex-col gap-2">
        {balance && (
          <p className="text-sm text-slate-500">
            {employeeName?.split(' ')[0]}’s {request.currentVersion.leaveType}{' '}
            balance:{' '}
            <span className="font-medium text-slate-700">
              {formatDays(getRemainingDays(balance))} remaining
            </span>
          </p>
        )}
        {overlaps.length > 0 && (
          <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            <p className="flex items-center gap-1.5 font-medium">
              <Users className="size-4" />
              {overlaps.length} overlapping team leave
              {overlaps.length > 1 ? 's' : ''}
            </p>
            <ul className="mt-1 list-disc pl-5 text-amber-700">
              {overlaps.map((o) => (
                <li key={o.id}>
                  {nameById.get(o.employeeId)} ·{' '}
                  {formatDateRange(o.currentVersion.dates.map((d) => d.date))}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Decision buttons */}
      {isApprovalStage && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="success"
            icon={<Check className="size-4" />}
            disabled={approve.isPending}
            onClick={() =>
              approve.mutate(request.id, {
                onSuccess: () => done('Request approved'),
              })
            }
          >
            Approve
          </Button>
          <Button
            variant="danger"
            icon={<X className="size-4" />}
            onClick={() => setRejectOpen(true)}
          >
            Reject
          </Button>
        </div>
      )}

      {isCancelStage && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="success"
            icon={<Check className="size-4" />}
            onClick={() =>
              decideCancel.mutate(
                { id: request.id, approve: true },
                { onSuccess: () => done('Cancellation approved, balance restored') },
              )
            }
          >
            Approve cancellation
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              decideCancel.mutate(
                { id: request.id, approve: false },
                { onSuccess: () => done('Cancellation denied') },
              )
            }
          >
            Keep leave (deny)
          </Button>
        </div>
      )}

      {!isApprovalStage && !isCancelStage && (
        <p className="text-sm text-slate-400">
          No action needed — this request is {request.status}.
        </p>
      )}
    </div>
  )

  return (
    <div>
      <Link
        to="/manager/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="size-4" /> Back to approvals
      </Link>

      <LeaveRequestDetail
        request={request}
        audit={audit}
        showEmployee
        actions={actions}
      />

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject request"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!comment.trim()}
              onClick={() =>
                reject.mutate(
                  { id: request.id, comment: comment.trim() },
                  {
                    onSuccess: () => {
                      setRejectOpen(false)
                      setComment('')
                      done('Request rejected')
                    },
                  },
                )
              }
            >
              Reject request
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          Please give a reason — the employee will see this.
        </p>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="e.g. Coverage needed that week — let’s reschedule."
        />
      </Modal>
    </div>
  )
}
