import React from 'react'
import type { Achievement } from '../../lib/utils/newtab-analytics'

interface AchievementsCardProps {
  achievements: Achievement[]
}

export function AchievementsCard({ achievements }: AchievementsCardProps) {
  const getAchievementColor = (type: Achievement['type']) => {
    switch (type) {
      case 'goal_completed':
        return 'bg-green-100 border-green-200'
      case 'streak_milestone':
        return 'bg-orange-100 border-orange-200'
      case 'session_milestone':
        return 'bg-blue-100 border-blue-200'
      case 'vocabulary_milestone':
        return 'bg-purple-100 border-purple-200'
      default:
        return 'bg-gray-100 border-gray-200'
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    
    return date.toLocaleDateString()
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Recent Achievements</h2>
        <div className="text-2xl">🏆</div>
      </div>

      {achievements.length > 0 ? (
        <div className="space-y-3">
          {achievements.map((achievement) => (
            <div 
              key={achievement.id}
              className={`p-3 rounded-lg border ${getAchievementColor(achievement.type)}`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{achievement.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-800 text-sm leading-tight">
                    {achievement.title}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {achievement.description}
                  </p>
                  <div className="text-xs text-gray-500 mt-2">
                    {formatTimeAgo(achievement.achievedAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🌟</div>
          <p className="text-gray-500 text-sm mb-2">No recent achievements</p>
          <p className="text-gray-400 text-xs">Keep practicing to unlock achievements!</p>
        </div>
      )}

      {/* Achievement Progress Hint */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Next milestone</span>
          <span className="font-medium">7-day streak 🔥</span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
          <div className="bg-orange-500 h-1 rounded-full" style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  )
}