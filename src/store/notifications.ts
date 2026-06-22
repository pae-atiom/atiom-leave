import type { AppStore, Notification, NotificationType } from '#/types'
import { generateId, nowIso } from '#/lib/utils'
import { getStore, mutateStore } from './index'

export function getNotificationsForUser(userId: string): Notification[] {
  return getStore()
    .notifications.filter((n) => n.recipientId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getUnreadCount(userId: string): number {
  return getStore().notifications.filter(
    (n) => n.recipientId === userId && !n.isRead,
  ).length
}

/** Append a notification to an already-held store (used inside other mutations). */
export function pushNotification(
  store: AppStore,
  params: {
    recipientId: string
    type: NotificationType
    requestId: string | null
    message: string
  },
): void {
  store.notifications.push({
    id: generateId('notif'),
    recipientId: params.recipientId,
    type: params.type,
    requestId: params.requestId,
    message: params.message,
    isRead: false,
    createdAt: nowIso(),
  })
}

export function markNotificationRead(id: string): void {
  mutateStore((store) => {
    const n = store.notifications.find((x) => x.id === id)
    if (n) n.isRead = true
  })
}

export function markAllNotificationsRead(userId: string): void {
  mutateStore((store) => {
    for (const n of store.notifications) {
      if (n.recipientId === userId) n.isRead = true
    }
  })
}
