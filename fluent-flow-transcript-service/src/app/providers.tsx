'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { AuthProvider } from '../contexts/AuthContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Optimized for cross-page caching
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false, // Don't refetch on mount if cache exists
        staleTime: 5 * 60 * 1000, // 5 minutes default
        gcTime: 30 * 60 * 1000, // 30 minutes - keep cache longer for page navigation
        retry: 2, // Reduce retries for better performance
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  )
}
