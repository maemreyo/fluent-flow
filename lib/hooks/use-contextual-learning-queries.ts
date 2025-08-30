import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../services/query-client'
import {
  contextualLearningAIService,
  type CollocationPattern,
  type LoopContext,
  type UsageExample
} from '../services/contextual-learning-ai-service'
import type { UserVocabularyItem } from '../services/user-vocabulary-service'

// Hook for fetching contextual data (cached examples + collocations from database)
export function useContextualData(vocabularyItem: UserVocabularyItem | null) {
  return useQuery({
    queryKey: vocabularyItem 
      ? queryKeys.contextualLearning.contextualData(vocabularyItem.id, vocabularyItem.text)
      : ['contextual-learning', 'none'],
    queryFn: async () => {
      if (!vocabularyItem) return null
      
      return await contextualLearningAIService.getContextualDataForSRS(
        vocabularyItem,
        undefined,
        {
          generateIfMissing: false, // Don't generate automatically, just load cached data
          maxExamples: 6,
          maxCollocations: 8
        }
      )
    },
    enabled: !!vocabularyItem,
    staleTime: 1000 * 60 * 15, // 15 minutes for cached data
    gcTime: 1000 * 60 * 60, // 1 hour
  })
}

// Hook for generating examples with React Query
export function useGenerateExamples() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ vocabularyItem, maxExamples = 6 }: { 
      vocabularyItem: UserVocabularyItem
      maxExamples?: number 
    }) => {
      return await contextualLearningAIService.generateUsageExamples(vocabularyItem, maxExamples)
    },
    onSuccess: (data, variables) => {
      // Update the cache with the new examples
      const { vocabularyItem } = variables
      const queryKey = queryKeys.contextualLearning.examples(vocabularyItem.id, vocabularyItem.text)
      
      queryClient.setQueryData(queryKey, data)
      
      // Also invalidate the contextual data query to refresh it
      queryClient.invalidateQueries({
        queryKey: queryKeys.contextualLearning.contextualData(vocabularyItem.id, vocabularyItem.text)
      })
    }
  })
}

// Hook for generating collocations with React Query
export function useGenerateCollocations() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ vocabularyItem, maxCollocations = 8 }: { 
      vocabularyItem: UserVocabularyItem
      maxCollocations?: number 
    }) => {
      return await contextualLearningAIService.generateCollocations(vocabularyItem, maxCollocations)
    },
    onSuccess: (data, variables) => {
      // Update the cache with the new collocations
      const { vocabularyItem } = variables
      const queryKey = queryKeys.contextualLearning.collocations(vocabularyItem.id, vocabularyItem.text)
      
      queryClient.setQueryData(queryKey, data)
      
      // Also invalidate the contextual data query to refresh it
      queryClient.invalidateQueries({
        queryKey: queryKeys.contextualLearning.contextualData(vocabularyItem.id, vocabularyItem.text)
      })
    }
  })
}

// Hook for generating contexts with React Query
export function useGenerateContexts() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ vocabularyItem, maxContexts = 5 }: { 
      vocabularyItem: UserVocabularyItem
      maxContexts?: number 
    }) => {
      return await contextualLearningAIService.findSimilarContexts(vocabularyItem, maxContexts)
    },
    onSuccess: (data, variables) => {
      // Update the cache with the new contexts
      const { vocabularyItem } = variables
      const queryKey = queryKeys.contextualLearning.contexts(vocabularyItem.id, vocabularyItem.text)
      
      queryClient.setQueryData(queryKey, data)
    }
  })
}

// Hook for getting cached examples
export function useExamples(vocabularyItem: UserVocabularyItem | null) {
  return useQuery({
    queryKey: vocabularyItem 
      ? queryKeys.contextualLearning.examples(vocabularyItem.id, vocabularyItem.text)
      : ['contextual-learning', 'examples', 'none'],
    queryFn: async (): Promise<UsageExample[]> => {
      // This will be populated by mutations or contextual data query
      return []
    },
    enabled: false, // Only updated via mutations
    staleTime: Infinity, // Examples don't go stale once generated
  })
}

// Hook for getting cached collocations
export function useCollocations(vocabularyItem: UserVocabularyItem | null) {
  return useQuery({
    queryKey: vocabularyItem 
      ? queryKeys.contextualLearning.collocations(vocabularyItem.id, vocabularyItem.text)
      : ['contextual-learning', 'collocations', 'none'],
    queryFn: async (): Promise<CollocationPattern[]> => {
      // This will be populated by mutations or contextual data query
      return []
    },
    enabled: false, // Only updated via mutations
    staleTime: Infinity, // Collocations don't go stale once generated
  })
}

// Hook for getting cached contexts
export function useContexts(vocabularyItem: UserVocabularyItem | null) {
  return useQuery({
    queryKey: vocabularyItem 
      ? queryKeys.contextualLearning.contexts(vocabularyItem.id, vocabularyItem.text)
      : ['contextual-learning', 'contexts', 'none'],
    queryFn: async (): Promise<LoopContext[]> => {
      // This will be populated by mutations
      return []
    },
    enabled: false, // Only updated via mutations
    staleTime: Infinity, // Contexts don't go stale once generated
  })
}