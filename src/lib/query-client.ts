import { QueryCache, QueryClient } from '@tanstack/react-query'

import { UnauthorizedError } from './api-client'
import { useAuthStore } from '@/features/auth/store/auth-store'

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof UnauthorizedError) {
          useAuthStore.getState().signOut()
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  })
}
