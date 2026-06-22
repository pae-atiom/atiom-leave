import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from '#/store/notifications'
import { queryKeys } from './keys'

export const useNotifications = (userId: string) =>
  useQuery({
    queryKey: queryKeys.notifications(userId),
    queryFn: () => getNotificationsForUser(userId),
  })

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => markAllNotificationsRead(userId),
    onSuccess: () => qc.invalidateQueries(),
  })
}
