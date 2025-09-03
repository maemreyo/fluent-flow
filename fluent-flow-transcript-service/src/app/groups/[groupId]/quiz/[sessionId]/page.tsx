'use client'

import { use } from 'react'
import { AuthPrompt } from '../../../../../components/auth/AuthPrompt'
import { ErrorView } from '../../../../questions/[token]/components/ErrorView'
import { LoadingView } from '../../../../questions/[token]/components/LoadingView'
import { QuestionInfoView } from '../../../../questions/[token]/components/QuestionInfoView'
import { GroupPresetSelectionView } from './components/GroupPresetSelectionView'
import { GroupQuizActiveView } from './components/GroupQuizActiveView'
import { GroupQuizResults } from './components/GroupQuizResults'
import { useGroupQuiz } from './hooks/useGroupQuiz'

interface GroupQuizPageProps {
  params: Promise<{
    groupId: string
    sessionId: string
  }>
}

export default function GroupQuizPage({ params }: GroupQuizPageProps) {
  const { groupId, sessionId } = use(params)

  const {
    // Quiz state
    appState,
    questionSet,
    error,

    // Group context
    session,
    participants,
    onlineParticipants,
    isUserJoined,

    // Quiz functionality
    showAuthPrompt,
    handleAuthSuccess,
    handleCloseAuthPrompt,
    handlePresetSelect,
    getAvailableQuestionCounts,
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
    isAuthenticated
  } = useGroupQuiz({ groupId, sessionId })

  // Helper functions for participant display
  const getInitials = (email?: string | null, username?: string | null) => {
    if (username && username.trim()) {
      return username
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (email && email.includes('@')) {
      return email.split('@')[0].slice(0, 2).toUpperCase()
    }
    return '??'
  }

  const getDisplayName = (email?: string | null, username?: string | null) => {
    if (username && username.trim()) {
      return username.trim()
    }
    if (email && email.includes('@')) {
      return email.split('@')[0]
    }
    return 'Unknown User'
  }

  // Simplified loading condition - only depend on appState
  if (appState === 'loading') {
    return <LoadingView message="Loading group quiz..." />
  }

  if (appState === 'error') {
    // Check if it's an expired session error
    const isExpiredSession = (error as any)?.isExpired
    
    if (isExpiredSession) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="rounded-2xl border border-white/20 bg-white/80 p-8 text-center shadow-lg backdrop-blur-sm max-w-md">
            <div className="mb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Quiz Session Expired</h1>
              <p className="text-gray-600 leading-relaxed">
                This quiz session has expired and is no longer available. Please request a new session from the group organizer.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.href = `/groups/${groupId}`}
                className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                Back to Group
              </button>
              <button
                onClick={() => window.location.href = '/groups'}
                className="rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                All Groups
              </button>
            </div>
          </div>
        </div>
      )
    }
    
    return (
      <ErrorView
        error={error?.message || 'An error occurred'}
        onRetry={() => window.location.reload()}
      />
    )
  }

  if (!isUserJoined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="rounded-2xl border border-white/20 bg-white/80 p-8 text-center shadow-lg backdrop-blur-sm">
          <h1 className="mb-4 text-2xl font-bold text-gray-800">Group Quiz Session</h1>
          <p className="mb-6 text-gray-600">
            You need to join the quiz room first to participate in this group session.
          </p>
          <button
            onClick={() => window.history.back()}
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            Go Back to Quiz Room
          </button>
        </div>
      </div>
    )
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

      {/* Group Quiz Layout - Improved proportions */}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex h-screen">
          {/* Left Sidebar - Live Participants */}
          <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-white/20 bg-white/50 backdrop-blur-sm">
            <div className="border-b border-white/20 bg-white/60 p-4">
              <h2 className="flex items-center gap-2 font-semibold text-gray-800">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
                Live Participants
              </h2>
              <div className="mt-1 text-sm text-gray-600">
                {onlineParticipants.length} online • {participants.length} total
              </div>
            </div>

            <div className="space-y-3 p-4">
              {onlineParticipants.map(participant => (
                <div
                  key={participant.user_id}
                  className={`rounded-lg border p-3 transition-all ${
                    participant.user_id === user?.id
                      ? 'border-indigo-200 bg-indigo-50 shadow-sm'
                      : 'border-white/40 bg-white/60 hover:bg-white/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-sm font-semibold text-white">
                      {getInitials(participant.user_email, participant.username)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-gray-800">
                        {getDisplayName(participant.user_email, participant.username)}
                        {participant.user_id === user?.id && (
                          <span className="ml-1 text-xs text-indigo-600">(You)</span>
                        )}
                      </div>
                      {/* <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                        <span className="text-xs text-gray-500">Active now</span>
                      </div> */}
                    </div>
                  </div>
                </div>
              ))}

              {/* Offline participants */}
              {participants
                .filter(p => !p.is_online)
                .map(participant => (
                  <div
                    key={participant.user_id}
                    className="rounded-lg border border-gray-200/40 bg-gray-50/60 p-3"
                  >
                    <div className="flex items-center gap-2 opacity-60">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-sm font-semibold text-white">
                        {getInitials(participant.user_email, participant.username)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-gray-600">
                          {getDisplayName(participant.user_email, participant.username)}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-gray-400"></div>
                          <span className="text-xs text-gray-400">Offline</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Main Content - Quiz */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Session Header */}
            <div className="border-b border-white/20 bg-white/60 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="mb-1 text-xl font-bold text-gray-800">
                    {session?.quiz_title || 'Group Quiz Session'}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      Live Session
                    </span>
                    <span>{participants.length} participants</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user && (
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-800">{user.email || 'You'}</div>
                      <div className="text-xs text-gray-500">
                        {isAuthenticated ? 'Authenticated' : 'Guest'}
                      </div>
                    </div>
                  )}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 font-semibold text-white">
                    {(user?.email || 'U')[0].toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            {/* Quiz Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                switch (appState) {
                  case 'preset-selection':
                    return (
                      <div className="mx-auto max-w-6xl">
                        <GroupPresetSelectionView
                          questionSet={questionSet || null}
                          onPresetSelect={handlePresetSelect}
                          getAvailableQuestionCounts={getAvailableQuestionCounts}
                          participants={participants}
                          onlineParticipants={onlineParticipants}
                        />
                      </div>
                    )

                  case 'question-info':
                    return (
                      <div className="mx-auto max-w-4xl">
                        <QuestionInfoView
                          questionSet={questionSet || null}
                          onStart={handleQuestionInfoStart}
                          getAvailableQuestionCounts={getAvailableQuestionCounts}
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
