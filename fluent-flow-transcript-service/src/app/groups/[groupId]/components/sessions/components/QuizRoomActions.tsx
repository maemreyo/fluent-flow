'use client'

import { Clock, Play, UserCheck, UserX } from 'lucide-react'

interface QuizRoomActionsProps {
  isUserJoined: boolean
  canStartQuiz: boolean
  isJoining: boolean
  isLeaving: boolean
  onJoinRoom: () => void
  onStartQuiz: () => void
  onLeaveRoom: () => void
}

export function QuizRoomActions({
  isUserJoined,
  canStartQuiz,
  isJoining,
  isLeaving,
  onJoinRoom,
  onStartQuiz,
  onLeaveRoom
}: QuizRoomActionsProps) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-800">Quiz Room Actions</h3>

      <div className="space-y-4">
        {!isUserJoined ? (
          <JoinRoomButton isJoining={isJoining} onJoin={onJoinRoom} />
        ) : (
          <JoinedRoomActions
            canStartQuiz={canStartQuiz}
            isLeaving={isLeaving}
            onStartQuiz={onStartQuiz}
            onLeaveRoom={onLeaveRoom}
          />
        )}
      </div>
    </div>
  )
}

function JoinRoomButton({ isJoining, onJoin }: { isJoining: boolean; onJoin: () => void }) {
  return (
    <button
      onClick={onJoin}
      disabled={isJoining}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <UserCheck className="h-4 w-4" />
      {isJoining ? 'Joining...' : 'Join Quiz Room'}
    </button>
  )
}

function JoinedRoomActions({
  canStartQuiz,
  isLeaving,
  onStartQuiz,
  onLeaveRoom
}: {
  canStartQuiz: boolean
  isLeaving: boolean
  onStartQuiz: () => void
  onLeaveRoom: () => void
}) {
  return (
    <div className="space-y-3">
      {/* Joined Status */}
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
        <UserCheck className="mx-auto mb-2 h-5 w-5 text-green-600" />
        <p className="font-medium text-green-800">You've joined the quiz room!</p>
        <p className="text-sm text-green-600">Wait for the session to start</p>
      </div>

      {/* Start Quiz Button */}
      {canStartQuiz ? (
        <button
          onClick={onStartQuiz}
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

      {/* Leave Room Button */}
      <button
        onClick={onLeaveRoom}
        disabled={isLeaving}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <UserX className="h-4 w-4" />
        {isLeaving ? 'Leaving...' : 'Leave Room'}
      </button>
    </div>
  )
}