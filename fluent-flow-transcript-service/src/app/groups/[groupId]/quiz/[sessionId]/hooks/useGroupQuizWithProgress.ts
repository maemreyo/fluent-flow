import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useProgressTracking } from '../../../../../../hooks/useProgressTracking'
import type { ProgressUpdatePayload } from '../../../../../../lib/services/progress-tracking-service'
import { useGroupQuiz } from './useGroupQuiz'

interface UseGroupQuizWithProgressProps {
  groupId: string
  sessionId: string
}

export function useGroupQuizWithProgress({ groupId, sessionId }: UseGroupQuizWithProgressProps) {
  const groupQuizData = useGroupQuiz({ groupId, sessionId })

  // Calculate total questions from difficulty groups
  const totalQuestions = groupQuizData.difficultyGroups.reduce(
    (total, group) => total + group.questions.length,
    0
  )

  const {
    participants: progressParticipants,
    groupStats,
    updateProgress,
    clearCache,
    resetProgress,
    checkExistingResults
  } = useProgressTracking({
    sessionId,
    enabled: groupQuizData.appState === 'quiz-active', // Only enable during active quiz
    totalQuestions: totalQuestions > 0 ? totalQuestions : undefined
  })

  // State for existing results modal
  const [showExistingResultsModal, setShowExistingResultsModal] = useState(false)
  const [shouldCheckResults, setShouldCheckResults] = useState(false)

  // React Query for checking existing results - Optimized caching
  const {
    data: existingResults,
    isLoading: isCheckingExistingResults,
    error: existingResultsError,
    refetch: refetchExistingResults
  } = useQuery({
    queryKey: ['existing-results', groupId, sessionId, groupQuizData.isAuthenticated],
    queryFn: () => {
      console.log('useQuery: Actually calling checkExistingResults')
      return checkExistingResults(groupId)
    },
    enabled: false, // We'll trigger manually
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes - reasonable for existing results
    gcTime: 5 * 60 * 1000, // Keep in memory for 5 minutes
    retry: false, // Don't retry on error for user experience
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Don't refetch on network reconnection
    refetchOnMount: false // Don't refetch on component remount
  })

  // Handle query results
  useEffect(() => {
    if (existingResults !== undefined && shouldCheckResults) {
      console.log('Processing existing results:', existingResults)

      if (existingResults.hasResults) {
        console.log('Found existing results, showing modal')
        setShowExistingResultsModal(true)
      } else {
        console.log('No existing results found, proceeding with quiz')
        // Auto-proceed with quiz start if no existing results
        groupQuizData.handleQuestionInfoStart()
      }

      // Reset the trigger after processing
      setShouldCheckResults(false)
    }
  }, [existingResults, shouldCheckResults, groupQuizData])

  // Handle query errors
  useEffect(() => {
    if (existingResultsError && shouldCheckResults) {
      console.warn('Failed to check existing results:', existingResultsError)
      // On error, proceed with quiz start
      groupQuizData.handleQuestionInfoStart()
      setShouldCheckResults(false)
    }
  }, [existingResultsError, shouldCheckResults, groupQuizData])

  // Enhanced handleQuestionInfoStart that checks for existing results first
  const handleQuestionInfoStartWithCheck = useCallback(() => {
    if (!groupQuizData.isAuthenticated) {
      // If not authenticated, proceed normally - auth prompt will be handled elsewhere
      groupQuizData.handleQuestionInfoStart()
      return
    }

    // Check if we already have cached results
    if (existingResults !== undefined) {
      console.log('Using cached existing results:', existingResults)
      if (existingResults.hasResults) {
        setShowExistingResultsModal(true)
        return
      } else {
        groupQuizData.handleQuestionInfoStart()
        return
      }
    }

    // Trigger existing results check if no cache
    console.log('handleQuestionInfoStartWithCheck: Checking for existing results...')
    setShouldCheckResults(true)
    refetchExistingResults() // Manually trigger the query
  }, [groupQuizData, refetchExistingResults, existingResults])

  // Reset progress when starting quiz without existing results
  useEffect(() => {
    if (
      groupQuizData.appState === 'quiz-active' &&
      groupQuizData.isAuthenticated &&
      existingResults !== undefined && // We've checked for existing results
      !existingResults.hasResults // And found no existing results
    ) {
      // Safe to reset progress for fresh start
      resetProgress()
        .then(() => {
          console.log('Progress reset for fresh quiz start (no existing results)')
        })
        .catch(error => {
          console.warn('Failed to reset progress for fresh start:', error)
        })
    }
  }, [groupQuizData.appState, groupQuizData.isAuthenticated, existingResults, resetProgress])

  // Clear cache when quiz starts (preset-selection to question-info transition)
  useEffect(() => {
    if (groupQuizData.appState === 'question-info') {
      clearCache()
    }
  }, [groupQuizData.appState, clearCache])

  // Simple handleAnswerSelect - no progress tracking here
  const handleAnswerSelectWithProgress = useCallback(
    (questionIndex: number, answer: string) => {
      // Just call original handler, no progress update
      groupQuizData.handleAnswerSelect(questionIndex, answer)
    },
    [groupQuizData.handleAnswerSelect]
  )

  // Enhanced moveToNextQuestion that updates progress
  const moveToNextQuestionWithProgress = useCallback(async () => {
    // Call original handler
    groupQuizData.moveToNextQuestion()

    // Update progress when user moves to next question (commits their answer)
    if (groupQuizData.appState === 'quiz-active' && groupQuizData.isAuthenticated) {
      const currentResponse = groupQuizData.responses[groupQuizData.responses.length - 1]
      if (currentResponse) {
        const currentSet = groupQuizData.currentSetIndex
        const totalAnswered = groupQuizData.responses.length
        const correctAnswers = groupQuizData.responses.filter(r => {
          const q = groupQuizData.difficultyGroups
            .flatMap(g => g.questions)
            .find((_, idx) => idx === r.questionIndex)
          return q && q.correctAnswer === r.answer
        }).length

        const progressUpdate: ProgressUpdatePayload = {
          currentQuestion: currentResponse.questionIndex + 1, // Moving to next
          currentSet: currentSet,
          totalAnswered: totalAnswered,
          correctAnswers: correctAnswers,
          answer: currentResponse.answer,
          isCorrect: (() => {
            const q = groupQuizData.difficultyGroups
              .flatMap(g => g.questions)
              .find((_, idx) => idx === currentResponse.questionIndex)
            return q ? q.correctAnswer === currentResponse.answer : false
          })(),
          timeSpent: 0,
          confidenceLevel: 'medium',
          completed: false
        }

        try {
          await updateProgress(progressUpdate)
        } catch (error) {
          console.warn('Failed to update progress on next question:', error)
        }
      }
    }
  }, [
    groupQuizData.moveToNextQuestion,
    groupQuizData.appState,
    groupQuizData.isAuthenticated,
    groupQuizData.responses,
    groupQuizData.currentSetIndex,
    groupQuizData.difficultyGroups,
    updateProgress
  ])

  // Enhanced submitCurrentSet that marks set completion
  const submitCurrentSetWithProgress = useCallback(async () => {
    // Call original handler first
    await groupQuizData.submitCurrentSet()

    // Update progress to mark set as completed
    if (groupQuizData.appState === 'quiz-active' && groupQuizData.isAuthenticated) {
      const currentSet = groupQuizData.currentSetIndex
      const totalAnswered = groupQuizData.responses.length
      const correctAnswers = groupQuizData.responses.filter(r => {
        const q = groupQuizData.difficultyGroups
          .flatMap(g => g.questions)
          .find((_, idx) => idx === r.questionIndex)
        return q && q.correctAnswer === r.answer
      }).length

      const progressUpdate: ProgressUpdatePayload = {
        currentQuestion: totalAnswered, // Current progress
        currentSet: currentSet + 1, // Moving to next set or completing
        totalAnswered: totalAnswered,
        correctAnswers: correctAnswers,
        timeSpent: 0,
        completed: false // Will be marked true in quiz completion effect
      }

      try {
        await updateProgress(progressUpdate)
        console.log('Progress updated for set completion:', progressUpdate)
      } catch (error) {
        console.warn('Failed to update progress for set completion:', error)
      }
    }
  }, [
    groupQuizData.submitCurrentSet,
    groupQuizData.appState,
    groupQuizData.isAuthenticated,
    groupQuizData.currentSetIndex,
    groupQuizData.responses,
    groupQuizData.difficultyGroups,
    updateProgress
  ])

  // Mark quiz as completed when results are shown
  useEffect(() => {
    // console.log('Quiz completion effect check:', {
    //   appState: groupQuizData.appState,
    //   isAuthenticated: groupQuizData.isAuthenticated,
    //   hasResults: !!groupQuizData.results,
    //   results: groupQuizData.results
    // })

    if (
      groupQuizData.appState === 'quiz-results' &&
      groupQuizData.isAuthenticated &&
      groupQuizData.results
    ) {
      console.log('Marking quiz as completed...')

      const finalProgressUpdate: ProgressUpdatePayload = {
        currentQuestion: groupQuizData.results.totalQuestions || 0,
        currentSet: groupQuizData.difficultyGroups.length,
        totalAnswered: groupQuizData.results.totalQuestions || 0,
        correctAnswers: groupQuizData.results.correctAnswers || 0,
        timeSpent: 0,
        completed: true
      }

      console.log('Final progress update:', finalProgressUpdate)

      updateProgress(finalProgressUpdate)
        .then(() => {
          console.log('Successfully marked quiz as completed!')
        })
        .catch(error => {
          console.warn('Failed to mark quiz as completed:', error)
        })
    }
  }, [
    groupQuizData.appState,
    groupQuizData.isAuthenticated,
    groupQuizData.results,
    groupQuizData.difficultyGroups.length,
    updateProgress
  ])

  // Modal handlers
  const handleGoBackToPresets = useCallback(() => {
    setShowExistingResultsModal(false)
    // Navigate back to preset selection
    if (groupQuizData.handleRestart) {
      groupQuizData.handleRestart()
    }
    console.log('Going back to preset selection')
  }, [groupQuizData])

  const handleStartFresh = useCallback(async () => {
    setShowExistingResultsModal(false)
    try {
      // Reset progress to clear old data
      await resetProgress()
      console.log('Starting fresh quiz - old data cleared')
      // Now proceed with starting the quiz
      groupQuizData.handleQuestionInfoStart()
    } catch (error) {
      console.error('Failed to reset progress:', error)
    }
  }, [resetProgress, groupQuizData])

  const handleCloseModal = useCallback(() => {
    setShowExistingResultsModal(false)
  }, [])

  // Manual trigger for checking existing results (for testing purposes)
  const checkAndHandleExistingResults = useCallback(async () => {
    if (!groupQuizData.isAuthenticated) return false

    console.log('Manual checkAndHandleExistingResults called')
    setShouldCheckResults(true)
    const { data } = await refetchExistingResults()

    if (data?.hasResults) {
      setShowExistingResultsModal(true)
      return true
    }

    return false
  }, [groupQuizData.isAuthenticated, refetchExistingResults])

  // Debug logging
  useEffect(() => {
    console.log('Debug state:', {
      shouldCheckResults,
      isCheckingExistingResults,
      existingResults: existingResults ? 'has data' : 'no data',
      showExistingResultsModal
    })
  }, [shouldCheckResults, isCheckingExistingResults, existingResults, showExistingResultsModal])

  return {
    ...groupQuizData,
    // Override with progress-enhanced handlers
    handleAnswerSelect: handleAnswerSelectWithProgress,
    moveToNextQuestion: moveToNextQuestionWithProgress,
    submitCurrentSet: submitCurrentSetWithProgress,
    handleQuestionInfoStart: handleQuestionInfoStartWithCheck, // Override with check
    // Add progress data
    progressParticipants,
    groupStats,
    // Add existing results modal data
    existingResults: existingResults || { hasResults: false },
    showExistingResultsModal,
    isCheckingExistingResults: isCheckingExistingResults && shouldCheckResults,
    checkAndHandleExistingResults, // Expose for manual testing if needed
    handleGoBackToPresets,
    handleStartFresh,
    handleCloseModal
  }
}
