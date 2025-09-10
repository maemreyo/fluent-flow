'use client'

import { use, useCallback } from 'react'
import { CheckingResultsModal } from '../../../../../../components/groups/quiz/CheckingResultsModal'
import { ExistingResultsModal } from '../../../../../../components/groups/quiz/ExistingResultsModal'
import { PermissionManager } from '../../../../../../lib/permissions'
import { GroupQuizPreview } from '../components/GroupQuizPreview'
import { useExistingResultsCheck } from '../hooks/useExistingResultsCheck'
import { useGroupQuestionGeneration } from '../hooks/useQuestionGeneration'
import { useQuizSync } from '../hooks/useQuizSync'
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

  const { shareTokens } = useGroupQuestionGeneration(groupId, sessionId)

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

  const handleStartQuiz = useCallback(async () => {
    console.log('🚀 Starting quiz from preview with shareTokens:', shareTokens)

    // Check for existing results first if user is authenticated
    const hasExistingResults = await checkForExistingResults()

    if (!hasExistingResults) {
      // No existing results - proceed with quiz start
      await startQuizDirectly()
    }
  }, [shareTokens, checkForExistingResults])

  const startQuizDirectly = useCallback(async () => {
    console.log('▶️ Starting quiz directly (no existing results)')

    // CRITICAL: Set appState to 'quiz-active' BEFORE navigation to prevent redirect back to setup
    await handleStartQuizFromPreview(shareTokens)

    // Broadcast session start to all participants with shareTokens
    if (permissions.canManageQuiz()) {
      // const success = await broadcastQuizSessionStart(session?.quiz_title || 'Quiz Session', shareTokens)
      // if (success) {
      //   console.log('✅ Quiz session start broadcasted from preview, navigating to active')

      // Navigate to active quiz immediately - no delay needed since appState is already set
      navigateToActive()
      // }
    } else {
      // For non-managers, just navigate directly
      navigateToActive()
    }
  }, [
    shareTokens,
    permissions,
    broadcastQuizSessionStart,
    session?.quiz_title,
    navigateToActive,
    handleStartQuizFromPreview
  ])

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
