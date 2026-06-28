import { QueryClient } from '@tanstack/react-query'

// Data now comes from the API over the network, so a short staleTime avoids
// refetching on every navigation, and a single retry rides out transient blips.
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, gcTime: 5 * 60 * 1000, retry: 1 },
      mutations: { retry: 0 },
    },
  })
}
