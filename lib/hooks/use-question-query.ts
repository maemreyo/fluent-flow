import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../services/query-client'
import { supabaseService } from '../stores/fluent-flow-supabase-store'
import type { ConversationQuestions, ConversationQuestion } from '../types/fluent-flow-types'

export interface QuestionData {
  id: string
  type: string
  question: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  metadata?: Record<string, any>
}

export function useQuestionsQuery(loopId: string) {
  return useQuery({
    queryKey: queryKeys.questions.bySegment(loopId),
    queryFn: async (): Promise<ConversationQuestion[] | null> => {
      console.log(`useQuestionsQuery: Fetching questions for loop ${loopId}`)
      
      // Since we now store questions in loop metadata, get them from there
      const questionsData = await supabaseService.getQuestions(loopId)
      if (questionsData && Array.isArray(questionsData)) {
        return questionsData
      }
      return null
    },
    enabled: Boolean(loopId),
    staleTime: 1000 * 60 * 30, // 30 minutes - questions can be cached longer
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
    retry: (failureCount, error) => {
      // Don't retry for configuration errors
      if (error instanceof Error && error.message.includes('API not configured')) {
        return false
      }
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    throwOnError: false // Let components handle errors gracefully
  })
}

export function useQuestionsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      segmentId,
      questions,
      metadata
    }: {
      segmentId: string
      questions: QuestionData[]
      metadata?: any
    }) => {
      console.log(`useQuestionsMutation: Saving ${questions.length} questions for segment ${segmentId}`)
      return supabaseService.saveQuestions(segmentId, questions, metadata)
    },
    onSuccess: (data, variables) => {
      // Update the query cache with the new data
      queryClient.setQueryData(
        queryKeys.questions.bySegment(variables.segmentId),
        variables.questions
      )

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.questions.all })
      
      console.log(`useQuestionsMutation: Successfully saved questions with ID: ${data}`)
    },
    onError: (error: any) => {
      console.error('Questions mutation failed:', error)
    }
  })
}

export function useUserQuestionsQuery(userId: string) {
  return useQuery({
    queryKey: queryKeys.questions.byUser(userId),
    queryFn: async (): Promise<QuestionData[]> => {
      // This would need to be implemented in supabaseService
      // For now, return empty array
      console.log(`useUserQuestionsQuery: Fetching all questions for user ${userId}`)
      return []
    },
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 2
  })
}

/**
 * Hook for generating questions using ConversationLoopIntegrationService
 * This provides the full question generation flow with caching
 */
export function useGenerateQuestionsQuery(
  loopId: string, 
  integrationService: any, // ConversationLoopIntegrationService
  enabled: boolean = false
) {
  return useQuery({
    queryKey: queryKeys.questions.generate(loopId),
    queryFn: async (): Promise<ConversationQuestions> => {
      console.log(`useGenerateQuestionsQuery: Generating questions for loop ${loopId}`)
      
      if (!integrationService) {
        throw new Error('ConversationLoopIntegrationService not provided')
      }
      
      return await integrationService.getQuestionsWithCaching(loopId)
    },
    enabled: Boolean(loopId) && enabled && Boolean(integrationService),
    staleTime: 1000 * 60 * 60, // 1 hour - generated questions are valuable
    gcTime: 1000 * 60 * 60 * 4, // 4 hours 
    retry: 1 // Only retry once for question generation
  })
}

/**
 * Hook for generating questions using mutation (user-triggered)
 */
export function useGenerateQuestionsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      loopId,
      integrationService
    }: {
      loopId: string
      integrationService: any // ConversationLoopIntegrationService
    }) => {
      console.log(`useGenerateQuestionsMutation: Generating questions for loop ${loopId}`)
      
      if (!integrationService) {
        throw new Error('ConversationLoopIntegrationService not provided')
      }

      return await integrationService.getQuestionsWithCaching(loopId)
    },
    onSuccess: (data, variables) => {
      console.log(`useGenerateQuestionsMutation: Successfully generated ${data.questions.length} questions`)
      
      // Update the questions cache immediately
      queryClient.setQueryData(
        queryKeys.questions.bySegment(variables.loopId),
        data.questions
      )

      // Update the generate questions cache
      queryClient.setQueryData(
        queryKeys.questions.generate(variables.loopId),
        data
      )

      // Invalidate related queries to trigger refresh
      queryClient.invalidateQueries({ queryKey: queryKeys.questions.all })
    },
    onError: (error: any, variables) => {
      console.error(`Questions generation failed for loop ${variables.loopId}:`, error)
      
      // Enhanced error logging with context
      if (error?.message?.includes('API not configured')) {
        console.warn('Questions generation failed: API not configured. Please check your environment variables.')
      } else if (error?.message?.includes('ConversationLoopIntegrationService not provided')) {
        console.error('Questions generation failed: Integration service dependency missing.')
      } else if (error?.message?.includes('transcript')) {
        console.warn('Questions generation failed: Transcript-related error. Trying audio fallback might help.')
      }
      
      // Could implement user notification or analytics here
    },
    retry: (failureCount, error) => {
      // Don't retry for configuration or dependency errors
      if (error && typeof error === 'object') {
        const errorMessage = error.message || String(error)
        if (errorMessage.includes('API not configured') ||
            errorMessage.includes('ConversationLoopIntegrationService not provided') ||
            errorMessage.includes('Invalid loop ID')) {
          return false
        }
      }
      return failureCount < 1 // Only retry once for question generation
    },
    retryDelay: 2000 // Wait 2 seconds before retry
  })
}
