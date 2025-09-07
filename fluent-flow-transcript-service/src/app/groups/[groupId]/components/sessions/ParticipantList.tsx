'use client'

import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Users, 
  Circle,
  Clock
} from 'lucide-react'

interface SessionParticipant {
  user_id: string
  user_email: string
  username?: string
  avatar?: string
  joined_at: string
  is_online: boolean
  last_seen: string
}

interface ParticipantListProps {
  participants: SessionParticipant[]
  currentUserId?: string
}

export function ParticipantList({ participants, currentUserId }: ParticipantListProps) {
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

  const getInitials = (email: string, username?: string) => {
    if (username && username.trim()) {
      return username.trim().split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
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
    return `User ${participant.user_id?.slice(-4) || 'Unknown'}`
  }

  // Sort participants: current user first, then online users, then offline
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.user_id === currentUserId) return -1
    if (b.user_id === currentUserId) return 1
    
    if (a.is_online && !b.is_online) return -1
    if (!a.is_online && b.is_online) return 1
    
    return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime()
  })

  if (participants.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Users className="w-8 h-8 mx-auto mb-3 opacity-50" />
        <h4 className="font-medium text-gray-600 mb-1">No participants yet</h4>
        <p className="text-sm">Join the room to see other members</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-64 pr-4">
      <div className="space-y-3">
        {sortedParticipants.map((participant) => (
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
            <div className="relative">
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
                  <Badge className="text-xs bg-indigo-100 text-indigo-700 border-indigo-200">
                    You
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{formatJoinTime(participant.joined_at)}</span>
              </div>
            </div>

            {/* Status badge */}
            <div className="flex flex-col items-end">
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
        ))}
      </div>
    </ScrollArea>
  )
}