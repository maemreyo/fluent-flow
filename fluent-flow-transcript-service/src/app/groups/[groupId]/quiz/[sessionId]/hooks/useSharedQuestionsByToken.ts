'use client'

import { useQuery } from '@tanstack/react-query'
import { quizQueryKeys, quizQueryOptions } from '../lib/query-keys'

interface UseSharedQuestionsByTokenProps {
  shareToken: string
  difficulty: string
  groupId: string
  sessionId: string
  enabled?: boolean
}

/**
 * Cached hook for individual question token API calls
 * Prevents duplicate calls to /api/questions/[token] across pages
 */
export function useSharedQuestionsByToken({ 
  shareToken, 
  difficulty, 
  groupId, 
  sessionId, 
  enabled = true 
}: UseSharedQuestionsByTokenProps) {
  
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: quizQueryKeys.questionSet(shareToken),
    queryFn: async () => {
      console.log(`🔄 [useSharedQuestionsByToken] Fetching ${difficulty} questions from token: ${shareToken}`)
      
      const response = await fetch(`/api/questions/${shareToken}?groupId=${groupId}&sessionId=${sessionId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load ${difficulty} questions`)
      }
      
      const questionData = await response.json()
      console.log(`✅ [useSharedQuestionsByToken] Cached ${difficulty} questions:`, questionData.questions?.length || 0)
      
      return {
        difficulty,
        questions: questionData.questions || [],
        shareToken,
        questionSet: questionData
      }
    },
    enabled: !!shareToken && enabled,
    ...quizQueryOptions.questions, // Use long cache duration
    staleTime: 30 * 60 * 1000, // 30 minutes - questions don't change often
    refetchOnMount: false, // CRITICAL: Don't refetch if cache exists
  })

  return {
    data,
    isLoading,
    error,
    isFetching
  }
}