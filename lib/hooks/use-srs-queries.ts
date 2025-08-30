import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../services/query-client'
import { srsService, type ReviewSession, type SRSRating } from '../services/srs-service'
import { userVocabularyService } from '../services/user-vocabulary-service'

// SRS-specific query keys
const srsQueryKeys = {
  dueCards: ['srs', 'due-cards'] as const,
  stats: ['srs', 'stats'] as const,
  session: ['srs', 'session'] as const,
  activityData: (days: number) => ['srs', 'activity', days] as const,
} as const

/**
 * Hook for fetching cards due for review
 * Reduces multiple API calls by caching results
 */
export function useDueCards() {
  return useQuery({
    queryKey: srsQueryKeys.dueCards,
    queryFn: () => userVocabularyService.getItemsDueForReview(),
    staleTime: 1000 * 60 * 2, // 2 minutes - due cards change relatively frequently
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: true, // Useful to refetch due cards when user returns
  })
}

/**
 * Hook for fetching SRS statistics
 */
export function useSRSStats() {
  return useQuery({
    queryKey: srsQueryKeys.stats,
    queryFn: () => srsService.getStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  })
}

/**
 * Hook for fetching SRS activity data
 */
export function useSRSActivityData(days: number) {
  return useQuery({
    queryKey: srsQueryKeys.activityData(days),
    queryFn: () => srsService.getActivityData(days),
    staleTime: 1000 * 60 * 15, // 15 minutes - activity data changes slowly
    gcTime: 1000 * 60 * 60, // 1 hour
  })
}

/**
 * Hook for fetching current SRS session
 */
export function useSRSSession(maxCards: number = 20) {
  return useQuery({
    queryKey: [...srsQueryKeys.session, maxCards],
    queryFn: () => srsService.resumeOrStartSession(maxCards),
    staleTime: 0, // Don't cache active sessions - they change frequently
    gcTime: 1000 * 60 * 5, // 5 minutes
    enabled: false, // Only fetch when explicitly requested
  })
}

/**
 * Mutation for starting a new SRS session
 */
export function useStartSRSSession() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (maxCards: number = 20) => srsService.resumeOrStartSession(maxCards),
    onSuccess: (session) => {
      // Cache the new session
      queryClient.setQueryData([...srsQueryKeys.session, 20], session)
      
      // Invalidate due cards since they might have changed
      queryClient.invalidateQueries({ queryKey: srsQueryKeys.dueCards })
    }
  })
}

/**
 * Mutation for processing a card rating
 */
export function useProcessCard() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ sessionId, cardId, rating }: { 
      sessionId: string
      cardId: string 
      rating: SRSRating 
    }) => srsService.processCard(sessionId, cardId, rating),
    onSuccess: (updatedSession) => {
      // Update the cached session
      queryClient.setQueryData([...srsQueryKeys.session, 20], updatedSession)
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: srsQueryKeys.dueCards })
      queryClient.invalidateQueries({ queryKey: srsQueryKeys.stats })
      queryClient.invalidateQueries({ queryKey: queryKeys.vocabulary.deck() })
    }
  })
}

/**
 * Mutation for completing an SRS session
 */
export function useCompleteSRSSession() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (sessionId: string) => srsService.completeSession(sessionId),
    onSuccess: () => {
      // Clear the session cache
      queryClient.removeQueries({ queryKey: srsQueryKeys.session })
      
      // Invalidate all SRS-related data
      queryClient.invalidateQueries({ queryKey: srsQueryKeys.dueCards })
      queryClient.invalidateQueries({ queryKey: srsQueryKeys.stats })
      queryClient.invalidateQueries({ queryKey: queryKeys.vocabulary.deck() })
    }
  })
}

/**
 * Combined hook for SRS dashboard data
 * Fetches all necessary data in parallel to avoid sequential API calls
 */
export function useSRSDashboardData() {
  const statsQuery = useSRSStats()
  const activityQuery = useSRSActivityData(365) // 1 year of activity data
  const dueCardsQuery = useDueCards()
  
  const refetch = async () => {
    await Promise.all([
      statsQuery.refetch(),
      activityQuery.refetch(),
      dueCardsQuery.refetch()
    ])
  }
  
  return {
    stats: statsQuery.data,
    activityData: activityQuery.data,
    dueCards: dueCardsQuery.data,
    isLoading: statsQuery.isLoading || activityQuery.isLoading || dueCardsQuery.isLoading,
    isError: statsQuery.isError || activityQuery.isError || dueCardsQuery.isError,
    error: statsQuery.error || activityQuery.error || dueCardsQuery.error,
    refetch,
  }
}