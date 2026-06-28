import { useEffect } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { hasSession, homePathForRole } from '#/lib/auth'
import { useAuth } from '#/hooks/useAuth'
import { PageLoader } from '#/components/ui/Feedback'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    if (!(await hasSession())) throw redirect({ to: '/login' })
  },
  component: IndexRedirect,
})

function IndexRedirect() {
  const { role, status } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (status === 'authed' && role) {
      navigate({ to: homePathForRole(role) })
    } else if (status === 'anon') {
      navigate({ to: '/login' })
    }
  }, [status, role, navigate])

  return <PageLoader />
}
