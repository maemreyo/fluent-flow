'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ProgressData } from '../components/groups/progress/ParticipantProgressCard'
import {
  checkExistingResults as checkExistingResultsService,
  createProgressSubscription,
  fetchProgressEvents,
  fetchSessionParticipants,
  fetchSessionProgress,
  logProgressEvent,
  resetUserProgress,
  updateUserProgress,
  type ProgressUpdatePayload
} from '../lib/services/progress-tracking-service'
import { supabase } from '../lib/supabase/client'

interface UseProgressTrackingProps {
  sessionId: string
  enabled?: boolean
  totalQuestions?: number // Pass actual total questions from quiz session
}

export function useProgressTracking({
  sessionId,
  enabled = true,
  totalQuestions
}: UseProgressTrackingProps) {
  const queryClient = useQueryClient()
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingUpdateRef = useRef<ProgressUpdatePayload | null>(null)

  // Fetch participants data using React Query
  const {
    data: participants = [],
    isLoading: participantsLoading,
    error: participantsError
  } = useQuery({
    queryKey: ['session-participants', sessionId],
    queryFn: () => fetchSessionParticipants(sessionId),
    enabled: enabled && !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes - participants don't change often
    refetchInterval: false, // Disable auto-refetch, rely on real-time subscriptions
    refetchOnWindowFocus: false // Don't refetch on window focus
  })

  // Fetch progress data using React Query
  const {
    data: progressRecords = [],
    isLoading: progressLoading,
    error: progressError
  } = useQuery({
    queryKey: ['session-progress', sessionId],
    queryFn: () => fetchSessionProgress(sessionId),
    enabled: enabled && !!sessionId,
    staleTime: 2 * 60 * 1000, // 2 minutes - only refetch if very stale
    refetchInterval: false, // Disable auto-refetch, rely on real-time subscriptions
    refetchOnWindowFocus: false // Don't refetch on window focus
  })

  // Transform data to ProgressData format
  const enrichedParticipants: ProgressData[] = participants.map(participant => {
    const progress = progressRecords.find(p => p.user_id === participant.user_id)

    // Create mock difficulty distribution for now
    const difficultyDistribution = {
      easy: { answered: 0, correct: 0, total: 0 },
      medium: { answered: 0, correct: 0, total: 0 },
      hard: { answered: 0, correct: 0, total: 0 }
    }

    // Calculate completion percentage based on progress
    const currentQuestion = progress?.current_question || 0
    const totalAnswered = progress?.total_answered || 0
    // Use actual totalQuestions from quiz session, fallback only if not provided
    const actualTotalQuestions = totalQuestions || Math.max(currentQuestion, totalAnswered, 10)
    const completionPercentage =
      actualTotalQuestions > 0 ? Math.round((totalAnswered / actualTotalQuestions) * 100) : 0

    return {
      user_id: participant.user_id,
      user_email: participant.user_email,
      username: participant.username,
      current_question_index: currentQuestion,
      total_questions: actualTotalQuestions,
      correct_answers: progress?.correct_answers || 0,
      time_spent_seconds: progress?.time_spent || 0,
      last_activity: progress?.last_activity || participant.joined_at || new Date().toISOString(),
      completion_percentage: completionPercentage,
      confidence_level: progress?.confidence_level || null,
      difficulty_distribution: difficultyDistribution,
      is_online: participant.is_online,
      status: progress?.completed ? 'completed' : totalAnswered > 0 ? 'in_progress' : 'not_started'
    }
  })

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: (progressUpdate: ProgressUpdatePayload) =>
      updateUserProgress(sessionId, progressUpdate),
    onSuccess: (data, variables) => {
      // Only invalidate for significant updates (answers, completion)
      // Real-time subscriptions will handle most updates
      if (variables.answer || variables.completed) {
        queryClient.invalidateQueries({ queryKey: ['session-progress', sessionId] })
      }
    },
    onError: error => {
      console.error('Error updating progress:', error)
    }
  })

  // Reset progress mutation
  const resetProgressMutation = useMutation({
    mutationFn: () => resetUserProgress(sessionId),
    onSuccess: () => {
      // Invalidate queries after reset
      queryClient.invalidateQueries({ queryKey: ['session-progress', sessionId] })
    },
    onError: error => {
      console.error('Error resetting progress:', error)
    }
  })

  // Log event mutation
  const logEventMutation = useMutation({
    mutationFn: (eventData: Parameters<typeof logProgressEvent>[1]) =>
      logProgressEvent(sessionId, eventData),
    onError: error => {
      console.warn('Failed to log progress event:', error)
    }
  })

  // Debounced update function to prevent API spam
  const debouncedUpdate = useCallback(
    async (progressUpdate: ProgressUpdatePayload) => {
      try {
        // Update progress record
        await updateProgressMutation.mutateAsync(progressUpdate)

        // Log progress event if answer provided
        if (progressUpdate.answer) {
          logEventMutation.mutate({
            event_type: 'question_answered',
            event_data: {
              question_index: progressUpdate.currentQuestion,
              answer: progressUpdate.answer,
              is_correct: progressUpdate.isCorrect,
              time_spent: progressUpdate.timeSpent,
              confidence_level: progressUpdate.confidenceLevel
            }
          })
        }
      } catch (error) {
        console.error('Error in updateProgress:', error)
        throw error
      }
    },
    [updateProgressMutation, logEventMutation]
  )

  // Combined update function with debouncing
  const updateProgress = useCallback(
    async (progressUpdate: ProgressUpdatePayload) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Store the latest update
      pendingUpdateRef.current = progressUpdate

      // For critical events (set completion, quiz completion), don't debounce
      if (progressUpdate.completed || progressUpdate.answer) {
        // Send immediately for answers and completion
        return debouncedUpdate(progressUpdate)
      }

      // For other updates, debounce for 500ms
      return new Promise<void>((resolve, reject) => {
        debounceTimerRef.current = setTimeout(async () => {
          try {
            if (pendingUpdateRef.current) {
              await debouncedUpdate(pendingUpdateRef.current)
              pendingUpdateRef.current = null
            }
            resolve()
          } catch (error) {
            reject(error)
          }
        }, 500)
      })
    },
    [debouncedUpdate]
  )

  // Get progress events function
  const getProgressEvents = useCallback(
    (userId?: string) => fetchProgressEvents(sessionId, userId),
    [sessionId]
  )

  // Real-time subscription with throttling
  useEffect(() => {
    if (!enabled || !sessionId) return

    let progressInvalidateTimeout: NodeJS.Timeout | null = null
    let participantInvalidateTimeout: NodeJS.Timeout | null = null

    const subscription = createProgressSubscription(
      sessionId,
      payload => {
        console.log('Progress update received:', payload)
        // Throttle progress invalidations to avoid spam
        if (progressInvalidateTimeout) {
          clearTimeout(progressInvalidateTimeout)
        }
        progressInvalidateTimeout = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['session-progress', sessionId] })
        }, 1000) // Wait 1 second before invalidating
      },
      payload => {
        console.log('Participant update received:', payload)
        // Throttle participant invalidations
        if (participantInvalidateTimeout) {
          clearTimeout(participantInvalidateTimeout)
        }
        participantInvalidateTimeout = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['session-participants', sessionId] })
        }, 2000) // Wait 2 seconds before invalidating
      }
    )

    return () => {
      if (progressInvalidateTimeout) clearTimeout(progressInvalidateTimeout)
      if (participantInvalidateTimeout) clearTimeout(participantInvalidateTimeout)
      if (supabase) {
        supabase.removeChannel(subscription)
      }
    }
  }, [enabled, sessionId, queryClient])

  // Calculate group statistics
  const groupStats = {
    totalParticipants: enrichedParticipants.length,
    onlineCount: enrichedParticipants.filter(p => p.is_online).length,
    completedCount: enrichedParticipants.filter(p => p.status === 'completed').length,
    inProgressCount: enrichedParticipants.filter(p => p.status === 'in_progress').length,
    averageProgress:
      enrichedParticipants.length > 0
        ? Math.round(
            enrichedParticipants.reduce((sum, p) => sum + p.completion_percentage, 0) /
              enrichedParticipants.length
          )
        : 0,
    averageAccuracy: (() => {
      const withAnswers = enrichedParticipants.filter(p => p.current_question_index > 0)
      return withAnswers.length > 0
        ? Math.round(
            withAnswers.reduce((sum, p) => {
              const accuracy =
                p.current_question_index > 0
                  ? (p.correct_answers / p.current_question_index) * 100
                  : 0
              return sum + accuracy
            }, 0) / withAnswers.length
          )
        : 0
    })()
  }

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const loading = participantsLoading || progressLoading
  const error = participantsError || progressError

  // Check for existing results
  const checkExistingResults = useCallback(
    async (groupId: string) => {
      if (!sessionId) return { hasResults: false }

      try {
        return await checkExistingResultsService(groupId, sessionId)
      } catch (error) {
        console.warn('Failed to check existing results:', error)
        return { hasResults: false }
      }
    },
    [sessionId]
  )

  return {
    participants: enrichedParticipants,
    groupStats,
    loading,
    error: error?.message || null,
    updateProgress,
    getProgressEvents,
    refreshData: () => {
      queryClient.invalidateQueries({ queryKey: ['session-participants', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['session-progress', sessionId] })
    },
    clearCache: () => {
      // Clear all cached data for this session
      queryClient.removeQueries({ queryKey: ['session-participants', sessionId] })
      queryClient.removeQueries({ queryKey: ['session-progress', sessionId] })
    },
    resetProgress: async () => {
      try {
        await resetProgressMutation.mutateAsync()
      } catch (error) {
        console.error('Failed to reset progress:', error)
        throw error
      }
    },
    checkExistingResults,
    isUpdating: updateProgressMutation.isPending,
    isResetting: resetProgressMutation.isPending
  }
}
