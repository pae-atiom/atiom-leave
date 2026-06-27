import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { CalendarCheck2, Menu, X } from 'lucide-react'
import type { UserRole } from '#/types'
import { cn } from '#/lib/utils'
import { NAV_BY_ROLE } from './nav'
import { NotificationCenter } from '#/components/notifications/NotificationCenter'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'

function NavLinks({ role, onNavigate }: { role: UserRole; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_BY_ROLE[role].map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          activeOptions={{ exact: false }}
          className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          activeProps={{
            className: 'nav-active',
          }}
        >
          <item.icon className="size-4.5 shrink-0" />
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-1">
      <span className="flex size-9 items-center justify-center rounded-lg bg-brand-600 text-white">
        <CalendarCheck2 className="size-5" />
      </span>
      <span className="text-base font-semibold tracking-tight text-slate-900">
        Atiom Leave
      </span>
    </div>
  )
}

export function AppShell({
  role,
  children,
}: {
  role: UserRole
  children: ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-surface lg:flex lg:flex-col">
        <div className="px-3 py-4">
          <Brand />
        </div>
        <div className="px-3 py-2">
          <NavLinks role={role} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="animate-fade-in absolute left-0 top-0 flex h-full w-64 flex-col bg-surface shadow-xl">
            <div className="flex items-center justify-between px-3 py-4">
              <Brand />
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="px-3 py-2">
              <NavLinks role={role} onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-surface/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
            <span className="text-sm font-medium text-slate-400 lg:hidden">
              Atiom Leave
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <NotificationCenter />
            <UserMenu />
          </div>
        </header>

        <main
          className={cn(
            'mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
