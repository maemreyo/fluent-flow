import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../services/query-client'
import { userVocabularyService } from '../services/user-vocabulary-service'

// Hook for fetching vocabulary deck
export function useVocabularyDeck(limit?: number) {
  return useQuery({
    queryKey: queryKeys.vocabulary.deck(limit),
    queryFn: () => userVocabularyService.getUserVocabularyDeck({ limit: limit || 100 }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  })
}