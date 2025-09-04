'use client'

import { 
  Users, 
  Clock, 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  PlayCircle,
  UserCheck,
  Timer,
  Award,
  Activity,
  AlertCircle
} from 'lucide-react'
import { Badge } from '../../ui/badge'
import type { ProgressData } from './ParticipantProgressCard'

interface CompactProgressSidebarProps {
  participants: ProgressData[]
  groupStats: {
    totalParticipants: number
    onlineCount: number
    completedCount: number
    inProgressCount: number
    averageProgress: number
    averageAccuracy: number
  }
  sessionStartTime?: string
  currentUserId?: string
}

export function CompactProgressSidebar({ 
  participants, 
  groupStats,
  sessionStartTime,
  currentUserId
}: CompactProgressSidebarProps) {
  
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const sessionDuration = sessionStartTime 
    ? Math.floor((Date.now() - new Date(sessionStartTime).getTime()) / 1000)
    : 0

  const getInitials = (email?: string | null, username?: string | null) => {
    if (username && username.trim()) {
      return username
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (email && email.includes('@')) {
      return email.split('@')[0].slice(0, 2).toUpperCase()
    }
    return '??'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-3 w-3 text-green-600" />
      case 'in_progress': return <PlayCircle className="h-3 w-3 text-blue-600" />
      case 'paused': return <Timer className="h-3 w-3 text-yellow-600" />
      default: return <AlertCircle className="h-3 w-3 text-gray-400" />
    }
  }

  return (
    <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-white/20 bg-white/50 backdrop-blur-sm">
      {/* Header */}
      <div className="border-b border-white/20 bg-white/60 p-3">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-4 w-4 text-green-500 animate-pulse" />
          <span className="font-semibold text-gray-800 text-sm">Live Progress</span>
        </div>
        <div className="text-xs text-gray-600">
          {groupStats.inProgressCount} active • {groupStats.averageProgress}% avg
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/60 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-3 w-3 text-indigo-600" />
              <span className="text-xs font-medium text-gray-700">Online</span>
            </div>
            <div className="text-lg font-bold text-gray-800">{groupStats.onlineCount}</div>
          </div>
          
          <div className="bg-white/60 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium text-gray-700">Time</span>
            </div>
            <div className="text-lg font-bold text-gray-800">{formatDuration(sessionDuration)}</div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="bg-white/60 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-800">Group Progress</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Average</span>
              <span>{groupStats.averageProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${groupStats.averageProgress}%` }}
              />
            </div>
            
            <div className="flex justify-between text-xs">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                <span className="text-gray-600">{groupStats.completedCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <PlayCircle className="h-3 w-3 text-blue-600" />
                <span className="text-gray-600">{groupStats.inProgressCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-orange-600" />
                <span className="text-gray-600">{groupStats.averageAccuracy}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Individual Participants */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Participants</span>
          </div>
          
          {participants
            .sort((a, b) => {
              // Current user first, then by progress
              if (a.user_id === currentUserId) return -1
              if (b.user_id === currentUserId) return 1
              return b.completion_percentage - a.completion_percentage
            })
            .map(participant => (
            <div
              key={participant.user_id}
              className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                participant.user_id === currentUserId
                  ? 'border border-indigo-200 bg-indigo-50'
                  : 'bg-white/60 hover:bg-white/80'
              } ${!participant.is_online ? 'opacity-60' : ''}`}
            >
              {/* Avatar */}
              <div className="relative">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white ${
                  participant.is_online 
                    ? 'bg-gradient-to-br from-indigo-400 to-purple-500'
                    : 'bg-gray-400'
                }`}>
                  {getInitials(participant.user_email, participant.username)}
                </div>
                {participant.is_online && (
                  <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white bg-green-500" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs font-medium text-gray-800 truncate">
                    {participant.username || participant.user_email?.split('@')[0] || 'User'}
                    {participant.user_id === currentUserId && (
                      <span className="text-indigo-600 ml-1">(You)</span>
                    )}
                  </span>
                  {getStatusIcon(participant.status)}
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-1 mb-1">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-1 rounded-full transition-all"
                    style={{ width: `${participant.completion_percentage}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{participant.completion_percentage}%</span>
                  <span>{participant.correct_answers}/{participant.current_question_index}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Insights */}
        {groupStats.averageAccuracy < 50 && participants.length >= 3 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-xs font-medium text-red-700">Low Group Accuracy</span>
            </div>
            <p className="text-xs text-red-600 mt-1">Consider reviewing difficult concepts</p>
          </div>
        )}

        {participants.some(p => p.completion_percentage > 80) && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-700">Great Progress!</span>
            </div>
            <p className="text-xs text-green-600 mt-1">Some participants are doing very well</p>
          </div>
        )}
      </div>
    </div>
  )
}