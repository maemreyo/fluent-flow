'use client'

import { useEffect, useState } from 'react'
import { Calendar, Clock, Play, UserCheck, Users, UserX, Video } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '../../../../../contexts/AuthContext'
import { ParticipantList } from './ParticipantList'
import { QuizRoomLobby } from './QuizRoomLobby'
import { SessionCountdown } from './SessionCountdown'
import { useSessionParticipants } from './hooks/useSessionParticipants'

interface GroupQuizRoomProps {
  sessionId: string
  groupId: string
  session: {
    id: string
    quiz_title: string
    video_title?: string
    video_url?: string
    scheduled_at?: string
    status: 'scheduled' | 'active' | 'completed' | 'cancelled'
    quiz_token: string
    created_by: string
    questions_data?: any
  }
  onJoinQuiz: () => void
  onLeaveRoom: () => void
}

export function GroupQuizRoom({
  sessionId,
  groupId,
  session,
  onJoinQuiz,
  onLeaveRoom
}: GroupQuizRoomProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [countdown, setCountdown] = useState<number | null>(null)

  // Use the custom hook for participants management
  const {
    participants,
    onlineParticipants,
    isUserJoined,
    isLoading,
    joinSession,
    leaveSession,
    isJoining,
    isLeaving
  } = useSessionParticipants({
    groupId,
    sessionId,
    userId: user?.id
  })

  // Calculate time until session starts
  useEffect(() => {
    if (session.scheduled_at && session.status === 'scheduled') {
      const scheduledTime = new Date(session.scheduled_at).getTime()
      const now = new Date().getTime()
      const timeUntilStart = Math.max(0, scheduledTime - now)

      if (timeUntilStart > 0) {
        setCountdown(Math.floor(timeUntilStart / 1000))

        const timer = setInterval(() => {
          const remaining = Math.max(0, scheduledTime - new Date().getTime())
          setCountdown(Math.floor(remaining / 1000))

          if (remaining <= 0) {
            clearInterval(timer)
            window.location.reload()
          }
        }, 1000)

        return () => clearInterval(timer)
      }
    }
  }, [session.scheduled_at, session.status])

  const handleJoinRoom = () => {
    if (!user) {
      return // Hook will handle the error
    }
    joinSession()
  }

  const handleLeaveRoom = () => {
    leaveSession()
    onLeaveRoom()
  }

  const handleStartQuiz = () => {
    const quizUrl = `/groups/${groupId}/quiz/${sessionId}`
    onJoinQuiz()
    router.push(quizUrl)
  }

  const canStartQuiz =
    session.status === 'active' || (session.status === 'scheduled' && countdown === 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <div className="rounded-2xl border border-white/20 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
        <div className="mb-4 flex items-start justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-800">{session.quiz_title}</h2>
            {session.video_title && (
              <div className="flex items-center gap-2 text-gray-600">
                <Video className="h-4 w-4" />
                <span>{session.video_title}</span>
              </div>
            )}
          </div>
          <Badge
            className={
              session.status === 'active'
                ? 'border-green-200 bg-green-100 text-green-800'
                : session.status === 'scheduled'
                  ? 'border-blue-200 bg-blue-100 text-blue-800'
                  : 'border-gray-200 bg-gray-100 text-gray-600'
            }
          >
            {session.status}
          </Badge>
        </div>

        {session.scheduled_at && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Scheduled: {new Date(session.scheduled_at).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Countdown Timer */}
      {countdown !== null && countdown > 0 && (
        <SessionCountdown seconds={countdown} onComplete={() => window.location.reload()} />
      )}

      {/* Quiz Room Status */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Participants Panel */}
        <div className="rounded-2xl border border-white/20 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Participants ({onlineParticipants.length}/{participants.length})
            </h3>
          </div>
          <ParticipantList participants={participants} currentUserId={user?.id} />
        </div>

        {/* Action Panel */}
        <div className="rounded-2xl border border-white/20 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-800">Quiz Room Actions</h3>

          <div className="space-y-4">
            {!isUserJoined ? (
              <button
                onClick={handleJoinRoom}
                disabled={isJoining}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserCheck className="h-4 w-4" />
                {isJoining ? 'Joining...' : 'Join Quiz Room'}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
                  <UserCheck className="mx-auto mb-2 h-5 w-5 text-green-600" />
                  <p className="font-medium text-green-800">You've joined the quiz room!</p>
                  <p className="text-sm text-green-600">Wait for the session to start</p>
                </div>

                {canStartQuiz ? (
                  <button
                    onClick={handleStartQuiz}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:from-green-700 hover:to-emerald-700"
                  >
                    <Play className="h-4 w-4" />
                    Start Quiz
                  </button>
                ) : (
                  <button
                    disabled
                    className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-gray-100 px-6 py-3 font-semibold text-gray-500"
                  >
                    <Clock className="h-4 w-4" />
                    Waiting for Session Start
                  </button>
                )}

                <button
                  onClick={handleLeaveRoom}
                  disabled={isLeaving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserX className="h-4 w-4" />
                  {isLeaving ? 'Leaving...' : 'Leave Room'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lobby for scheduled sessions */}
      {session.status === 'scheduled' && isUserJoined && (
        <QuizRoomLobby session={session} participants={onlineParticipants} countdown={countdown} />
      )}
    </div>
  )
}