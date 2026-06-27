import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Bell, CheckCheck } from 'lucide-react'
import type { Notification } from '#/types'
import { cn, formatDateTime } from '#/lib/utils'
import { NOTIFICATION_TITLE } from '#/lib/labels'
import { useAuth } from '#/hooks/useAuth'
import {
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
} from '#/queries/notifications'
import { EmptyState } from '#/components/ui/Feedback'

export function NotificationCenter() {
  const { user, role } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { data: notifications = [] } = useNotifications(user?.id ?? '')
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllRead()

  const unread = notifications.filter((n) => !n.isRead).length

  function detailPathFor(n: Notification): string | null {
    if (!n.requestId || !role) return null
    if (role === 'employee') return `/employee/request/${n.requestId}`
    if (role === 'manager') return `/manager/approve/${n.requestId}`
    return null
  }

  function handleClick(n: Notification) {
    if (!n.isRead) markRead.mutate(n.id)
    const path = detailPathFor(n)
    setOpen(false)
    if (path) navigate({ to: path })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        aria-label="Notifications"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="animate-fade-in absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl bg-surface shadow-xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-sm font-semibold text-slate-900">
                Notifications
              </span>
              {unread > 0 && user && (
                <button
                  onClick={() => markAll.mutate(user.id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  <CheckCheck className="size-3.5" /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto scroll-slim">
              {notifications.length === 0 ? (
                <div className="p-4">
                  <EmptyState title="No notifications yet" />
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={cn(
                      'flex w-full flex-col gap-0.5 border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50',
                      !n.isRead && 'bg-brand-50/40',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-700">
                        {NOTIFICATION_TITLE[n.type]}
                      </span>
                      {!n.isRead && (
                        <span className="size-2 shrink-0 rounded-full bg-brand-500" />
                      )}
                    </div>
                    <span className="text-sm text-slate-600">{n.message}</span>
                    <span className="text-[11px] text-slate-400">
                      {formatDateTime(n.createdAt)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
