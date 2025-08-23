import React from 'react'
import { formatDuration } from '../../lib/utils/newtab-analytics'
import type { WeeklyProgressPoint } from '../../lib/utils/newtab-analytics'

interface WeeklyProgressChartProps {
  weeklyProgress: WeeklyProgressPoint[]
}

export function WeeklyProgressChart({ weeklyProgress }: WeeklyProgressChartProps) {
  const maxPracticeTime = Math.max(...weeklyProgress.map(p => p.practiceTime), 1)
  
  const getDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }

  const getBarColor = (point: WeeklyProgressPoint, isToday: boolean) => {
    if (isToday) return 'bg-indigo-500'
    if (point.goalAchieved) return 'bg-green-500'
    if (point.practiceTime > 0) return 'bg-blue-400'
    return 'bg-gray-200'
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Weekly Progress</h2>
        <div className="text-sm text-gray-500">Last 7 days</div>
      </div>

      {/* Chart */}
      <div className="mb-6">
        <div className="flex items-end justify-between h-32 gap-2">
          {weeklyProgress.map((point, index) => {
            const height = maxPracticeTime > 0 ? (point.practiceTime / maxPracticeTime) * 100 : 0
            const today = isToday(point.date)
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="relative flex-1 w-full flex items-end">
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${getBarColor(point, today)}`}
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${getDayName(point.date)}: ${formatDuration(point.practiceTime)}, ${point.sessions} sessions`}
                  />
                  
                  {/* Goal Achievement Indicator */}
                  {point.goalAchieved && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                      <div className="text-xs">🎯</div>
                    </div>
                  )}
                  
                  {/* Today Indicator */}
                  {today && (
                    <div className="absolute -top-2 right-0">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    </div>
                  )}
                </div>
                
                {/* Day Label */}
                <div className={`mt-2 text-xs ${today ? 'font-bold text-indigo-600' : 'text-gray-500'}`}>
                  {getDayName(point.date)}
                </div>
                
                {/* Time Label */}
                <div className="text-xs text-gray-400">
                  {point.practiceTime > 0 ? formatDuration(point.practiceTime) : '0'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Goal achieved</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-400 rounded"></div>
          <span>Practice done</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-200 rounded"></div>
          <span>No practice</span>
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-indigo-600">
              {weeklyProgress.reduce((acc, p) => acc + p.sessions, 0)}
            </div>
            <div className="text-xs text-gray-500">Total Sessions</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-blue-600">
              {formatDuration(weeklyProgress.reduce((acc, p) => acc + p.practiceTime, 0))}
            </div>
            <div className="text-xs text-gray-500">Total Time</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-green-600">
              {weeklyProgress.filter(p => p.goalAchieved).length}
            </div>
            <div className="text-xs text-gray-500">Goals Hit</div>
          </div>
        </div>
      </div>
    </div>
  )
}