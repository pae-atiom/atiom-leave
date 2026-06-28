import {
  createFileRoute,
  useNavigate,
  useParams,
} from '@tanstack/react-router'
import { useCurrentUser } from '#/hooks/useAuth'
import { useEditRequest, useRequestDetail } from '#/queries/requests'
import { useToast } from '#/components/ui/Toast'
import { EmptyState, PageHeader, PageLoader } from '#/components/ui/Feedback'
import { LeaveRequestForm } from '#/components/leave/LeaveRequestForm'

export const Route = createFileRoute('/_auth/employee/request/$id/edit')({
  component: EditRequest,
})

function EditRequest() {
  const { id } = useParams({ from: '/_auth/employee/request/$id/edit' })
  const user = useCurrentUser()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: request, isPending } = useRequestDetail(id)
  const edit = useEditRequest()

  if (isPending) return <PageLoader />
  if (!request || request.employeeId !== user.id) {
    return <EmptyState title="Request not found" />
  }

  const v = request.currentVersion

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Edit request"
        description="Your changes will be resubmitted to your manager for approval."
      />
      <LeaveRequestForm
        user={user}
        submitLabel="Resubmit request"
        submitting={edit.isPending}
        initial={{
          leaveType: v.leaveType,
          dates: v.dates,
          reason: v.reason,
          attachments: v.attachments,
        }}
        onSubmit={(input) =>
          edit.mutate(
            { id: request.id, input },
            {
              onSuccess: () => {
                toast('Request updated and resubmitted', 'success')
                navigate({ to: `/employee/request/${request.id}` })
              },
              onError: () => toast('Could not update request', 'error'),
            },
          )
        }
      />
    </div>
  )
}
