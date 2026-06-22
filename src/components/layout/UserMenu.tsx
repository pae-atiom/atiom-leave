import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronsUpDown, LogOut, RefreshCw, UserCog } from 'lucide-react'
import type { User, UserRole } from '#/types'
import { homePathForRole } from '#/lib/auth'
import { cn } from '#/lib/utils'
import { resetStore } from '#/store'
import { clearStoreCache } from '#/store/index'
import { useAuth } from '#/hooks/useAuth'
import { useUsers } from '#/queries/directory'
import { useToast } from '#/components/ui/Toast'

const ROLE_LABEL: Record<UserRole, string> = {
  employee: 'Employee',
  manager: 'Manager',
  hr: 'HR / Admin',
}

/** Combined account menu + dev user switcher + reset-demo action. */
export function UserMenu() {
  const { user, switchUser, logout } = useAuth()
  const { data: users = [] } = useUsers()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { toast } = useToast()

  if (!user) return null

  function pick(next: User) {
    switchUser(next)
    setOpen(false)
    qc.invalidateQueries()
    navigate({ to: homePathForRole(next.role) })
  }

  function handleReset() {
    resetStore()
    clearStoreCache()
    setOpen(false)
    logout()
    qc.clear()
    toast('Demo data reset', 'success')
    navigate({ to: '/login' })
  }

  return (
    <div className="relative">
      <button
        data-testid="user-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-slate-100"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
          {user.avatarInitials}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-tight text-slate-900">
            {user.name}
          </span>
          <span className="block text-xs leading-tight text-slate-500">
            {ROLE_LABEL[user.role]}
          </span>
        </span>
        <ChevronsUpDown className="size-4 text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="animate-fade-in absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2.5">
              <UserCog className="size-4 text-slate-400" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Switch user (demo)
              </span>
            </div>
            <div className="max-h-72 overflow-y-auto scroll-slim py-1">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => pick(u)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50',
                    u.id === user.id && 'bg-brand-50/50',
                  )}
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {u.avatarInitials}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm text-slate-800">
                      {u.name}
                    </span>
                    <span className="block text-xs text-slate-400">
                      {ROLE_LABEL[u.role]}
                    </span>
                  </span>
                  {u.id === user.id && (
                    <span className="text-[11px] font-medium text-brand-600">
                      Active
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-slate-100 p-1">
              <button
                onClick={handleReset}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="size-4 text-slate-400" />
                Reset demo data
              </button>
              <button
                onClick={() => {
                  logout()
                  navigate({ to: '/login' })
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                <LogOut className="size-4 text-slate-400" />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
