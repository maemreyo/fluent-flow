'use client'

import { useState } from 'react'
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
  canManageQuiz?: boolean // Add permission prop
}

export function GroupQuizRoomModal({
  isOpen,
  onClose,
  sessionId,
  groupId,
  session,
  canManageQuiz = false
}: GroupQuizRoomModalProps) {
  const [isQuizStarting, setIsQuizStarting] = useState(false)

  const handleJoinQuiz = () => {
    // Set quiz starting state to prevent accidental modal closure
    setIsQuizStarting(true)
    
    // Close modal when user joins the actual quiz
    setTimeout(() => {
      onClose()
      setIsQuizStarting(false)
    }, 100) // Small delay to ensure smooth transition
  }

  const handleLeaveRoom = () => {
    // Only close if quiz is not starting
    if (!isQuizStarting) {
      onClose()
    }
  }

  const handleModalClose = () => {
    // Prevent closing modal during quiz start sequence
    if (!isQuizStarting) {
      onClose()
    }
  }

  return (
    <FullscreenModal
      isOpen={isOpen}
      onClose={handleModalClose}
      closeOnBackdropClick={!isQuizStarting} // Prevent backdrop close during quiz start
      className="w-[95vw] max-w-4xl border-white/20 bg-gradient-to-br from-slate-50/95 via-blue-50/95 to-indigo-50/95 shadow-2xl backdrop-blur-xl"
    >
      <div className="p-6">
        <div className="pb-4 flex items-center justify-between">
          <h2 className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-2xl font-bold text-transparent">
            Quiz Room
          </h2>
          {isQuizStarting && (
            <div className="flex items-center gap-2 text-green-600">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-600"></div>
              <span className="text-sm font-medium">Starting Quiz...</span>
            </div>
          )}
        </div>

        <div className="max-h-[calc(95vh-8rem)] overflow-y-auto">
          <GroupQuizRoom
            sessionId={sessionId}
            groupId={groupId}
            session={session}
            onJoinQuiz={handleJoinQuiz}
            onLeaveRoom={handleLeaveRoom}
            canManageQuiz={canManageQuiz}
          />
        </div>
      </div>
    </FullscreenModal>
  )
}
