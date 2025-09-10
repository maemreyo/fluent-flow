'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { CheckingResultsModal } from '../../../../../../../components/groups/quiz/CheckingResultsModal'
import { ExistingResultsModal } from '../../../../../../../components/groups/quiz/ExistingResultsModal'
import { PermissionManager } from '../../../../../../../lib/permissions'
import { GroupQuizPreview } from '../../components/GroupQuizPreview'
import { useExistingResultsCheck } from '../../hooks/useExistingResultsCheck'
import { useQuizSync } from '../../hooks/useQuizSync'
import { useQuizFlow } from '../../shared/hooks/useQuizFlow'

interface PreviewWithTokensPageProps {
  params: Promise<{
    groupId: string
    sessionId: string
    tokens: string
  }>
}

export default function PreviewWithTokensPage({ params }: PreviewWithTokensPageProps) {
  const { groupId, sessionId, tokens } = use(params)
  const [decodedShareTokens, setDecodedShareTokens] = useState<Record<string, string>>({})

  // Decode shareTokens from route parameters
  useEffect(() => {
    console.log('🔍 [Preview/Tokens] Raw tokens from route:', tokens)
    
    if (tokens) {
      try {
        // Decode from base64
        const decodedString = atob(tokens)
        console.log('🔍 [Preview/Tokens] Decoded JSON string:', decodedString)
        
        // Parse JSON
        const parsedTokens = JSON.parse(decodedString)
        console.log('✅ [Preview/Tokens] Parsed shareTokens:', parsedTokens)
        
        // Validate that we have expected difficulty keys
        const validDifficulties = ['easy', 'medium', 'hard']
        const validTokens: Record<string, string> = {}
        
        Object.entries(parsedTokens).forEach(([difficulty, token]) => {
          if (validDifficulties.includes(difficulty) && typeof token === 'string') {
            validTokens[difficulty] = token
            console.log(`✅ [Preview/Tokens] Valid ${difficulty}Token:`, token.substring(0, 10) + '...')
          }
        })
        
        setDecodedShareTokens(validTokens)
        console.log('✅ [Preview/Tokens] Final decoded shareTokens:', validTokens)
        
        // Also store in sessionStorage as backup
        const sessionStorageKey = `quiz-shareTokens-${sessionId}`
        sessionStorage.setItem(sessionStorageKey, JSON.stringify(validTokens))
        console.log('💾 [Preview/Tokens] Stored shareTokens in sessionStorage as backup')
        
      } catch (error) {
        console.error('❌ [Preview/Tokens] Failed to decode shareTokens from route:', error)
      }
    }
  }, [tokens, sessionId])

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

  // Get shareTokens for start quiz (use decoded tokens from URL)
  const getShareTokensForStartQuiz = useCallback(() => {
    console.log('🔍 [Preview/Tokens] Getting shareTokens for start quiz...')
    console.log('🔍 [Preview/Tokens] decodedShareTokens:', decodedShareTokens)
    
    if (decodedShareTokens && Object.keys(decodedShareTokens).length > 0) {
      console.log('✅ [Preview/Tokens] Using decoded shareTokens from URL:', decodedShareTokens)
      return decodedShareTokens
    }
    
    console.log('❌ [Preview/Tokens] No shareTokens available, returning empty object')
    return {}
  }, [decodedShareTokens])

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
    console.log('▶️ [Preview/Tokens] Starting quiz directly (no existing results)')

    // Get shareTokens from decoded URL tokens
    const shareTokens = getShareTokensForStartQuiz()
    console.log('🔍 [Preview/Tokens] ShareTokens retrieved for start quiz:', shareTokens)
    console.log('🔍 [Preview/Tokens] ShareTokens keys count:', Object.keys(shareTokens).length)

    // CRITICAL: Set appState to 'quiz-active' BEFORE navigation to prevent redirect back to setup
    await handleStartQuizFromPreview(shareTokens)

    // Create URL with shareTokens encoded in the route path
    let activeUrl: string
    
    if (shareTokens && Object.keys(shareTokens).length > 0) {
      console.log('✅ [Preview/Tokens] Encoding shareTokens for route...')
      
      try {
        // Encode shareTokens as base64 JSON for the route parameter
        const tokensJson = JSON.stringify(shareTokens)
        const encodedTokens = btoa(tokensJson)
        console.log('🔗 [Preview/Tokens] Encoded tokens:', encodedTokens)
        
        // Use the new dynamic route with encoded tokens
        activeUrl = `/groups/${groupId}/quiz/${sessionId}/active/${encodedTokens}`
        console.log('✅ [Preview/Tokens] Final URL with encoded tokens:', activeUrl)
      } catch (error) {
        console.error('❌ [Preview/Tokens] Failed to encode shareTokens:', error)
        // Fallback to regular active page
        activeUrl = `/groups/${groupId}/quiz/${sessionId}/active`
        console.log('🔄 [Preview/Tokens] Fallback to regular active URL:', activeUrl)
      }
    } else {
      console.warn('⚠️ [Preview/Tokens] No shareTokens available, using regular active page')
      activeUrl = `/groups/${groupId}/quiz/${sessionId}/active`
      console.log('🔍 [Preview/Tokens] Regular active URL:', activeUrl)
    }

    // Navigate to active quiz with encoded tokens in route
    console.log('🚀 [Preview/Tokens] Navigating to:', activeUrl)
    window.location.href = activeUrl
  }, [
    getShareTokensForStartQuiz,
    handleStartQuizFromPreview,
    groupId,
    sessionId
  ])

  const handleStartQuiz = useCallback(async () => {
    const shareTokens = getShareTokensForStartQuiz()
    console.log('🚀 [Preview/Tokens] Starting quiz with shareTokens:', shareTokens)

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