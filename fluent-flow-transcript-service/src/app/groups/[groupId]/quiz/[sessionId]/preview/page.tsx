'use client'

import { use, useCallback } from 'react'
import { CheckingResultsModal } from '../../../../../../components/groups/quiz/CheckingResultsModal'
import { ExistingResultsModal } from '../../../../../../components/groups/quiz/ExistingResultsModal'
import { PermissionManager } from '../../../../../../lib/permissions'
import { GroupQuizPreview } from '../components/GroupQuizPreview'
import { useExistingResultsCheck } from '../hooks/useExistingResultsCheck'
import { useGroupQuestionGeneration } from '../hooks/useQuestionGeneration'
import { useQuizSync } from '../hooks/useQuizSync'
import { useSharedQuestions } from '../hooks/useSharedQuestions'
import { useQuizFlow } from '../shared/hooks/useQuizFlow'

interface PreviewPageProps {
  params: Promise<{
    groupId: string
    sessionId: string
  }>
}

export default function PreviewPage({ params }: PreviewPageProps) {
  const { groupId, sessionId } = use(params)

  const {
    session,
    group,
    user,
    difficultyGroups,
    handleGoBackFromPreview,
    handleStartQuizFromPreview,
    navigateToSetup,
    navigateToActive
  } = useQuizFlow({ groupId, sessionId })

  const { shareTokens: hookShareTokens } = useGroupQuestionGeneration(groupId, sessionId)

  // For members: Get shareTokens from shared questions cache/API
  const { shareTokens: sharedShareTokens, hasQuestions: hasSharedQuestions } = useSharedQuestions({
    groupId,
    sessionId
  })

  // Get shareTokens from sessionStorage as fallback for members
  const getShareTokensForStartQuiz = useCallback(() => {
    console.log('🔍 [Preview] Getting shareTokens for start quiz...')
    console.log('🔍 [Preview] hookShareTokens:', hookShareTokens)
    console.log('🔍 [Preview] sharedShareTokens:', sharedShareTokens)
    console.log('🔍 [Preview] hasSharedQuestions:', hasSharedQuestions)
    console.log('🔍 [Preview] sessionId:', sessionId)

    // First try hook shareTokens (for owners who generate questions)
    if (hookShareTokens && Object.keys(hookShareTokens).length > 0) {
      console.log('✅ [Preview] Using hookShareTokens (owner):', hookShareTokens)
      return hookShareTokens
    }

    // Second try shared shareTokens from API/cache (for members)
    if (sharedShareTokens && Object.keys(sharedShareTokens).length > 0) {
      console.log('✅ [Preview] Using sharedShareTokens (member):', sharedShareTokens)
      return sharedShareTokens
    }

    // Third try sessionStorage (fallback for members)
    console.log('🔍 [Preview] No hook or shared shareTokens, trying sessionStorage...')

    if (typeof window !== 'undefined') {
      const sessionStorageKey = `quiz-shareTokens-${sessionId}`
      console.log('🔍 [Preview] Looking for sessionStorage key:', sessionStorageKey)

      const storedTokens = sessionStorage.getItem(sessionStorageKey)
      console.log('🔍 [Preview] Raw sessionStorage value:', storedTokens)

      if (storedTokens) {
        try {
          const parsedTokens = JSON.parse(storedTokens)
          console.log('✅ [Preview] Using shareTokens from sessionStorage:', parsedTokens)
          return parsedTokens
        } catch (error) {
          console.warn('❌ [Preview] Failed to parse sessionStorage shareTokens:', error)
        }
      } else {
        console.log('❌ [Preview] No shareTokens found in sessionStorage')

        // Debug: Let's see what's actually in sessionStorage
        console.log('🔍 [Preview] All sessionStorage keys:')
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
        }
      }
    }

    console.log('❌ [Preview] No shareTokens available from any source, returning empty object')
    return {}
  }, [hookShareTokens, sharedShareTokens, hasSharedQuestions, sessionId])

  // Existing results checking hook
  const {
    showExistingResultsModal,
    isCheckingExistingResults,
    existingResults,
    checkForExistingResults,
    handleGoBackToPresets: handleGoBackToPresetsBase,
    handleStartFresh: handleStartFreshBase,
    handleCloseModal
  } = useExistingResultsCheck({
    groupId,
    sessionId,
    userId: user?.id,
    enabled: true
  })

  // Role-based permissions
  const permissions = new PermissionManager(user, group, session)

  // Quiz synchronization for broadcasting
  const { broadcastQuizSessionStart } = useQuizSync({
    groupId,
    sessionId,
    canManage: permissions.canManageQuiz(),
    enabled: true
  })

  // Group settings
  const groupSettings = (group as any)?.settings || {}

  const startQuizDirectly = useCallback(async () => {
    console.log('▶️ [Preview] Starting quiz directly (no existing results)')

    // Get shareTokens from hook or sessionStorage
    const shareTokens = getShareTokensForStartQuiz()
    console.log('🔍 [Preview] ShareTokens retrieved for start quiz:', shareTokens)
    console.log('🔍 [Preview] ShareTokens keys count:', Object.keys(shareTokens).length)

    // CRITICAL: Set appState to 'quiz-active' BEFORE navigation to prevent redirect back to setup
    await handleStartQuizFromPreview(shareTokens)

    // Create URL with shareTokens encoded in the route path
    let activeUrl: string

    if (shareTokens && Object.keys(shareTokens).length > 0) {
      console.log('✅ [Preview] Encoding shareTokens for route...')

      try {
        // Encode shareTokens as base64 JSON for the route parameter
        const tokensJson = JSON.stringify(shareTokens)
        const encodedTokens = btoa(tokensJson)
        console.log('🔗 [Preview] Encoded tokens:', encodedTokens)

        // Use the new dynamic route with encoded tokens
        activeUrl = `/groups/${groupId}/quiz/${sessionId}/active/${encodedTokens}`
        console.log('✅ [Preview] Final URL with encoded tokens:', activeUrl)
      } catch (error) {
        console.error('❌ [Preview] Failed to encode shareTokens:', error)
        // Fallback to regular active page
        activeUrl = `/groups/${groupId}/quiz/${sessionId}/active`
        console.log('🔄 [Preview] Fallback to regular active URL:', activeUrl)
      }
    } else {
      console.warn('⚠️ [Preview] No shareTokens available, using regular active page')
      activeUrl = `/groups/${groupId}/quiz/${sessionId}/active`
      console.log('🔍 [Preview] Regular active URL:', activeUrl)
    }

    // Navigate to active quiz with encoded tokens in route
    console.log('🚀 [Preview] Navigating to:', activeUrl)
    window.location.href = activeUrl
  }, [getShareTokensForStartQuiz, handleStartQuizFromPreview, groupId, sessionId])

  const handleStartQuiz = useCallback(async () => {
    const shareTokens = getShareTokensForStartQuiz()
    console.log('🚀 Starting quiz from preview with shareTokens:', shareTokens)

    // Check for existing results first if user is authenticated
    const hasExistingResults = await checkForExistingResults()

    if (!hasExistingResults) {
      // No existing results - proceed with quiz start
      await startQuizDirectly()
    }
  }, [getShareTokensForStartQuiz, checkForExistingResults, startQuizDirectly])

  // Handle existing results modal actions with hook integration
  const handleGoBackToPresets = useCallback(() => {
    handleGoBackToPresetsBase(() => navigateToSetup())
  }, [handleGoBackToPresetsBase, navigateToSetup])

  const handleStartFresh = useCallback(async () => {
    await handleStartFreshBase(startQuizDirectly)
  }, [handleStartFreshBase, startQuizDirectly])

  const handleGoBack = () => {
    handleGoBackFromPreview()
    navigateToSetup()
  }

  return (
    <>
      {/* Existing Results Modal */}
      {showExistingResultsModal && existingResults?.hasResults && existingResults.results && (
        <ExistingResultsModal
          isOpen={showExistingResultsModal}
          results={existingResults.results}
          onGoBackToPresets={handleGoBackToPresets}
          onStartFresh={handleStartFresh}
          onClose={handleCloseModal}
        />
      )}

      {/* Checking Results Modal */}
      <CheckingResultsModal isOpen={isCheckingExistingResults} />

      <div className="max-w-8xl mx-auto">
        <GroupQuizPreview
          difficultyGroups={difficultyGroups}
          onStartQuiz={handleStartQuiz}
          onGoBack={handleGoBack}
          canShowAnswers={permissions.canManageQuiz()}
          sessionTitle={session?.quiz_title || session?.title || 'Group Quiz Session'}
          quizSettings={groupSettings}
        />
      </div>
    </>
  )
}
