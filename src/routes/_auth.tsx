import { useEffect } from 'react'
import {
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { hasSession } from '#/lib/auth'
import { useAuth } from '#/hooks/useAuth'
import { AppShell } from '#/components/layout/AppShell'
import { PageLoader } from '#/components/ui/Feedback'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    // Runs client-side (SPA mode). No session → bounce to login.
    if (!(await hasSession())) throw redirect({ to: '/login' })
  },
  component: AuthLayout,
})

function AuthLayout() {
  const { user, role, status } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Session was present at beforeLoad but /me failed (invalid/expired) — leave.
    if (status === 'anon') navigate({ to: '/login' })
  }, [status, navigate])

  if (status !== 'authed' || !user || !role) return <PageLoader />
  return (
    <AppShell role={role}>
      <Outlet />
    </AppShell>
  )
}
