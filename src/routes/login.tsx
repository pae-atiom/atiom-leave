import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { CalendarCheck2, ChevronRight } from 'lucide-react'
import type { User, UserRole } from '#/types'
import { homePathForRole } from '#/lib/auth'
import { useAuth } from '#/hooks/useAuth'
import { useUsers } from '#/queries/directory'
import { Spinner } from '#/components/ui/Feedback'
import { ThemeToggle } from '#/components/layout/ThemeToggle'

export const Route = createFileRoute('/login')({ component: LoginPage })

const ROLE_LABEL: Record<UserRole, string> = {
  employee: 'Employee',
  manager: 'Manager',
  hr: 'HR / Admin',
}

const ROLE_ORDER: UserRole[] = ['employee', 'manager', 'hr']

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { data: users, isPending } = useUsers()

  function signIn(user: User) {
    login(user)
    navigate({ to: homePathForRole(user.role) })
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-canvas via-canvas to-slate-100 px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            <CalendarCheck2 className="size-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Atiom Leave
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Demo sign-in — pick a user to explore their role.
          </p>
        </div>

        <div className="rounded-2xl bg-surface p-2 shadow-sm ring-1 ring-slate-200">
          {isPending ? (
            <div className="flex h-32 items-center justify-center">
              <Spinner className="size-5" />
            </div>
          ) : (
            ROLE_ORDER.map((role) => {
              const roleUsers = (users ?? []).filter((u) => u.role === role)
              if (roleUsers.length === 0) return null
              return (
                <div key={role} className="px-2 py-2">
                  <p className="px-2 pb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {ROLE_LABEL[role]}
                  </p>
                  <div className="flex flex-col gap-1">
                    {roleUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => signIn(user)}
                        className="group flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50"
                      >
                        <span className="flex size-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                          {user.avatarInitials}
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-medium text-slate-900">
                            {user.name}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {user.email}
                          </span>
                        </span>
                        <ChevronRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          No passwords — this is a mocked POC. You can switch users anytime from
          the top bar.
        </p>
      </div>
    </div>
  )
}
