'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden bg-gradient-to-br from-slate-50/95 via-blue-50/95 to-indigo-50/95 backdrop-blur-xl border-white/20 shadow-2xl">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            Quiz Room - {session.quiz_title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto pr-2 max-h-[calc(95vh-100px)] custom-scrollbar">
          <GroupQuizRoom
            sessionId={sessionId}
            groupId={groupId}
            session={session}
            onJoinQuiz={handleJoinQuiz}
            onLeaveRoom={handleLeaveRoom}
          />
        </div>

        {/* Custom scrollbar styles */}
        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(99, 102, 241, 0.3);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(99, 102, 241, 0.5);
          }
        `}</style>
      </DialogContent>
    </Dialog>
  )
}