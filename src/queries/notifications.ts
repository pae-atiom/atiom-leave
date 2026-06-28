import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '#/lib/api'
import { queryKeys } from './keys'

export const useNotifications = (userId: string) =>
  useQuery({
    queryKey: queryKeys.notifications(userId),
    queryFn: () => api.notifications.list(userId),
    enabled: !!userId,
  })

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    // userId arg kept for call-site compatibility; the server uses the caller.
    mutationFn: (_userId: string) => api.notifications.markAllRead(),
    onSuccess: () => qc.invalidateQueries(),
  })
}
