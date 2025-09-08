'use client'

import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGroupQuizWithProgress } from '../../hooks/useGroupQuizWithProgress'

export type QuizFlowStep = 'setup' | 'lobby' | 'info' | 'preview' | 'active' | 'results'

interface UseQuizFlowProps {
  groupId: string
  sessionId: string
}

export function useQuizFlow({ groupId, sessionId }: UseQuizFlowProps) {
  const router = useRouter()
  
  // Use existing hook but add navigation logic
  const quizData = useGroupQuizWithProgress({ groupId, sessionId })

  // Navigation functions
  const navigateToSetup = useCallback(() => {
    router.push(`/groups/${groupId}/quiz/${sessionId}/setup`)
  }, [router, groupId, sessionId])

  const navigateToLobby = useCallback(() => {
    router.push(`/groups/${groupId}/quiz/${sessionId}/lobby`)
  }, [router, groupId, sessionId])

  const navigateToInfo = useCallback(() => {
    router.push(`/groups/${groupId}/quiz/${sessionId}/info`)
  }, [router, groupId, sessionId])

  const navigateToPreview = useCallback(() => {
    router.push(`/groups/${groupId}/quiz/${sessionId}/preview`)
  }, [router, groupId, sessionId])

  const navigateToActive = useCallback(() => {
    router.push(`/groups/${groupId}/quiz/${sessionId}/active`)
  }, [router, groupId, sessionId])

  const navigateToResults = useCallback(() => {
    router.push(`/groups/${groupId}/quiz/${sessionId}/results`)
  }, [router, groupId, sessionId])

  // Determine current step from appState
  const getCurrentStep = useCallback((): QuizFlowStep => {
    console.log('🎯 getCurrentStep - appState:', quizData.appState)
    console.log('📊 Session status:', quizData.session?.status)
    
    switch (quizData.appState) {
      case 'preset-selection':
        return 'setup'
      case 'question-info':
        return 'info'
      case 'question-preview':
        return 'preview'
      case 'quiz-active':
        return 'active'
      case 'quiz-results':
        return 'results'
      case 'loading':
        return 'setup' // During loading, should go to setup once loaded
      case 'error':
        return 'setup' // On error, return to setup to retry
      default:
        // Check session status for better default behavior
        if (quizData.session?.status === 'scheduled' && quizData.session?.scheduled_at) {
          // Only go to lobby if there's an actual scheduled time
          const scheduledTime = new Date(quizData.session.scheduled_at).getTime()
          const now = new Date().getTime()
          if (scheduledTime > now) {
            console.log('📅 Session is scheduled with future time, showing lobby')
            return 'lobby'
          }
        }
        
        if (quizData.session?.status === 'active') {
          console.log('🏃 Session is active, going to active quiz')
          return 'active'
        } else if (quizData.session?.status === 'completed') {
          console.log('✅ Session completed, showing results')
          return 'results'
        }
        
        console.log('⚠️ Unknown appState, defaulting to setup:', quizData.appState)
        return 'setup' // Default to setup for most cases
    }
  }, [quizData.appState, quizData.session?.status])

  // Auto-redirect logic based on state
  useEffect(() => {
    const currentPath = window.location.pathname
    const expectedStep = getCurrentStep()
    const expectedPath = `/groups/${groupId}/quiz/${sessionId}/${expectedStep}`
    
    // Only redirect if we're on the main quiz page (not already on a step page)
    if (currentPath === `/groups/${groupId}/quiz/${sessionId}` || currentPath.endsWith('/quiz/${sessionId}')) {
      console.log(`🔄 Auto-redirecting from ${currentPath} to ${expectedPath}`)
      router.replace(expectedPath)
    }
  }, [quizData.appState, router, groupId, sessionId, getCurrentStep])

  return {
    ...quizData,
    currentStep: getCurrentStep(),
    
    // Navigation functions
    navigateToSetup,
    navigateToLobby,
    navigateToInfo,
    navigateToPreview,
    navigateToActive,
    navigateToResults
  }
}