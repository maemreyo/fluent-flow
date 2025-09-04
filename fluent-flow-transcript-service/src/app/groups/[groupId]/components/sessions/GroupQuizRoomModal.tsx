'use client'

import { FullscreenModal } from '@/components/ui/dialog'
import { GroupQuizRoom } from './GroupQuizRoom'

interface GroupQuizRoomModalProps {
  isOpen: boolean
  onClose: () => void
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
}

export function GroupQuizRoomModal({
  isOpen,
  onClose,
  sessionId,
  groupId,
  session
}: GroupQuizRoomModalProps) {
  const handleJoinQuiz = () => {
    // Close modal when user joins the actual quiz
    onClose()
  }

  const handleLeaveRoom = () => {
    // Close modal when user leaves
    onClose()
  }

  return (
    <FullscreenModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-4xl w-[95vw] bg-gradient-to-br from-slate-50/95 via-blue-50/95 to-indigo-50/95 backdrop-blur-xl border-white/20 shadow-2xl"
    >
      <div className="p-6">
        <div className="pb-4">
          <h2 className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-2xl font-bold text-transparent">
            Quiz Room - {session.quiz_title}
          </h2>
        </div>

        <div className="max-h-[calc(95vh-8rem)] overflow-y-auto">
          <GroupQuizRoom
            sessionId={sessionId}
            groupId={groupId}
            session={session}
            onJoinQuiz={handleJoinQuiz}
            onLeaveRoom={handleLeaveRoom}
          />
        </div>
      </div>
    </FullscreenModal>
  )
}
