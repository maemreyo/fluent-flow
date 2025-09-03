'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../../contexts/AuthContext'
import { QuizRoomLobby } from './QuizRoomLobby'
import { SessionCountdown } from './SessionCountdown'
import { useSessionParticipants } from './hooks/useSessionParticipants'
import { QuizRoomHeader } from './components/QuizRoomHeader'
import { QuizRoomParticipants } from './components/QuizRoomParticipants'
import { QuizRoomActions } from './components/QuizRoomActions'

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
      <QuizRoomHeader session={session} />

      {/* Countdown Timer */}
      {countdown !== null && countdown > 0 && (
        <SessionCountdown seconds={countdown} onComplete={() => window.location.reload()} />
      )}

      {/* Quiz Room Main Content */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Participants Panel */}
        <QuizRoomParticipants
          participants={participants}
          onlineParticipants={onlineParticipants}
          currentUserId={user?.id}
        />

        {/* Action Panel */}
        <QuizRoomActions
          isUserJoined={isUserJoined}
          canStartQuiz={canStartQuiz}
          isJoining={isJoining}
          isLeaving={isLeaving}
          onJoinRoom={handleJoinRoom}
          onStartQuiz={handleStartQuiz}
          onLeaveRoom={handleLeaveRoom}
        />
      </div>

      {/* Lobby for scheduled sessions */}
      {session.status === 'scheduled' && isUserJoined && (
        <QuizRoomLobby session={session} participants={onlineParticipants} countdown={countdown} />
      )}
    </div>
  )
}