'use client'

import { Users, RefreshCcw } from 'lucide-react'
import { ParticipantList } from '../ParticipantList'
import type { SessionParticipant } from '../queries'

interface QuizRoomParticipantsProps {
  participants: SessionParticipant[]
  onlineParticipants: SessionParticipant[]
  currentUserId?: string
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function QuizRoomParticipants({ 
  participants, 
  onlineParticipants, 
  currentUserId,
  onRefresh,
  isRefreshing = false
}: QuizRoomParticipantsProps) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-800">
            Participants ({onlineParticipants.length}/{participants.length})
          </h3>
        </div>
        
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 transition-colors hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh participants list"
          >
            <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
      
      <ParticipantList 
        participants={participants} 
        currentUserId={currentUserId} 
      />
    </div>
  )
}