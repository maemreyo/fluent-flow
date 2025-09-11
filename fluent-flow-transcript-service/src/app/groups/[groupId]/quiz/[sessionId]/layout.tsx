'use client'

import React, { ReactNode } from 'react'
import { AuthPrompt } from '../../../../../components/auth/AuthPrompt'
import { CompactProgressSidebar } from '../../../../../components/groups/progress/CompactProgressSidebar'
import { CheckingResultsModal } from '../../../../../components/groups/quiz/CheckingResultsModal'
import { ExistingResultsModal } from '../../../../../components/groups/quiz/ExistingResultsModal'
import { FallbackParticipantsSidebar } from './components/FallbackParticipantsSidebar'
import { GroupQuizSessionHeader } from './components/GroupQuizSessionHeader'
import { useQuizFlow } from './shared/hooks/useQuizFlow'

interface QuizLayoutProps {
  children: ReactNode
  params: Promise<{
    groupId: string
    sessionId: string
  }>
}

export default function QuizLayout({ children, params }: QuizLayoutProps) {
  const resolvedParams = React.use(params)
  const { groupId, sessionId } = resolvedParams

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
    user,
    isAuthenticated,
    participantsRefreshing,
    refreshParticipants,
    
    // Auth functionality
    showAuthPrompt,
    handleAuthSuccess,
    handleCloseAuthPrompt,

    // Progress tracking data (for active quiz)
    progressParticipants,
    groupStats,

    // Existing results modal data
    existingResults,
    showExistingResultsModal,
    isCheckingExistingResults,
    handleGoBackToPresets,
    handleStartFresh,
    handleCloseModal
  } = useQuizFlow({ groupId, sessionId })

  if (appState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-800">Loading quiz session...</h3>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-red-600">Error loading quiz session</h3>
          <p className="text-gray-600 mt-2">{String(error)}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!isUserJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Join Quiz Session</h3>
            <p className="text-gray-600 mb-6">You need to join this quiz session to participate.</p>
            <button className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
              Join Session
            </button>
          </div>
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

      {/* Quiz Layout */}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex h-screen">
          {/* Left Sidebar - Progress Tracking or Participants */}
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
              onRefresh={refreshParticipants}
              isRefreshing={participantsRefreshing}
            />
          )}

          {/* Main Content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Session Header */}
            <GroupQuizSessionHeader
              session={session}
              participants={participants}
              user={user}
              isAuthenticated={isAuthenticated}
            />

            {/* Page Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Checking Results Modal */}
      <CheckingResultsModal isOpen={isCheckingExistingResults} />
    </>
  )
}