'use client'

import { use, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AuthPrompt } from '../../../../../components/auth/AuthPrompt'
import { CompactProgressSidebar } from '../../../../../components/groups/progress/CompactProgressSidebar'
import { CheckingResultsModal } from '../../../../../components/groups/quiz/CheckingResultsModal'
import { ExistingResultsModal } from '../../../../../components/groups/quiz/ExistingResultsModal'
import { useLoop } from '../../../../../hooks/useLoops'
import { getAuthHeaders } from '../../../../../lib/supabase/auth-utils'
import { ErrorView } from '../../../../questions/[token]/components/ErrorView'
import { LoadingView } from '../../../../questions/[token]/components/LoadingView'
import { QuestionInfoView } from '../../../../questions/[token]/components/QuestionInfoView'
import { GroupPresetSelectionView } from './components/GroupPresetSelectionView'
import { GroupQuizActiveView } from './components/GroupQuizActiveView'
import { GroupQuizResults } from './components/GroupQuizResults'
import { useGroupQuizWithProgress } from './hooks/useGroupQuizWithProgress'

interface GroupQuizPageProps {
  params: Promise<{
    groupId: string
    sessionId: string
  }>
}

export default function GroupQuizPage({ params }: GroupQuizPageProps) {
  const { groupId, sessionId } = use(params)

  // Question generation state
  const [generatingState, setGeneratingState] = useState({
    easy: false,
    medium: false,
    hard: false,
    all: false
  })

  const [generatedCounts, setGeneratedCounts] = useState({
    easy: 0,
    medium: 0,
    hard: 0
  })

  // Single difficulty question generation mutation
  const generateQuestionsMutation = useMutation({
    mutationFn: async ({
      difficulty,
      loop
    }: {
      difficulty: 'easy' | 'medium' | 'hard'
      loop: any
    }) => {
      console.log(`Generating ${difficulty} questions for loop:`, loop)

      if (!loop) {
        throw new Error('No loop data available')
      }

      const headers = await getAuthHeaders()
      const response = await fetch('/api/questions/generate', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transcript: loop.transcript,
          loop: {
            id: loop.id,
            videoTitle: loop.videoTitle || loop.title,
            startTime: loop.startTime || 0,
            endTime: loop.endTime || 0
          },
          segments: loop.segments,
          difficulty: difficulty,
          saveToDatabase: true,
          groupId: groupId,
          sessionId: sessionId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to generate ${difficulty} questions`)
      }

      const result = await response.json()
      return {
        difficulty,
        questions: result.data.questions,
        count: result.data.questions.length
      }
    },
    onMutate: ({ difficulty }) => {
      // Set loading state for specific difficulty
      setGeneratingState(prev => ({ ...prev, [difficulty]: true }))
    },
    onSuccess: data => {
      console.log(`Successfully generated ${data.count} ${data.difficulty} questions`)
      // Update generated counts
      setGeneratedCounts(prev => ({
        ...prev,
        [data.difficulty]: data.count
      }))

      // TODO: Store questions in state or database for quiz usage

      // Clear loading state
      setGeneratingState(prev => ({ ...prev, [data.difficulty]: false }))
    },
    onError: (error: any, { difficulty }) => {
      console.error(`Failed to generate ${difficulty} questions:`, error)

      // Clear loading state
      setGeneratingState(prev => ({ ...prev, [difficulty]: false }))

      // TODO: Show error toast/notification
      alert(`Failed to generate ${difficulty} questions: ${error.message}`)
    }
  })

  // Generate all questions mutation
  const generateAllQuestionsMutation = useMutation({
    mutationFn: async ({ loop }: { loop: any }) => {
      console.log('Generating all questions for loop:', loop?.id)

      if (!loop) {
        throw new Error('No loop data available')
      }

      // Generate all difficulty levels in parallel
      const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard']

      const promises = difficulties.map(async difficulty => {
        const headers = await getAuthHeaders()
        const response = await fetch('/api/questions/generate', {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            transcript: loop.transcript,
            loop: {
              id: loop.id,
              videoTitle: loop.videoTitle || loop.title,
              startTime: loop.startTime || loop.start_time,
              endTime: loop.endTime || loop.end_time
            },
            segments: loop.segments,
            difficulty: difficulty,
            saveToDatabase: true,
            groupId: groupId,
            sessionId: sessionId
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`Failed to generate ${difficulty} questions: ${errorData.error}`)
        }

        const result = await response.json()
        return {
          difficulty,
          questions: result.data.questions,
          count: result.data.questions.length
        }
      })

      const results = await Promise.all(promises)
      return results
    },
    onMutate: () => {
      // Set loading state for all
      setGeneratingState(prev => ({ ...prev, all: true }))
    },
    onSuccess: results => {
      console.log('Successfully generated all questions:', results)

      // Update all generated counts
      const newCounts = { easy: 0, medium: 0, hard: 0 }
      results.forEach(result => {
        newCounts[result.difficulty] = result.count
      })
      setGeneratedCounts(newCounts)

      // Clear loading state
      setGeneratingState(prev => ({ ...prev, all: false }))
    },
    onError: (error: any) => {
      console.error('Failed to generate all questions:', error)

      // Clear loading state
      setGeneratingState(prev => ({ ...prev, all: false }))

      // TODO: Show error toast/notification
      alert(`Failed to generate all questions: ${error.message}`)
    }
  })

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
  const { data: loopData, isLoading: loopLoading, error: loopError } = useLoop(groupId, loopId)

  // Question generation handlers
  const handleGenerateQuestions = async (difficulty: 'easy' | 'medium' | 'hard') => {
    if (!loopData) {
      alert('No loop data available for question generation')
      return
    }

    // Transform loopData to the format expected by the API
    const loop = {
      id: loopData.id,
      videoTitle: loopData.videoTitle || 'Practice Session',
      startTime: loopData.startTime || 0,
      endTime: loopData.endTime || 300,
      transcript: loopData.transcript || '',
      segments: loopData.segments || []
    }

    await generateQuestionsMutation.mutateAsync({ difficulty, loop })
  }

  const handleGenerateAllQuestions = async () => {
    if (!loopData) {
      alert('No loop data available for question generation')
      return
    }

    // Transform loopData to the format expected by the API
    const loop = {
      id: loopData.id,
      videoTitle: loopData.videoTitle || 'Practice Session',
      startTime: loopData.startTime || 0,
      endTime: loopData.endTime || 300,
      transcript: loopData.transcript || '',
      segments: loopData.segments || []
    }

    await generateAllQuestionsMutation.mutateAsync({ loop })
  }

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
          <div className="max-w-md rounded-2xl border border-white/20 bg-white/80 p-8 text-center shadow-lg backdrop-blur-sm">
            <div className="mb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
              </div>
              <h1 className="mb-2 text-2xl font-bold text-gray-800">Quiz Session Expired</h1>
              <p className="leading-relaxed text-gray-600">
                This quiz session has expired and is no longer available. Please request a new
                session from the group organizer.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => (window.location.href = `/groups/${groupId}`)}
                className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                Back to Group
              </button>
              <button
                onClick={() => (window.location.href = '/groups')}
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
            // Fallback sidebar for non-active states
            <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-white/20 bg-white/50 backdrop-blur-sm">
              <div className="border-b border-white/20 bg-white/60 p-4">
                <h2 className="flex items-center gap-2 font-semibold text-gray-800">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
                  Participants
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
                      </div>
                    </div>
                  </div>
                ))}

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
          )}

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
                          onPresetSelect={handlePresetSelect}
                          onlineParticipants={onlineParticipants}
                          onGenerateQuestions={handleGenerateQuestions}
                          onGenerateAllQuestions={handleGenerateAllQuestions}
                          generatingState={generatingState}
                          generatedCounts={generatedCounts}
                        />
                      </div>
                    )

                  case 'question-info':
                    return (
                      <div className="relative mx-auto max-w-4xl">
                        <QuestionInfoView
                          questionSet={questionSet || null}
                          onStart={handleQuestionInfoStart}
                          getAvailableQuestionCounts={getAvailableQuestionCounts}
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
