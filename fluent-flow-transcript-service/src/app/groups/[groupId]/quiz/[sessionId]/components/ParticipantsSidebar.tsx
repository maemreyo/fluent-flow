'use client'

import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Circle, Clock, Users, Minimize2, RefreshCcw } from 'lucide-react'
import { useState } from 'react'
import type { SessionParticipant } from '../../../components/sessions/queries'
import type { GroupSession } from '../queries'

interface ParticipantsSidebarProps {
  participants: SessionParticipant[]
  onlineParticipants: SessionParticipant[]
  currentUserId?: string
  session?: GroupSession
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function ParticipantsSidebar({ 
  participants, 
  onlineParticipants, 
  currentUserId, 
  session,
  onRefresh,
  isRefreshing = false
}: ParticipantsSidebarProps) {
  const [isMinimized, setIsMinimized] = useState(false)

  const getInitials = (email?: string | null, username?: string | null) => {
    if (username && username.trim()) {
      return username.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
    }
    if (email && email.includes('@')) {
      return email.split('@')[0].slice(0, 2).toUpperCase()
    }
    return '??'
  }

  const getDisplayName = (participant: SessionParticipant) => {
    if (participant.username && participant.username.trim()) {
      return participant.username.trim()
    }
    if (participant.user_email && participant.user_email.includes('@')) {
      return participant.user_email.split('@')[0]
    }
    return 'Unknown User'
  }

  const formatJoinTime = (joinedAt: string) => {
    const joinTime = new Date(joinedAt)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - joinTime.getTime()) / (1000 * 60))
    
    if (diffMinutes < 1) return 'Just joined'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    return joinTime.toLocaleDateString()
  }

  // Sort participants: current user first, then online users, then offline
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.user_id === currentUserId) return -1
    if (b.user_id === currentUserId) return 1
    
    if (a.is_online && !b.is_online) return -1
    if (!a.is_online && b.is_online) return 1
    
    return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime()
  })

  if (isMinimized) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg border border-white/20 hover:bg-white/95 transition-all"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">
              {onlineParticipants.length}/{participants.length}
            </span>
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className="w-80 bg-white/95 backdrop-blur-sm border-l border-white/20 shadow-lg flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-800">Participants</h3>
            <Badge variant="secondary" className="text-xs">
              {onlineParticipants.length}/{participants.length}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-1 hover:bg-indigo-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh participants list"
              >
                <RefreshCcw className={`w-4 h-4 text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
            
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <Minimize2 className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Session status */}
        {session && (
          <div className="mt-2 text-xs text-gray-600">
            Session: <span className="font-medium">{session.status}</span>
          </div>
        )}
      </div>

      {/* Participants list */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-3">
          {sortedParticipants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No participants yet</p>
            </div>
          ) : (
            sortedParticipants.map((participant) => (
              <div
                key={participant.user_id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                  participant.is_online 
                    ? 'bg-green-50/80 border-green-200/60 hover:bg-green-50' 
                    : 'bg-gray-50/80 border-gray-200/60 hover:bg-gray-50'
                } ${
                  participant.user_id === currentUserId 
                    ? 'ring-2 ring-indigo-500/30 border-indigo-200' 
                    : ''
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    participant.user_id === currentUserId
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                  }`}>
                    {getInitials(participant.user_email, participant.username)}
                  </div>
                  
                  {/* Online status indicator */}
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                    participant.is_online ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm text-gray-800 truncate">
                      {getDisplayName(participant)}
                    </p>
                    
                    {participant.user_id === currentUserId && (
                      <Badge className="text-xs bg-indigo-100 text-indigo-700 border-indigo-200 px-2 py-0">
                        You
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatJoinTime(participant.joined_at)}</span>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="flex-shrink-0">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    participant.is_online 
                      ? 'bg-green-100 text-green-700 border border-green-200' 
                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}>
                    <Circle className={`w-2 h-2 ${
                      participant.is_online ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'
                    }`} />
                    <span>{participant.is_online ? 'Online' : 'Offline'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200/50">
        <div className="text-xs text-gray-500 text-center">
          Real-time participant tracking
        </div>
      </div>
    </div>
  )
}