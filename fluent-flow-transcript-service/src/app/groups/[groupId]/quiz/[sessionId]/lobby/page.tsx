'use client'

import { use } from 'react'
import { PermissionManager } from '../../../../../../lib/permissions'
import { SessionCountdown } from '../components/sessions/SessionCountdown'
import { useQuizFlow } from '../shared/hooks/useQuizFlow'

interface LobbyPageProps {
  params: Promise<{
    groupId: string
    sessionId: string
  }>
}

export default function LobbyPage({ params }: LobbyPageProps) {
  const { groupId, sessionId } = use(params)

  const { session, group, user, onlineParticipants, navigateToInfo, navigateToSetup } = useQuizFlow(
    { groupId, sessionId }
  )

  // Permission management
  const permissions = new PermissionManager(user, group, session)

  // Calculate countdown if session is scheduled
  const getCountdown = () => {
    if (session?.scheduled_at && session.status === 'scheduled') {
      const scheduledTime = new Date(session.scheduled_at).getTime()
      const now = new Date().getTime()
      const timeUntilStart = Math.max(0, scheduledTime - now)
      return Math.floor(timeUntilStart / 1000)
    }
    return null
  }

  const countdown = getCountdown()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Session Title */}
      <div className="text-center">
        <h1 className="mb-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-4xl font-bold text-transparent">
          {session?.quiz_title || 'Group Quiz Session'}
        </h1>
        <p className="text-lg text-gray-600">Waiting for quiz to begin</p>
      </div>

      {/* Countdown Timer */}
      {countdown !== null && countdown > 0 && (
        <SessionCountdown
          seconds={countdown}
          onComplete={() => {
            console.log('⏰ Scheduled time reached, reloading to check status')
            window.location.reload()
          }}
        />
      )}

      {/* Participants List */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <h3 className="text-xl font-semibold text-gray-900">Session Participants</h3>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
            {onlineParticipants.length} online
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {onlineParticipants.map(participant => {
            console.log('🧑‍🤝‍🧑 Lobby participant:', participant)
            return (
              <div
                key={participant.user_id}
                className="flex items-center gap-3 rounded-lg bg-gray-50 p-3"
              >
                <div
                  className={`h-3 w-3 rounded-full ${
                    participant.is_online ? 'bg-green-400' : 'bg-gray-300'
                  }`}
                />
                <span className="font-medium text-gray-900">
                  {participant.username ||
                    participant.user_email?.split('@')[0] ||
                    `User ${participant.user_id?.slice(-4) || 'Unknown'}`}
                </span>
                <span
                  className={`ml-auto text-sm ${
                    participant.is_online ? 'text-green-600' : 'text-gray-500'
                  }`}
                >
                  {participant.is_online ? 'Online' : 'Offline'}
                </span>
              </div>
            )
          })}

          {onlineParticipants.length === 0 && (
            <div className="col-span-full rounded-lg bg-gray-50 p-6 text-center text-gray-500">
              No participants online yet
            </div>
          )}
        </div>
      </div>

      {/* Ready Status */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center">
        <h3 className="mb-2 text-lg font-semibold text-blue-800">Ready to Start</h3>
        <p className="mb-4 text-blue-600">
          {permissions.canManageQuiz() ? (
            <>
              You are the session organizer. You can start the quiz when ready, or go back to setup
              to configure questions.
            </>
          ) : (
            <>
              Waiting for the session organizer to begin the quiz. You'll be automatically
              redirected when it's time to start.
            </>
          )}
        </p>

        {/* Action buttons for Owner */}
        {permissions.canManageQuiz() && (
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => navigateToSetup()}
              className="rounded-lg bg-gray-600 px-6 py-2 text-white transition-colors hover:bg-gray-700"
            >
              ← Back to Setup
            </button>
            <button
              onClick={() => navigateToInfo()}
              className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Start Quiz Now →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
