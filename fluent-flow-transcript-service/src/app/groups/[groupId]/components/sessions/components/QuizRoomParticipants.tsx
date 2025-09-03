'use client'

import { Users } from 'lucide-react'
import { ParticipantList } from '../ParticipantList'
import type { SessionParticipant } from '../queries'

interface QuizRoomParticipantsProps {
  participants: SessionParticipant[]
  onlineParticipants: SessionParticipant[]
  currentUserId?: string
}

export function QuizRoomParticipants({ 
  participants, 
  onlineParticipants, 
  currentUserId 
}: QuizRoomParticipantsProps) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-800">
          Participants ({onlineParticipants.length}/{participants.length})
        </h3>
      </div>
      
      <ParticipantList 
        participants={participants} 
        currentUserId={currentUserId} 
      />
    </div>
  )
}