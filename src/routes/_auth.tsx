import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { getAuth } from '#/lib/auth'
import { useAuth } from '#/hooks/useAuth'
import { AppShell } from '#/components/layout/AppShell'
import { PageLoader } from '#/components/ui/Feedback'

export const Route = createFileRoute('/_auth')({
  beforeLoad: () => {
    // Runs client-side (SPA mode). No session → bounce to login.
    if (!getAuth()) throw redirect({ to: '/login' })
  },
  component: AuthLayout,
})

function AuthLayout() {
  const { user, role } = useAuth()
  if (!user || !role) return <PageLoader />
  return (
    <AppShell role={role}>
      <Outlet />
    </AppShell>
  )
}
