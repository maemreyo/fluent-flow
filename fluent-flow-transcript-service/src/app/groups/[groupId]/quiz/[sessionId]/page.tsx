'use client'

import { use, useCallback } from 'react'
import { AuthPrompt } from '../../../../../components/auth/AuthPrompt'
import { CompactProgressSidebar } from '../../../../../components/groups/progress/CompactProgressSidebar'
import { CheckingResultsModal } from '../../../../../components/groups/quiz/CheckingResultsModal'
import { ExistingResultsModal } from '../../../../../components/groups/quiz/ExistingResultsModal'
import { useLoop, useSessionQuestions } from '../../../../../hooks/useLoops'
import { ErrorView } from '../../../../questions/[token]/components/ErrorView'
import { LoadingView } from '../../../../questions/[token]/components/LoadingView'
import { GroupPresetSelectionView } from './components/GroupPresetSelectionView'
import { GroupQuizActiveView } from './components/GroupQuizActiveView'
import { GroupQuizResults } from './components/GroupQuizResults'
import { QuestionInfoCard } from '../../../../../components/groups/quiz/QuestionInfoCard'
import { GroupQuizSessionHeader } from './components/GroupQuizSessionHeader'
import { ExpiredSessionView } from './components/ExpiredSessionView'
import { NotJoinedView } from './components/NotJoinedView'
import { FallbackParticipantsSidebar } from './components/FallbackParticipantsSidebar'
import { MemberWaitingView } from './components/MemberWaitingView'
import { useGroupQuizWithProgress } from './hooks/useGroupQuizWithProgress'
import { useGroupQuestionGeneration } from './hooks/useQuestionGeneration'
import { useQuizStartup } from './hooks/useQuizStartup'
import { useQuizSync } from './hooks/useQuizSync'
import { PermissionManager } from '../../../../../lib/permissions'

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
    handleCloseModal
  } = useGroupQuizWithProgress({ groupId, sessionId })

  const loopId = (session as any)?.loop_data?.id
  const { data: loopData } = useLoop(groupId, loopId)
  
  // Load existing questions for this session
  const { data: sessionQuestions } = useSessionQuestions(groupId, sessionId)

  // Role-based permissions
  const permissions = new PermissionManager(user, group, session)

  // Simplified quiz synchronization
  const {
    syncState,
    isConnected: syncConnected,
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
  const handleStartQuiz = useCallback(async (shareTokens: Record<string, string>) => {
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
  }, [originalHandleStartQuiz, permissions.canManageQuiz(), broadcastQuizSessionStart])

  // Simplified question generation handlers
  const handleGenerateQuestions = async (difficulty: 'easy' | 'medium' | 'hard') => {
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
    if (permissions.canManageQuiz() && newCounts.easy > 0 && newCounts.medium > 0 && newCounts.hard > 0) {
      broadcastPreparationUpdate('ready-to-start', { questionsReady: true })
    }
  }

  const handleGenerateAllQuestions = async () => {
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
    return <NotJoinedView />
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
                          sessionTitle={session?.quiz_title || "Group Quiz Session"}
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
                        />
                      </div>
                    )

                  case 'quiz-results':
                    return (
                      <div className="mx-auto max-w-2xl">
                        <GroupQuizResults
                          results={results}
                          groupId={groupId}
                          sessionId={sessionId}
                          onRestart={handleRestart}
                          participants={participants}
                        />
                      </div>
                    )

                  default:
                    return (
                      <div className="flex h-64 items-center justify-center">
                        <LoadingView message="Initializing quiz..." />
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
