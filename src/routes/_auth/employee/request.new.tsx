import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCurrentUser } from '#/hooks/useAuth'
import { useCreateRequest } from '#/queries/requests'
import { useToast } from '#/components/ui/Toast'
import { PageHeader } from '#/components/ui/Feedback'
import { LeaveRequestForm } from '#/components/leave/LeaveRequestForm'

export const Route = createFileRoute('/_auth/employee/request/new')({
  component: NewRequest,
})

function NewRequest() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const { toast } = useToast()
  const create = useCreateRequest()

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Request leave"
        description="Pick your dates, set the duration, and review before submitting."
      />
      <LeaveRequestForm
        user={user}
        submitting={create.isPending}
        onSubmit={(input) =>
          create.mutate(
            { employee: user, input },
            {
              onSuccess: (req) => {
                toast('Leave request submitted', 'success')
                navigate({ to: `/employee/request/${req.id}` })
              },
              onError: () => toast('Could not submit request', 'error'),
            },
          )
        }
      />
    </div>
  )
}
