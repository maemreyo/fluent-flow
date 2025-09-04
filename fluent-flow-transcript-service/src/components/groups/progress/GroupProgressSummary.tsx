'use client'

import { Users, Clock, Target, TrendingUp, Award, Activity } from 'lucide-react'
import type { ProgressData } from './ParticipantProgressCard'

interface GroupProgressSummaryProps {
  participants: ProgressData[]
  sessionStartTime?: string
}

export function GroupProgressSummary({ 
  participants, 
  sessionStartTime
}: GroupProgressSummaryProps) {
  // Calculate group statistics
  const completedParticipants = participants.filter(p => p.status === 'completed')
  const inProgressParticipants = participants.filter(p => p.status === 'in_progress')
  
  const totalParticipants = participants.length
  const onlineCount = participants.filter(p => p.is_online).length
  
  // Average progress
  const averageProgress = participants.length > 0 
    ? Math.round(participants.reduce((sum, p) => sum + p.completion_percentage, 0) / participants.length)
    : 0
  
  // Average accuracy for participants who have answered questions
  const participantsWithAnswers = participants.filter(p => p.current_question_index > 0)
  const averageAccuracy = participantsWithAnswers.length > 0
    ? Math.round(
        participantsWithAnswers.reduce((sum, p) => {
          const accuracy = p.current_question_index > 0 ? (p.correct_answers / p.current_question_index) * 100 : 0
          return sum + accuracy
        }, 0) / participantsWithAnswers.length
      )
    : 0
  
  // Session duration
  const sessionDuration = sessionStartTime 
    ? Math.floor((Date.now() - new Date(sessionStartTime).getTime()) / 1000)
    : 0
    
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }
  
  // Fastest and slowest participants
  const rankedByProgress = [...participants]
    .filter(p => p.completion_percentage > 0)
    .sort((a, b) => b.completion_percentage - a.completion_percentage)
  
  const fastestParticipant = rankedByProgress[0]
  const strugglingParticipants = rankedByProgress.filter(p => 
    p.completion_percentage < averageProgress - 20 && p.status === 'in_progress'
  )
  
  // Question difficulty stats
  const difficultyStats = participants.reduce(
    (acc, p) => {
      Object.entries(p.difficulty_distribution).forEach(([difficulty, stats]) => {
        const difficultyKey = difficulty as keyof typeof acc
        acc[difficultyKey].total += stats.total
        acc[difficultyKey].answered += stats.answered
        acc[difficultyKey].correct += stats.correct
      })
      return acc
    },
    {
      easy: { total: 0, answered: 0, correct: 0 },
      medium: { total: 0, answered: 0, correct: 0 },
      hard: { total: 0, answered: 0, correct: 0 }
    }
  )
  
  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/60 rounded-lg p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-indigo-600" />
            <span className="font-semibold text-gray-800">Participants</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{onlineCount}/{totalParticipants}</div>
          <div className="text-sm text-gray-600">online now</div>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
              {completedParticipants.length} completed
            </span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {inProgressParticipants.length} active
            </span>
          </div>
        </div>
        
        <div className="bg-white/60 rounded-lg p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-800">Session Time</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{formatDuration(sessionDuration)}</div>
          <div className="text-sm text-gray-600">elapsed</div>
          {sessionStartTime && (
            <div className="text-xs text-gray-500 mt-1">
              Started: {new Date(sessionStartTime).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white/60 rounded-lg p-4 border border-white/20">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-5 w-5 text-purple-600" />
          <span className="font-semibold text-gray-800">Group Progress</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Average Progress</div>
            <div className="text-xl font-bold text-gray-800">{averageProgress}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div 
                className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${averageProgress}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 mb-1">Average Accuracy</div>
            <div className="text-xl font-bold text-gray-800">{averageAccuracy}%</div>
            <div className="text-xs text-gray-500">
              {participantsWithAnswers.length} participants with answers
            </div>
          </div>
        </div>
        
        {/* Progress Distribution */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Progress Distribution</div>
          <div className="flex h-4 rounded-full overflow-hidden bg-gray-200">
            <div 
              className="bg-green-500 transition-all"
              style={{ 
                width: `${(completedParticipants.length / totalParticipants) * 100}%` 
              }}
              title={`${completedParticipants.length} completed`}
            />
            <div 
              className="bg-blue-500 transition-all"
              style={{ 
                width: `${(inProgressParticipants.length / totalParticipants) * 100}%` 
              }}
              title={`${inProgressParticipants.length} in progress`}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{completedParticipants.length} completed</span>
            <span>{inProgressParticipants.length} in progress</span>
            <span>{totalParticipants - completedParticipants.length - inProgressParticipants.length} not started</span>
          </div>
        </div>
      </div>

      {/* Difficulty Performance */}
      <div className="bg-white/60 rounded-lg p-4 border border-white/20">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-orange-600" />
          <span className="font-semibold text-gray-800">Question Difficulty</span>
        </div>
        
        <div className="space-y-3">
          {Object.entries(difficultyStats).map(([difficulty, stats]) => {
            const accuracy = stats.answered > 0 ? Math.round((stats.correct / stats.answered) * 100) : 0
            const completion = stats.total > 0 ? Math.round((stats.answered / stats.total) * 100) : 0
            
            return (
              <div key={difficulty} className="bg-white/50 rounded p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium capitalize text-gray-700">{difficulty}</span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-600">{accuracy}% accuracy</span>
                    <span className="text-gray-600">{completion}% complete</span>
                  </div>
                </div>
                <div className="flex gap-2 text-xs text-gray-500 mb-1">
                  <span>{stats.answered}/{stats.total} questions answered</span>
                  <span>•</span>
                  <span>{stats.correct} correct answers</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      difficulty === 'easy' ? 'bg-green-500' :
                      difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Insights & Alerts */}
      {(fastestParticipant || strugglingParticipants.length > 0) && (
        <div className="bg-white/60 rounded-lg p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-gray-800">Insights</span>
          </div>
          
          <div className="space-y-2">
            {fastestParticipant && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded">
                <Award className="h-4 w-4" />
                <span>
                  <strong>{fastestParticipant.username || fastestParticipant.user_email?.split('@')[0]}</strong> is leading with {fastestParticipant.completion_percentage}% progress
                </span>
              </div>
            )}
            
            {strugglingParticipants.length > 0 && (
              <div className="text-sm text-orange-700 bg-orange-50 p-2 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4" />
                  <span>
                    {strugglingParticipants.length} participant{strugglingParticipants.length > 1 ? 's' : ''} may need help
                  </span>
                </div>
                <div className="text-xs text-orange-600">
                  Progress significantly below group average
                </div>
              </div>
            )}
            
            {averageAccuracy < 50 && participantsWithAnswers.length >= 3 && (
              <div className="text-sm text-red-700 bg-red-50 p-2 rounded">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span>Group accuracy is below 50% - consider reviewing difficult concepts</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}