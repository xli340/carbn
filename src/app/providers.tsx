import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { PropsWithChildren } from 'react'

import { env } from '@/config/env'
import { createQueryClient } from '@/lib/query-client'

const queryClient = createQueryClient()

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {env.enableReactQueryDevtools ? (
        <ReactQueryDevtools buttonPosition="bottom-left" initialIsOpen={false} />
      ) : null}
    </QueryClientProvider>
  )
}
