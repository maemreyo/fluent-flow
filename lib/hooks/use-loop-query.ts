import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../services/query-client'
import { useFluentFlowSupabaseStore } from '../stores/fluent-flow-supabase-store'
import type { SavedLoop } from '../types/fluent-flow-types'

export function useLoopsQuery() {
  const { getAllUserLoops } = useFluentFlowSupabaseStore()

  return useQuery({
    queryKey: queryKeys.loops.all,
    queryFn: async (): Promise<SavedLoop[]> => {
      console.log('useLoopsQuery: Fetching user loops')
      const loops = await getAllUserLoops()
      return loops || []
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - loops can change frequently
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('User not authenticated')) {
        return false
      }
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    throwOnError: false // Let components handle errors gracefully
  })
}

export function useLoopQuery(loopId: string) {
  const { getAllUserLoops } = useFluentFlowSupabaseStore()

  return useQuery({
    queryKey: queryKeys.loops.byId(loopId),
    queryFn: async (): Promise<SavedLoop | null> => {
      console.log(`useLoopQuery: Fetching loop ${loopId}`)
      const loops = await getAllUserLoops()
      const loop = loops?.find(l => l.id === loopId)
      return loop || null
    },
    enabled: Boolean(loopId),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 2
  })
}

/**
 * Hook to invalidate loops queries - useful after mutations
 */
export function useInvalidateLoops() {
  const queryClient = useQueryClient()
  
  return () => {
    console.log('useInvalidateLoops: Invalidating loops queries')
    queryClient.invalidateQueries({ queryKey: queryKeys.loops.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.loops.byId })
  }
}