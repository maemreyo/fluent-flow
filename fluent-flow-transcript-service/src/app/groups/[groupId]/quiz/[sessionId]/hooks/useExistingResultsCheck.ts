import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useProgressTracking } from '../../../../../../hooks/useProgressTracking'

interface UseExistingResultsCheckProps {
  groupId: string
  sessionId: string
  userId: string | undefined
  enabled?: boolean
}

interface ExistingResultsState {
  showExistingResultsModal: boolean
  isCheckingExistingResults: boolean
  existingResults?: {
    hasResults: boolean
    results?: any
  }
}

export function useExistingResultsCheck({
  groupId,
  sessionId,
  userId,
  enabled = true
}: UseExistingResultsCheckProps) {
  const [showExistingResultsModal, setShowExistingResultsModal] = useState(false)

  const { checkExistingResults, resetProgress } = useProgressTracking({
    sessionId,
    enabled: false
  })

  const {
    data: existingResults,
    isLoading: isCheckingExistingResults,
    refetch: refetchExistingResults
  } = useQuery({
    queryKey: ['existing-results', groupId, sessionId, userId],
    queryFn: () => {
      console.log('🔍 Checking for existing results from hook')
      return checkExistingResults(groupId)
    },
    enabled: false,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false
  })

  const checkForExistingResults = useCallback(async (): Promise<boolean> => {
    if (!userId || !enabled) return false

    console.log('👤 User is authenticated, checking for existing results...')

    // Check if we already have cached results
    if (existingResults !== undefined) {
      console.log('📋 Using cached existing results:', existingResults)
      if (existingResults.hasResults) {
        console.log('⚠️ Found existing results, showing modal')
        setShowExistingResultsModal(true)
        return true
      }
      return false
    }

    // Trigger existing results check
    console.log('🔍 No cached results, checking server...')
    const results = await refetchExistingResults()

    if (results.data?.hasResults) {
      console.log('⚠️ Found existing results from server, showing modal')
      setShowExistingResultsModal(true)
      return true
    }

    return false
  }, [userId, enabled, existingResults, refetchExistingResults])

  const handleGoBackToPresets = useCallback((onGoBack?: () => void) => {
    setShowExistingResultsModal(false)
    onGoBack?.()
  }, [])

  const handleStartFresh = useCallback(async (onStartFresh?: () => Promise<void>) => {
    setShowExistingResultsModal(false)
    try {
      await resetProgress()
      console.log('🔄 Starting fresh quiz - old data cleared')
      await onStartFresh?.()
    } catch (error) {
      console.error('❌ Failed to reset progress:', error)
      await onStartFresh?.()
    }
  }, [resetProgress])

  const handleCloseModal = useCallback(() => {
    setShowExistingResultsModal(false)
  }, [])

  const state: ExistingResultsState = {
    showExistingResultsModal,
    isCheckingExistingResults,
    existingResults: existingResults || { hasResults: false }
  }

  return {
    ...state,
    checkForExistingResults,
    handleGoBackToPresets,
    handleStartFresh,
    handleCloseModal
  }
}