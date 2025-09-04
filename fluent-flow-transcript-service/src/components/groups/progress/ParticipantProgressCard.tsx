'use client'

import { useState } from 'react'
import { Clock, CheckCircle, AlertTriangle } from 'lucide-react'

export interface ProgressData {
  user_id: string
  user_email: string | null
  username?: string | null
  current_question_index: number
  total_questions: number
  correct_answers: number
  time_spent_seconds: number
  last_activity: string
  completion_percentage: number
  confidence_level?: 'low' | 'medium' | 'high' | null
  difficulty_distribution: {
    easy: { answered: number; correct: number; total: number }
    medium: { answered: number; correct: number; total: number }
    hard: { answered: number; correct: number; total: number }
  }
  is_online: boolean
  status: 'not_started' | 'in_progress' | 'completed' | 'paused'
}

interface ParticipantProgressCardProps {
  participant: ProgressData
  currentUserId?: string
  isCompact?: boolean
}

export function ParticipantProgressCard({ 
  participant, 
  currentUserId, 
  isCompact = false 
}: ParticipantProgressCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  
  const isCurrentUser = participant.user_id === currentUserId
  
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

  const getDisplayName = (email?: string | null, username?: string | null) => {
    if (username && username.trim()) {
      return username.trim()
    }
    if (email && email.includes('@')) {
      return email.split('@')[0]
    }
    return 'Unknown User'
  }

  const formatTimeSpent = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const getStatusColor = () => {
    switch (participant.status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getConfidenceBadge = () => {
    if (!participant.confidence_level) return null
    
    const colors = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-red-100 text-red-800'
    }
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[participant.confidence_level]}`}>
        {participant.confidence_level} confidence
      </span>
    )
  }

  const accuracyPercentage = participant.total_questions > 0 
    ? Math.round((participant.correct_answers / participant.current_question_index) * 100) || 0
    : 0

  if (isCompact) {
    return (
      <div className={`p-3 rounded-lg border transition-all ${
        isCurrentUser 
          ? 'border-indigo-200 bg-indigo-50' 
          : 'border-white/40 bg-white/60 hover:bg-white/80'
      } ${!participant.is_online ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white ${
              participant.is_online 
                ? 'bg-gradient-to-br from-indigo-400 to-purple-500'
                : 'bg-gray-400'
            }`}>
              {getInitials(participant.user_email, participant.username)}
            </div>
            {participant.is_online && (
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate">
                {getDisplayName(participant.user_email, participant.username)}
                {isCurrentUser && <span className="text-indigo-600 ml-1">(You)</span>}
              </span>
              <div className={`px-2 py-0.5 text-xs rounded border ${getStatusColor()}`}>
                {participant.status}
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{participant.current_question_index}/{participant.total_questions}</span>
              <span>{participant.completion_percentage}%</span>
              <span>{accuracyPercentage}% accuracy</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-4 rounded-lg border transition-all ${
      isCurrentUser 
        ? 'border-indigo-200 bg-indigo-50' 
        : 'border-white/40 bg-white/60 hover:bg-white/80'
    } ${!participant.is_online ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ${
              participant.is_online 
                ? 'bg-gradient-to-br from-indigo-400 to-purple-500'
                : 'bg-gray-400'
            }`}>
              {getInitials(participant.user_email, participant.username)}
            </div>
            {participant.is_online && (
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
            )}
          </div>
          
          <div>
            <div className="font-medium text-gray-800">
              {getDisplayName(participant.user_email, participant.username)}
              {isCurrentUser && <span className="text-indigo-600 ml-1">(You)</span>}
            </div>
            <div className="text-sm text-gray-500">
              {participant.is_online ? 'Online' : 'Offline'} • Last activity: {
                new Date(participant.last_activity).toLocaleTimeString()
              }
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {getConfidenceBadge()}
          <div className={`px-2 py-1 text-xs rounded border ${getStatusColor()}`}>
            {participant.status.replace('_', ' ')}
          </div>
        </div>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="bg-white/50 rounded p-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Progress</span>
          </div>
          <div className="text-lg font-bold text-gray-800">
            {participant.current_question_index}/{participant.total_questions}
          </div>
          <div className="text-xs text-gray-500">{participant.completion_percentage}% complete</div>
        </div>
        
        <div className="bg-white/50 rounded p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Accuracy</span>
          </div>
          <div className="text-lg font-bold text-gray-800">{accuracyPercentage}%</div>
          <div className="text-xs text-gray-500">
            {participant.correct_answers} correct
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Overall Progress</span>
          <span>{participant.completion_percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${participant.completion_percentage}%` }}
          />
        </div>
      </div>

      {/* Time Stats */}
      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>{formatTimeSpent(participant.time_spent_seconds)} spent</span>
        </div>
        <div>
          Avg: {participant.current_question_index > 0 
            ? formatTimeSpent(Math.round(participant.time_spent_seconds / participant.current_question_index))
            : '0s'}/question
        </div>
      </div>

      {/* Difficulty Breakdown */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full text-left text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        {showDetails ? 'Hide' : 'Show'} difficulty breakdown
      </button>

      {showDetails && (
        <div className="mt-3 space-y-2">
          {Object.entries(participant.difficulty_distribution).map(([difficulty, stats]) => (
            <div key={difficulty} className="bg-white/50 rounded p-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium capitalize text-gray-700">{difficulty}</span>
                <span className="text-xs text-gray-500">
                  {stats.answered}/{stats.total} answered
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span>{stats.correct}/{stats.answered} correct</span>
                <span>
                  {stats.answered > 0 ? Math.round((stats.correct / stats.answered) * 100) : 0}% accuracy
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                <div 
                  className={`h-1 rounded-full transition-all ${
                    difficulty === 'easy' ? 'bg-green-500' :
                    difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${(stats.answered / stats.total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}