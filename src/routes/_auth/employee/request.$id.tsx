import { useState } from 'react'
import {
  Link,
  createFileRoute,
  useNavigate,
  useParams,
} from '@tanstack/react-router'
import { ArrowLeft, FilePen, RotateCcw, XCircle } from 'lucide-react'
import { useCurrentUser } from '#/hooks/useAuth'
import {
  useAuditTrail,
  useCancelPending,
  useRequestCancellation,
  useRequestDetail,
} from '#/queries/requests'
import { Button } from '#/components/ui/Button'
import { Modal } from '#/components/ui/Modal'
import { Textarea } from '#/components/ui/Field'
import { EmptyState, PageLoader } from '#/components/ui/Feedback'
import { useToast } from '#/components/ui/Toast'
import { LeaveRequestDetail } from '#/components/leave/LeaveRequestDetail'

export const Route = createFileRoute('/_auth/employee/request/$id')({
  component: RequestDetailPage,
})

function RequestDetailPage() {
  const { id } = useParams({ from: '/_auth/employee/request/$id' })
  const user = useCurrentUser()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: request, isPending } = useRequestDetail(id)
  const { data: audit = [] } = useAuditTrail(id)
  const withdraw = useCancelPending()
  const requestCancel = useRequestCancellation()

  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  if (isPending) return <PageLoader />
  if (!request) {
    return <EmptyState title="Request not found" />
  }

  const isOwner = request.employeeId === user.id
  const canEdit =
    isOwner && (request.status === 'pending' || request.status === 'rejected')
  const canWithdraw = isOwner && request.status === 'pending'
  const canRequestCancel = isOwner && request.status === 'approved'

  const actions =
    canEdit || canWithdraw || canRequestCancel ? (
      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <Button
            variant="secondary"
            icon={<FilePen className="size-4" />}
            onClick={() =>
              navigate({ to: `/employee/request/${request.id}/edit` })
            }
          >
            {request.status === 'rejected' ? 'Edit & resubmit' : 'Edit'}
          </Button>
        )}
        {canWithdraw && (
          <Button
            variant="ghost"
            icon={<XCircle className="size-4" />}
            onClick={() => setWithdrawOpen(true)}
          >
            Withdraw
          </Button>
        )}
        {canRequestCancel && (
          <Button
            variant="secondary"
            icon={<RotateCcw className="size-4" />}
            onClick={() => setCancelOpen(true)}
          >
            Request cancellation
          </Button>
        )}
      </div>
    ) : null

  return (
    <div>
      <Link
        to="/employee/history"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="size-4" /> Back to my requests
      </Link>

      <LeaveRequestDetail request={request} audit={audit} actions={actions} />

      {/* Withdraw confirm */}
      <Modal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        title="Withdraw request?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setWithdrawOpen(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                withdraw.mutate(request.id, {
                  onSuccess: () => {
                    toast('Request withdrawn', 'success')
                    setWithdrawOpen(false)
                  },
                })
              }
            >
              Withdraw
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          This will withdraw your pending request. This can’t be undone, but you
          can submit a new one.
        </p>
      </Modal>

      {/* Cancellation request */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Request cancellation"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Back
            </Button>
            <Button
              disabled={!cancelReason.trim()}
              onClick={() =>
                requestCancel.mutate(
                  { id: request.id, reason: cancelReason.trim() },
                  {
                    onSuccess: () => {
                      toast('Cancellation sent for approval', 'success')
                      setCancelOpen(false)
                      setCancelReason('')
                    },
                  },
                )
              }
            >
              Send to manager
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          This leave is already approved. Your manager must approve the
          cancellation before the balance is restored.
        </p>
        <Textarea
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Why do you need to cancel?"
        />
      </Modal>
    </div>
  )
}
