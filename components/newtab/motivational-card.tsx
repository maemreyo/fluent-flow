import React from 'react'
import type { MotivationalData } from '../../lib/utils/newtab-analytics'

interface MotivationalCardProps {
  motivationalData: MotivationalData
}

export function MotivationalCard({ motivationalData }: MotivationalCardProps) {
  const getLevelColor = (level: string) => {
    if (level.includes('Master')) return 'text-purple-600'
    if (level.includes('Seeker')) return 'text-indigo-600'
    if (level.includes('Enthusiast')) return 'text-blue-600'
    if (level.includes('Dedicated')) return 'text-green-600'
    return 'text-gray-600'
  }

  const getLevelIcon = (level: string) => {
    if (level.includes('Master')) return '👑'
    if (level.includes('Seeker')) return '🎯'
    if (level.includes('Enthusiast')) return '🔥'
    if (level.includes('Dedicated')) return '💪'
    return '🌱'
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
      {/* Quote Section */}
      <div className="mb-6">
        <div className="text-3xl mb-3 text-center">💭</div>
        <blockquote className="text-gray-700 text-center italic leading-relaxed">
          "{motivationalData.quote}"
        </blockquote>
        <p className="text-gray-500 text-sm text-center mt-2">
          — {motivationalData.author}
        </p>
      </div>

      {/* Progress Section */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{getLevelIcon(motivationalData.progress.level)}</span>
          <div>
            <h3 className={`font-semibold ${getLevelColor(motivationalData.progress.level)}`}>
              {motivationalData.progress.level}
            </h3>
            <p className="text-xs text-gray-500">Your current level</p>
          </div>
        </div>

        {/* Progress to Next Level */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Progress to next level</span>
            <span className="font-medium">{Math.round(motivationalData.progress.progressToNext)}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${motivationalData.progress.progressToNext}%` }}
            />
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            Next: {motivationalData.progress.nextMilestone}
          </p>
        </div>
      </div>

      {/* Motivational Actions */}
      <div className="mt-4 space-y-2">
        <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200">
          Set New Goal 🎯
        </button>
        <button className="w-full bg-white hover:bg-gray-50 text-indigo-600 text-sm font-medium py-2 px-4 rounded-lg border border-indigo-200 transition-colors duration-200">
          View All Achievements 🏆
        </button>
      </div>
    </div>
  )
}