import { QueryClient } from '@tanstack/react-query'

// The data source is in-memory (localStorage-backed), so there is no network
// cost — staleTime 0 means every navigation reflects the latest store state.
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 0, gcTime: 5 * 60 * 1000, retry: 0 },
      mutations: { retry: 0 },
    },
  })
}
