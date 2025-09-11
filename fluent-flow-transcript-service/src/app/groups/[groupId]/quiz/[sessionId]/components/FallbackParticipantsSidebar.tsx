'use client'

import { RefreshCcw } from 'lucide-react'
import { getDisplayName, getInitials } from '../utils/participantUtils'

interface FallbackParticipantsSidebarProps {
  participants: any[]
  onlineParticipants: any[]
  user: any
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function FallbackParticipantsSidebar({
  participants,
  onlineParticipants,
  user,
  onRefresh,
  isRefreshing = false
}: FallbackParticipantsSidebarProps) {
  // Debug participant data
  // console.log('🧑‍🤝‍🧑 FallbackParticipantsSidebar debug:', {
  //   participants: participants.map(p => ({
  //     user_id: p.user_id,
  //     user_email: p.user_email,
  //     username: p.username,
  //     is_online: p.is_online
  //   })),
  //   onlineParticipants: onlineParticipants.map(p => ({
  //     user_id: p.user_id,
  //     user_email: p.user_email,
  //     username: p.username,
  //     is_online: p.is_online
  //   }))
  // })

  return (
    <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-white/20 bg-white/50 backdrop-blur-sm">
      <div className="border-b border-white/20 bg-white/60 p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-gray-800">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
            Participants
          </h2>
          
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 transition-colors hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh participants list"
            >
              <RefreshCcw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
        
        <div className="mt-1 text-sm text-gray-600">
          {onlineParticipants.length} online • {participants.length} total
        </div>
      </div>

      <div className="space-y-3 p-4">
        {onlineParticipants.map(participant => (
          <div
            key={participant.user_id}
            className={`rounded-lg border p-3 transition-all ${
              participant.user_id === user?.id
                ? 'border-indigo-200 bg-indigo-50 shadow-sm'
                : 'border-white/40 bg-white/60 hover:bg-white/80'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-sm font-semibold text-white">
                {getInitials(participant.user_email, participant.username)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-gray-800">
                  {getDisplayName(participant.user_email, participant.username)}
                  {participant.user_id === user?.id && (
                    <span className="ml-1 text-xs text-indigo-600">(You)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {participants
          .filter(p => !p.is_online)
          .map(participant => (
            <div
              key={participant.user_id}
              className="rounded-lg border border-gray-200/40 bg-gray-50/60 p-3"
            >
              <div className="flex items-center gap-2 opacity-60">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-sm font-semibold text-white">
                  {getInitials(participant.user_email, participant.username)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-600">
                    {getDisplayName(participant.user_email, participant.username)}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-gray-400"></div>
                    <span className="text-xs text-gray-400">Offline</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
