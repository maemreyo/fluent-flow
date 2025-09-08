'use client'

import { useCallback } from 'react'
import { useQueries } from '@tanstack/react-query'
import { quizQueryKeys, quizQueryOptions } from '../lib/query-keys'
import type { DifficultyGroup } from '../../../../../../components/questions/ProgressIndicator'

interface UseCachedQuestionsLoaderProps {
  groupId: string
  sessionId: string
}

export function useCachedQuestionsLoader({ groupId, sessionId }: UseCachedQuestionsLoaderProps) {
  
  // Cached version of loadQuestionsFromShareTokens that uses React Query
  const loadQuestionsFromShareTokens = useCallback(async (shareTokens: Record<string, string>) => {
    const availableTokens = Object.entries(shareTokens).filter(([_, token]) => token)
    if (availableTokens.length === 0) {
      throw new Error('No questions available')
    }

    console.log('🔄 [useCachedQuestionsLoader] Loading questions with caching:', shareTokens)

    // Use React Query to fetch all tokens in parallel with caching
    const results = await Promise.all(
      availableTokens.map(async ([difficulty, shareToken]) => {
        // Check if data is already in cache
        const queryClient = (await import('@tanstack/react-query')).useQueryClient
        const existingData = queryClient().getQueryData(quizQueryKeys.questionSet(shareToken))
        
        if (existingData) {
          console.log(`✅ [useCachedQuestionsLoader] Using cached ${difficulty} questions`)
          return existingData
        }

        // If not in cache, fetch it
        console.log(`🔄 [useCachedQuestionsLoader] Fetching ${difficulty} questions from API`)
        const response = await fetch(`/api/questions/${shareToken}?groupId=${groupId}&sessionId=${sessionId}`)
        
        if (!response.ok) {
          throw new Error(`Failed to load ${difficulty} questions`)
        }
        
        const questionData = await response.json()
        const result = {
          difficulty,
          questions: questionData.questions || [],
          shareToken,
          questionSet: questionData
        }

        // Cache the result manually
        queryClient().setQueryData(quizQueryKeys.questionSet(shareToken), result, {
          updatedAt: Date.now(),
        })

        return result
      })
    )

    // Format as DifficultyGroups
    const formattedGroups: DifficultyGroup[] = results.map((loadedQuestion: any) => ({
      difficulty: loadedQuestion.difficulty as 'easy' | 'medium' | 'hard',
      questions: loadedQuestion.questions,
      shareToken: loadedQuestion.shareToken,
      questionsData: loadedQuestion.questions,
      questionSet: { questions: loadedQuestion.questions },
      completed: false
    }))
    
    console.log('✅ [useCachedQuestionsLoader] Loaded and cached questions:', formattedGroups.map(g => `${g.difficulty}: ${g.questions.length}`))
    return results
  }, [groupId, sessionId])

  return {
    loadQuestionsFromShareTokens
  }
}