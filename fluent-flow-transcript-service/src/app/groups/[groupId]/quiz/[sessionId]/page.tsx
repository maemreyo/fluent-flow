'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuizFlow } from './shared/hooks/useQuizFlow'
import { LoadingView } from '../../../../questions/[token]/components/LoadingView'

interface GroupQuizPageProps {
  params: Promise<{
    groupId: string
    sessionId: string
  }>
}

export default function GroupQuizPage({ params }: GroupQuizPageProps) {
  const { groupId, sessionId } = use(params)
  const router = useRouter()

  const {
    currentStep,
    appState,
    error,
    navigateToSetup,
    navigateToLobby,
    navigateToInfo,
    navigateToPreview,
    navigateToActive,
    navigateToResults
  } = useQuizFlow({ groupId, sessionId })

  // Auto-redirect based on current quiz state
  useEffect(() => {
    if (appState === 'loading') return

    console.log('🔄 Quiz page auto-redirect check:', { appState, currentStep })
    
    switch (currentStep) {
      case 'setup':
        navigateToSetup()
        break
      case 'lobby':
        navigateToLobby()
        break
      case 'info':
        navigateToInfo()
        break
      case 'preview':
        navigateToPreview()
        break
      case 'active':
        navigateToActive()
        break
      case 'results':
        navigateToResults()
        break
      default:
        // Fallback to setup if unknown state
        navigateToSetup()
    }
  }, [appState, currentStep, navigateToSetup, navigateToLobby, navigateToInfo, navigateToPreview, navigateToActive, navigateToResults])

  // Show loading while redirecting
  return <LoadingView message="Preparing quiz session..." />
}
    