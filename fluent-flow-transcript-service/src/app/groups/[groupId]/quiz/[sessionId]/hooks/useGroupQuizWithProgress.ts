import { useCallback, useEffect, useState } from 'react'
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
  const [existingResults, setExistingResults] = useState<{
    hasResults: boolean
    results?: {
      score: number
      totalQuestions: number
      correctAnswers: number
      timeSpent: number
      completedAt: string
    }
  } | null>(null)
  const [showExistingResultsModal, setShowExistingResultsModal] = useState(false)
  const [isCheckingExistingResults, setIsCheckingExistingResults] = useState(false)

  // Manual check for existing results
  const checkAndHandleExistingResults = useCallback(async () => {
    if (!groupQuizData.isAuthenticated) return false

    console.log('Checking for existing results...')
    setIsCheckingExistingResults(true)
    
    try {
      const results = await checkExistingResults(groupId)
      console.log('Existing results check result:', results)
      setExistingResults(results)
      
      if (results.hasResults) {
        console.log('Found existing results, showing modal')
        setShowExistingResultsModal(true)
        return true // Indicate that we should wait for user choice
      } else {
        console.log('No existing results found, proceeding with quiz')
        return false // Indicate that we can proceed directly
      }
    } catch (error) {
      console.warn('Failed to check existing results:', error)
      setExistingResults({ hasResults: false })
      return false
    } finally {
      setIsCheckingExistingResults(false)
    }
  }, [groupId, groupQuizData.isAuthenticated, checkExistingResults])

  // Enhanced handleQuestionInfoStart that checks for existing results first
  const handleQuestionInfoStartWithCheck = useCallback(async () => {
    if (!groupQuizData.isAuthenticated) {
      // If not authenticated, proceed normally - auth prompt will be handled elsewhere
      groupQuizData.handleQuestionInfoStart()
      return
    }

    // Check for existing results before starting
    const hasExistingResults = await checkAndHandleExistingResults()
    
    if (!hasExistingResults) {
      // No existing results, proceed with quiz start
      groupQuizData.handleQuestionInfoStart()
    }
    // If there are existing results, the modal is shown and user must choose
    // The modal handlers will either restart or go back to presets
  }, [groupQuizData])

  // Reset progress when starting quiz without existing results
  useEffect(() => {
    if (
      groupQuizData.appState === 'quiz-active' && 
      groupQuizData.isAuthenticated &&
      existingResults !== null && // We've checked for existing results
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
  }, [groupQuizData.appState, groupQuizData.isAuthenticated, existingResults])

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
    console.log('Quiz completion effect check:', {
      appState: groupQuizData.appState,
      isAuthenticated: groupQuizData.isAuthenticated,
      hasResults: !!groupQuizData.results,
      results: groupQuizData.results
    })

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
    // Reset existing results check so user can come back
    setExistingResults(null)
    // Navigate back to preset selection - assuming there's a method in groupQuizData for this
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
      setExistingResults({ hasResults: false })
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
    existingResults,
    showExistingResultsModal,
    isCheckingExistingResults,
    checkAndHandleExistingResults, // Expose for manual testing if needed
    handleGoBackToPresets,
    handleStartFresh,
    handleCloseModal
  }
}
