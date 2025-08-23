import React from 'react'
import { formatDuration } from '../../lib/utils/newtab-analytics'
import type { DailyStats } from '../../lib/utils/newtab-analytics'

interface DailyStatsCardProps {
  stats: DailyStats
}

export function DailyStatsCard({ stats }: DailyStatsCardProps) {
  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 75) return 'bg-blue-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-gray-300'
  }

  const getProgressMessage = (progress: number) => {
    if (progress >= 100) return "🎉 Daily goal achieved!"
    if (progress >= 75) return "🔥 Almost there!"
    if (progress >= 50) return "📈 Great progress!"
    if (progress > 0) return "🌱 Good start!"
    return "💪 Ready to begin?"
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Today's Practice</h2>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric' 
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Sessions */}
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-600">{stats.sessionsToday}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Sessions</div>
        </div>

        {/* Practice Time */}
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {formatDuration(stats.practiceTimeToday)}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Practice Time</div>
        </div>

        {/* Recordings */}
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.recordingsToday}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Recordings</div>
        </div>

        {/* Vocabulary */}
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.vocabularyLearned}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">New Words</div>
        </div>
      </div>

      {/* Goal Progress */}
      {stats.goalProgress > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Daily Goal Progress</span>
            <span className="text-sm text-gray-500">{Math.round(stats.goalProgress)}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(stats.goalProgress)}`}
              style={{ width: `${Math.min(stats.goalProgress, 100)}%` }}
            />
          </div>
          
          <div className="text-sm text-gray-600 text-center">
            {getProgressMessage(stats.goalProgress)}
          </div>
        </div>
      )}

      {/* No activity today */}
      {stats.sessionsToday === 0 && stats.practiceTimeToday === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-3">🚀</div>
          <p className="text-lg mb-2">Ready to start your practice?</p>
          <p className="text-sm">Begin with a quick 5-minute session!</p>
        </div>
      )}
    </div>
  )
}