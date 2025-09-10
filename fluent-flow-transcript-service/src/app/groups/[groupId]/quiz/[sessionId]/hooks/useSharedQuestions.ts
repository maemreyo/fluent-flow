'use client'

import { useQuery } from '@tanstack/react-query'
import { getAuthHeaders } from '@/lib/supabase/auth-utils'
import { quizQueryKeys, quizQueryOptions } from '../lib/query-keys'

interface UseSharedQuestionsProps {
  groupId: string
  sessionId: string
  enabled?: boolean
}

export interface SharedQuestionsData {
  shareTokens: Record<string, string>
  generatedCounts: {
    easy: number
    medium: number
    hard: number
  }
  questionsByDifficulty: Record<string, any>
}

/**
 * Shared hook for loading questions across all quiz pages
 * Uses React Query cache to prevent duplicate API calls when navigating between pages
 */
export function useSharedQuestions({
  groupId,
  sessionId,
  enabled = true
}: UseSharedQuestionsProps) {
  const { data, isLoading, error, isFetching, dataUpdatedAt, isStale } = useQuery({
    queryKey: quizQueryKeys.sessionQuestions(groupId, sessionId),
    queryFn: async () => {
      console.log('🔄 [useSharedQuestions] Fetching questions from API for cache')

      const headers = await getAuthHeaders()
      const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/questions`, {
        headers,
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch questions: ${response.status}`)
      }

      const questionsData = await response.json()
      console.log('📦 [useSharedQuestions] Raw API response:', questionsData)

      // Parse the API response structure
      if (questionsData.success && questionsData.data?.questionsByDifficulty) {
        const questionsByDiff = questionsData.data.questionsByDifficulty

        // Convert to shareTokens format
        const shareTokens: Record<string, string> = {}
        const counts = { easy: 0, medium: 0, hard: 0 }

        Object.keys(questionsByDiff).forEach(difficulty => {
          const diffData = questionsByDiff[difficulty]
          if (diffData.shareToken) {
            shareTokens[difficulty] = diffData.shareToken
            if (difficulty in counts) {
              counts[difficulty as keyof typeof counts] = diffData.count || 1
            }
          }
        })

        const result = {
          shareTokens,
          generatedCounts: counts,
          questionsByDifficulty: questionsByDiff
        }

        console.log('✅ [useSharedQuestions] Parsed and cached:', result)
        return result
      }

      // Return empty state if no questions found
      console.log('⚠️ [useSharedQuestions] No questions found in API response:', questionsData)
      return {
        shareTokens: {},
        generatedCounts: { easy: 0, medium: 0, hard: 0 },
        questionsByDifficulty: {}
      }
    },
    enabled: !!groupId && !!sessionId && enabled,
    ...quizQueryOptions.questions, // Use optimized cache settings
    // Override to ensure cross-page caching
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false // CRITICAL: Don't refetch if cache exists
  })

  // Debug cache status for active/preview pages
  if (typeof window !== 'undefined' && (window.location.pathname.includes('/active') || window.location.pathname.includes('/preview'))) {
    console.log('🔍 [useSharedQuestions] Cache status:', {
      hasData: !!data,
      shareTokensCount: data ? Object.keys(data.shareTokens).length : 0,
      isLoading,
      isFetching,
      error: error?.message,
      isStale,
      dataAge: dataUpdatedAt ? `${Math.floor((Date.now() - dataUpdatedAt) / 1000)}s ago` : 'never',
      cacheKey: quizQueryKeys.sessionQuestions(groupId, sessionId)
    })
  }

  return {
    // Data
    shareTokens: data?.shareTokens || {},
    generatedCounts: data?.generatedCounts || { easy: 0, medium: 0, hard: 0 },
    questionsByDifficulty: data?.questionsByDifficulty || {},

    // States
    isLoading,
    error,
    isFetching,
    isStale,
    dataUpdatedAt,

    // Computed
    hasQuestions: data ? Object.keys(data.shareTokens).length > 0 : false,
    totalGenerated: data
      ? data.generatedCounts.easy + data.generatedCounts.medium + data.generatedCounts.hard
      : 0
  }
}
