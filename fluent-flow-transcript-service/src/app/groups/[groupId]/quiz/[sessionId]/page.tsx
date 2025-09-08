'use client'

import { use, useCallback } from 'react'
import { AuthPrompt } from '../../../../../components/auth/AuthPrompt'
import { CompactProgressSidebar } from '../../../../../components/groups/progress/CompactProgressSidebar'
import { CheckingResultsModal } from '../../../../../components/groups/quiz/CheckingResultsModal'
import { ExistingResultsModal } from '../../../../../components/groups/quiz/ExistingResultsModal'
import { QuestionInfoCard } from '../../../../../components/groups/quiz/QuestionInfoCard'
import { useLoop, useSessionQuestions } from '../../../../../hooks/useLoops'
import { PermissionManager } from '../../../../../lib/permissions'
import { ErrorView } from '../../../../questions/[token]/components/ErrorView'
import { LoadingView } from '../../../../questions/[token]/components/LoadingView'
import { ExpiredSessionView } from './components/ExpiredSessionView'
import { FallbackParticipantsSidebar } from './components/FallbackParticipantsSidebar'
import { GroupPresetSelectionView } from './components/GroupPresetSelectionView'
import { GroupQuizActiveView } from './components/GroupQuizActiveView'
import { GroupQuizPreview } from './components/GroupQuizPreview'
import { GroupQuizResults } from './components/GroupQuizResults'
import { GroupQuizSessionHeader } from './components/GroupQuizSessionHeader'
import { MemberWaitingView } from './components/MemberWaitingView'
import { NotJoinedView } from './components/NotJoinedView'
import { useGroupQuizWithProgress } from './hooks/useGroupQuizWithProgress'
import { useGroupQuestionGeneration } from './hooks/useQuestionGeneration'
import { useQuizStartup } from './hooks/useQuizStartup'
import { useQuizSync } from './hooks/useQuizSync'

interface GroupQuizPageProps {
  params: Promise<{
    groupId: string
    sessionId: string
  }>
}

export default function GroupQuizPage({ params }: GroupQuizPageProps) {
  const { groupId, sessionId } = use(params)

  // Question generation hook
  const {
    generatingState,
    generatedCounts,
    shareTokens,
    currentPreset,
    setGeneratedCounts,
    setShareTokens,
    handleGenerateQuestions: generateQuestions,
    handleGenerateAllQuestions: generateAllQuestions,
    handleGenerateFromPreset: generateFromPreset,
    clearExistingQuestions,
    needsPresetReplacement
  } = useGroupQuestionGeneration(groupId, sessionId)

  const {
    // Quiz state
    appState,
    error,

    // Group context
    session,
    group,
    participants,
    onlineParticipants,
    isUserJoined,

    // Quiz functionality
    showAuthPrompt,
    handleAuthSuccess,
    handleCloseAuthPrompt,
    handlePresetSelect,
    handleQuestionInfoStart,
    handleStartQuizFromPreview,
    handleGoBackFromPreview,
    getCurrentQuestion,
    responses,
    handleAnswerSelect,
    moveToNextQuestion,
    submitCurrentSet,
    moveToNextSet,
    isLastQuestionInSet,
    allQuestionsInSetAnswered,
    submitting,
    handleRestart,
    currentSetIndex,
    currentQuestionIndex, // Add this line
    difficultyGroups,
    results,
    user,
    isAuthenticated,

    // Progress tracking data
    progressParticipants,
    groupStats,

    // Existing results modal data
    existingResults,
    showExistingResultsModal,
    isCheckingExistingResults,
    handleGoBackToPresets,
    handleStartFresh,
    handleCloseModal,

    // Navigation handlers
    handleNavigateToQuestion,
    handleNavigatePrevious,
    handleNavigateNext
  } = useGroupQuizWithProgress({ groupId, sessionId })

  const loopId = (session as any)?.loop_data?.id
  const { data: loopData, error: loopError } = useLoop(groupId, loopId)

  // // Debug logging for session and loop data
  // console.log('🔍 Session debug:', {
  //   sessionExists: !!session,
  //   sessionId: session?.id,
  //   hasLoopData: !!(session as any)?.loop_data,
  //   loopId: loopId,
  //   loopDataExists: !!loopData,
  //   loopDataId: loopData?.id
  // })

  // Load existing questions for this session
  const { data: sessionQuestions } = useSessionQuestions(groupId, sessionId)

  // Role-based permissions
  const permissions = new PermissionManager(user, group, session)

  // Group settings
  const groupSettings = (group as any)?.settings || {}

  // Simplified quiz synchronization
  const {
    syncState,
    broadcastQuizSessionStart,
    broadcastPreparationUpdate
  } = useQuizSync({
    groupId,
    sessionId,
    canManage: permissions.canManageQuiz(),
    enabled: true
  })

  // Quiz startup hook
  const { handleStartQuiz: originalHandleStartQuiz } = useQuizStartup({
    sessionQuestions,
    setGeneratedCounts,
    setShareTokens,
    handlePresetSelect,
    generatedCounts,
    currentPreset
  })

  // Enhanced handleStartQuiz that includes session synchronization
  const handleStartQuiz = useCallback(
    async (shareTokens: Record<string, string>) => {
      console.log('🚀 Enhanced quiz session start initiated')

      // First call the original startup logic
      await originalHandleStartQuiz(shareTokens)

      // Then broadcast session start to all participants
      if (permissions.canManageQuiz()) {
        const success = await broadcastQuizSessionStart()
        if (success) {
          console.log('✅ Quiz session start broadcasted to all participants')

          // Redirect owner after a short delay to allow broadcast
          setTimeout(() => {
            console.log('🎯 Owner redirecting to quiz')
            // The router.push will be handled by the original handleStartQuiz
          }, 1000)
        }
      }
    },
    [originalHandleStartQuiz, permissions.canManageQuiz(), broadcastQuizSessionStart]
  )

  // Simplified question generation handlers
  const handleGenerateQuestions = async (difficulty: 'easy' | 'medium' | 'hard') => {
    // Check if loop data is available
    if (!loopData || loopError) {
      console.error('❌ Cannot generate questions: Loop data not available', {
        loopId,
        loopError: loopError?.message,
        difficulty
      })
      alert('Cannot generate questions: The practice loop associated with this session is not available.')
      return
    }

    // Broadcast generation start
    if (permissions.canManageQuiz()) {
      broadcastPreparationUpdate('question-generation', {
        [difficulty]: true,
        completed: false
      })
    }

    await generateQuestions(difficulty, loopData)

    // Check if ready and broadcast
    const newCounts = { ...generatedCounts, [difficulty]: generatedCounts[difficulty] + 1 }
    if (
      permissions.canManageQuiz() &&
      newCounts.easy > 0 &&
      newCounts.medium > 0 &&
      newCounts.hard > 0
    ) {
      broadcastPreparationUpdate('ready-to-start', { questionsReady: true })
    }
  }

  const handleGenerateAllQuestions = async () => {
    // Check if loop data is available
    if (!loopData || loopError) {
      console.error('❌ Cannot generate questions: Loop data not available', {
        loopId,
        loopError: loopError?.message
      })
      alert('Cannot generate questions: The practice loop associated with this session is not available.')
      return
    }

    // Broadcast generation start
    if (permissions.canManageQuiz()) {
      broadcastPreparationUpdate('question-generation', { all: true, completed: false })
    }

    await generateAllQuestions(loopData)

    // Broadcast ready
    if (permissions.canManageQuiz()) {
      broadcastPreparationUpdate('ready-to-start', { questionsReady: true })
    }
  }

  const handleGenerateFromPreset = async (
    distribution: { easy: number; medium: number; hard: number },
    presetInfo: { id: string; name: string }
  ) => {
    console.log('📋 Page handleGenerateFromPreset called with:', {
      distribution,
      presetInfo,
      loopDataExists: !!loopData,
      loopDataId: loopData?.id,
      loopError: loopError?.message
    })

    // Check if loop data is available
    if (!loopData || loopError) {
      console.error('❌ Cannot generate questions: Loop data not available', {
        loopId,
        loopError: loopError?.message,
        sessionLoopData: (session as any)?.loop_data
      })
      alert('Cannot generate questions: The practice loop associated with this session is not available. Please check if the loop was deleted or contact your group admin.')
      return
    }

    // Broadcast preset selection and generation start
    if (permissions.canManageQuiz()) {
      broadcastPreparationUpdate('question-generation', {
        selectedPreset: { ...presetInfo, distribution },
        all: true,
        completed: false
      })
    }

    await generateFromPreset(loopData, distribution, presetInfo)

    // Broadcast ready
    if (permissions.canManageQuiz()) {
      broadcastPreparationUpdate('ready-to-start', { questionsReady: true })
    }
  }

  // Navigation handlers are now provided by useGroupQuizWithProgress

  // Simplified loading condition - only depend on appState
  if (appState === 'loading') {
    return <LoadingView message="Loading group quiz..." />
  }

  if (appState === 'error') {
    const isExpiredSession = (error as any)?.isExpired

    if (isExpiredSession) {
      return <ExpiredSessionView groupId={groupId} />
    }

    return (
      <ErrorView
        error={error?.message || 'An error occurred'}
        onRetry={() => window.location.reload()}
      />
    )
  }

  if (!isUserJoined) {
    return <NotJoinedView groupId={groupId} sessionId={sessionId} />
  }

  return (
    <>
      {/* Auth Prompt Modal */}
      {showAuthPrompt && (
        <AuthPrompt
          onClose={handleCloseAuthPrompt}
          onAuthSuccess={handleAuthSuccess}
          title="Join Group Quiz!"
          subtitle="Sign in to participate in this group quiz session and compare your results"
        />
      )}

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

      {/* Group Quiz Layout - Improved proportions */}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex h-screen">
          {/* Left Sidebar - Progress Tracking */}
          {appState === 'quiz-active' ? (
            <CompactProgressSidebar
              participants={progressParticipants}
              groupStats={groupStats}
              sessionStartTime={session?.started_at}
              currentUserId={user?.id}
            />
          ) : (
            <FallbackParticipantsSidebar
              participants={participants}
              onlineParticipants={onlineParticipants}
              user={user}
            />
          )}

          {/* Main Content - Quiz */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Session Header */}
            <GroupQuizSessionHeader
              session={session}
              participants={participants}
              user={user}
              isAuthenticated={isAuthenticated}
            />

            {/* Quiz Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                switch (appState) {
                  case 'preset-selection':
                    // Show different views based on user role
                    if (!permissions.canManageQuiz()) {
                      // Members see waiting view with dynamic state
                      return (
                        <MemberWaitingView
                          onlineParticipants={onlineParticipants}
                          sessionTitle={session?.quiz_title || 'Group Quiz Session'}
                          currentStep={syncState.currentStep}
                        />
                      )
                    }

                    // Owners/admins see full preset selection
                    return (
                      <div className="mx-auto max-w-6xl">
                        <GroupPresetSelectionView
                          onPresetSelect={handlePresetSelect}
                          onlineParticipants={onlineParticipants}
                          onGenerateQuestions={handleGenerateQuestions}
                          onGenerateAllQuestions={handleGenerateAllQuestions}
                          onGenerateFromPreset={handleGenerateFromPreset}
                          generatingState={generatingState}
                          generatedCounts={generatedCounts}
                          shareTokens={shareTokens}
                          onStartQuiz={handleStartQuiz}
                          currentPreset={currentPreset}
                          needsPresetReplacement={needsPresetReplacement}
                        />
                      </div>
                    )

                  case 'question-info':
                    return (
                      <div className="relative mx-auto max-w-4xl">
                        <QuestionInfoCard
                          difficultyGroups={difficultyGroups}
                          onStart={handleQuestionInfoStart}
                          sessionTitle={session?.title || 'Group Session'}
                        />
                        <CheckingResultsModal isOpen={isCheckingExistingResults} />
                      </div>
                    )

                  case 'question-preview':
                    return (
                      <div className="mx-auto max-w-8xl">
                        <GroupQuizPreview
                          difficultyGroups={difficultyGroups}
                          onStartQuiz={handleStartQuizFromPreview}
                          onGoBack={handleGoBackFromPreview}
                          canShowAnswers={permissions.canManageQuiz()}
                          sessionTitle={session?.quiz_title || session?.title || 'Group Quiz Session'}
                          quizSettings={groupSettings}
                        />
                      </div>
                    )

                  case 'quiz-active':
                    return (
                      <div className="mx-auto max-w-4xl">
                        <GroupQuizActiveView
                          currentQuestion={getCurrentQuestion()}
                          responses={responses}
                          onAnswerSelect={handleAnswerSelect}
                          onNextQuestion={moveToNextQuestion}
                          onSubmitSet={submitCurrentSet}
                          onMoveToNextSet={moveToNextSet}
                          isLastQuestion={isLastQuestionInSet()}
                          allAnswered={allQuestionsInSetAnswered()}
                          submitting={submitting}
                          currentSetIndex={currentSetIndex}
                          totalSets={difficultyGroups.length}
                          participants={participants}
                          onlineParticipants={onlineParticipants}
                          timeLimit={
                            groupSettings.enforceQuizTimeLimit
                              ? groupSettings.defaultQuizTimeLimit || 30
                              : null
                          }
                          allowQuestionSkipping={groupSettings.allowSkippingQuestions ?? false}
                          currentQuestionIndex={currentQuestionIndex}
                          quizSettings={groupSettings}
                          onNavigateToQuestion={handleNavigateToQuestion}
                          onNavigatePrevious={handleNavigatePrevious}
                          onNavigateNext={handleNavigateNext}
                          totalQuestionsInCurrentSet={getCurrentQuestion()?.groupData?.questions?.length || 0}
                        />
                      </div>
                    )

                  case 'quiz-results':
                    return (
                      <div className="mx-auto max-w-6xl">
                        <GroupQuizResults
                          results={results}
                          groupId={groupId}
                          sessionId={sessionId}
                          onRestart={handleRestart}
                          participants={participants}
                          showCorrectAnswers={groupSettings.showCorrectAnswers ?? true}
                          canRetakeQuiz={permissions.canRetakeQuiz()}
                        />
                      </div>
                    )

                  default:
                    return (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <h3 className="text-lg font-medium text-gray-800">Loading quiz...</h3>
                          <p className="mt-2 text-gray-600">Please wait while we prepare your session</p>
                        </div>
                      </div>
                    )
                }
              })()}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
    