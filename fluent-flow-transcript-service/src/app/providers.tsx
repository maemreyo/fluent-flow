'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { useState } from 'react'
import { AuthProvider } from '../contexts/AuthContext'

// Create persister for quiz questions cache
const createPersister = () => {
  if (typeof window === 'undefined') return undefined
  
  return createSyncStoragePersister({
    storage: window.sessionStorage, // Use sessionStorage for tab-specific caching
    key: 'fluent-flow-quiz-cache',
    serialize: JSON.stringify,
    deserialize: JSON.parse,
    // Only persist quiz-related queries to avoid bloating storage
    filter: (query) => {
      const queryKey = query.queryKey as string[]
      return queryKey.includes('quiz') || queryKey.includes('questions') || queryKey.includes('session')
    }
  })
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Optimized for cross-page caching with persistence
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false, // Don't refetch on mount if cache exists
        staleTime: 15 * 60 * 1000, // 15 minutes - longer for persistent cache
        gcTime: 60 * 60 * 1000, // 1 hour - longer garbage collection for persistence
        retry: 2, // Reduce retries for better performance
      },
    },
  }))

  const [persister] = useState(createPersister)

  // Use PersistQueryClientProvider for automatic cache persistence
  if (persister) {
    return (
      <PersistQueryClientProvider 
        client={queryClient} 
        persistOptions={{ 
          persister,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours max cache age
          buster: process.env.NODE_ENV, // Clear cache on env change
          hydrateOptions: {
            // Don't restore queries that are too old
            defaultOptions: {
              queries: {
                staleTime: 15 * 60 * 1000
              }
            }
          }
        }}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </PersistQueryClientProvider>
    )
  }

  // Fallback for SSR or when localStorage is not available
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  )
}
