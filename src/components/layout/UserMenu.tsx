import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronsUpDown, LogOut } from 'lucide-react'
import type { UserRole } from '#/types'
import { useAuth } from '#/hooks/useAuth'

const ROLE_LABEL: Record<UserRole, string> = {
  employee: 'Employee',
  manager: 'Manager',
  hr: 'HR / Admin',
}

/** Account menu: shows the signed-in user and signs them out via the auth provider. */
export function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  if (!user) return null

  async function handleSignOut() {
    setOpen(false)
    await signOut()
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
          <div className="animate-fade-in absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl bg-surface shadow-xl ring-1 ring-slate-200">
            <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
              <p className="text-sm font-medium text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
            <div className="p-1">
              <button
                onClick={handleSignOut}
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
