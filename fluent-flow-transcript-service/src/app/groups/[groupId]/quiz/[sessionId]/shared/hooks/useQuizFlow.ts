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
    
    console.log('🧭 Navigation check:', {
      currentPath,
      expectedStep,
      expectedPath,
      appState: quizData.appState
    })
    
    // Extract current step from URL
    const pathParts = currentPath.split('/')
    const currentStep = pathParts[pathParts.length - 1]
    
    // Handle different navigation scenarios
    if (currentPath === `/groups/${groupId}/quiz/${sessionId}` || currentPath.endsWith(`/quiz/${sessionId}`)) {
      // Case 1: Main quiz page - redirect to appropriate step
      console.log(`🔄 Auto-redirecting from main page to ${expectedPath}`)
      router.replace(expectedPath)
    } else if (currentStep !== expectedStep) {
      // Case 2: User is on wrong step page - handle intelligently
      const validSteps = ['setup', 'lobby', 'info', 'preview', 'active', 'results']
      
      if (!validSteps.includes(currentStep)) {
        // Invalid step - redirect to expected
        console.log(`❌ Invalid step "${currentStep}", redirecting to ${expectedStep}`)
        router.replace(expectedPath)
        return
      }
      
      // Check if the mismatch is problematic
      const stepOrder = { setup: 0, lobby: 1, info: 2, preview: 3, active: 4, results: 5 }
      const currentStepIndex = stepOrder[currentStep as keyof typeof stepOrder] ?? -1
      const expectedStepIndex = stepOrder[expectedStep as keyof typeof stepOrder] ?? -1
      
      // Allow some flexibility in navigation, but prevent major jumps
      if (currentStep === 'active' && expectedStep !== 'active') {
        // User is on active page but shouldn't be
        if (expectedStep === 'setup' || expectedStep === 'info') {
          console.log(`⚠️ User on active page but no questions ready, redirecting to ${expectedStep}`)
          router.replace(expectedPath)
        }
      } else if (currentStep === 'results' && expectedStep !== 'results') {
        // User is on results but quiz not complete - could be refresh after results
        console.log(`ℹ️ User on results page, but expected ${expectedStep}. Allowing...`)
      } else if (expectedStepIndex - currentStepIndex > 2) {
        // Major step jump - redirect to expected
        console.log(`🚫 Major step jump from ${currentStep} to ${expectedStep}, redirecting`)
        router.replace(expectedPath)
      } else {
        console.log(`✅ Step mismatch allowed: ${currentStep} -> ${expectedStep}`)
      }
    } else {
      console.log(`✅ Navigation correct: on ${currentStep} as expected`)
    }
  }, [quizData.appState, router, groupId, sessionId, getCurrentStep])

  // Handle browser back button and navigation events
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      console.log('🔙 Browser back/forward detected:', {
        currentPath: window.location.pathname,
        state: event.state
      })
      
      // Get current and expected steps
      const currentPath = window.location.pathname
      const pathParts = currentPath.split('/')
      const currentStep = pathParts[pathParts.length - 1]
      const expectedStep = getCurrentStep()
      
      // Check if user is navigating to a problematic state
      if (currentStep === 'active' && expectedStep !== 'active') {
        // User hit back to active page but shouldn't be there
        if (expectedStep === 'setup' || expectedStep === 'info') {
          console.log('🚫 Back to active page blocked - no questions ready')
          const expectedPath = `/groups/${groupId}/quiz/${sessionId}/${expectedStep}`
          // Use setTimeout to avoid navigation conflicts
          setTimeout(() => {
            router.replace(expectedPath)
          }, 100)
        }
      }
    }
    
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Warn user before leaving if they're in the middle of a quiz
      const currentPath = window.location.pathname
      if (currentPath.includes('/active') && quizData.responses?.length > 0) {
        event.preventDefault()
        // Modern approach - just return a string
        return 'You have unsaved quiz progress. Are you sure you want to leave?'
      }
    }
    
    // Add event listeners
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [router, groupId, sessionId, getCurrentStep, quizData.responses?.length])

  // Handle page refresh - detect if user refreshed on a step they shouldn't be on
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Page became visible - checking navigation state')
        // Slight delay to ensure state is updated
        setTimeout(() => {
          const currentPath = window.location.pathname
          const expectedStep = getCurrentStep()
          const pathParts = currentPath.split('/')
          const currentStep = pathParts[pathParts.length - 1]
          
          // Re-validate navigation after page becomes visible (covers refresh scenarios)
          if (currentStep === 'active' && expectedStep !== 'active') {
            if (expectedStep === 'setup' || expectedStep === 'info') {
              console.log('🔄 Page refresh on active detected - redirecting to', expectedStep)
              const expectedPath = `/groups/${groupId}/quiz/${sessionId}/${expectedStep}`
              router.replace(expectedPath)
            }
          }
        }, 500)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [router, groupId, sessionId, getCurrentStep])

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