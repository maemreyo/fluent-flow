import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, TrendingUp, Flame } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { cn } from '../../lib/utils'

interface ActivityData {
  date: string
  count: number
}

interface GitHubStyleHeatmapProps {
  activityData: ActivityData[]
  isLoading?: boolean
  showExtended?: boolean // Show more than 2 weeks
}

export const GitHubStyleHeatmap: React.FC<GitHubStyleHeatmapProps> = ({ 
  activityData, 
  isLoading = false,
  showExtended = false 
}) => {
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number } | null>(null)
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null)

  // GitHub-style color intensity (brighter, more vibrant)
  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    if (count <= 3) return 'bg-emerald-200 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-800'
    if (count <= 7) return 'bg-emerald-400 dark:bg-emerald-700 border-emerald-500 dark:border-emerald-600'
    if (count <= 12) return 'bg-emerald-500 dark:bg-emerald-600 border-emerald-600 dark:border-emerald-500'
    return 'bg-emerald-600 dark:bg-emerald-500 border-emerald-700 dark:border-emerald-400'
  }

  const getIntensityLevel = (count: number) => {
    if (count === 0) return 0
    if (count <= 3) return 1
    if (count <= 7) return 2
    if (count <= 12) return 3
    return 4
  }

  // Calculate stats
  const totalReviews = activityData.reduce((sum, day) => sum + day.count, 0)
  const activeDays = activityData.filter(day => day.count > 0).length
  const maxCount = Math.max(...activityData.map(day => day.count))
  const currentStreak = calculateCurrentStreak(activityData)

  // Group by weeks for GitHub-style layout
  const weeks = groupIntoWeeks(activityData)

  if (isLoading) {
    return (
      <Card className="overflow-hidden bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 border-blue-100 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Calendar className="h-5 w-5 text-blue-500" />
            </motion.div>
            Learning Activity
          </CardTitle>
          <CardDescription className="text-blue-600/70">
            Loading your learning journey...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Loading skeleton with animation */}
            <div className="flex gap-1">
              {Array.from({ length: showExtended ? 53 : 14 }, (_, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {Array.from({ length: 7 }, (_, dayIndex) => (
                    <motion.div
                      key={dayIndex}
                      className="w-3 h-3 bg-gray-200 rounded-sm"
                      animate={{
                        opacity: [0.3, 0.7, 0.3],
                        scale: [0.95, 1.05, 0.95]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: (weekIndex + dayIndex) * 0.05
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-white via-emerald-50/20 to-blue-50/30 border-emerald-100 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 text-xl font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              <motion.div
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Calendar className="h-5 w-5 text-emerald-500" />
              </motion.div>
              Learning Heatmap
            </CardTitle>
            <CardDescription className="text-emerald-600/70 font-medium">
              {showExtended ? 'Past year' : 'Last 2 weeks'} • {totalReviews} reviews
            </CardDescription>
          </div>
          
          {/* Quick stats */}
          <div className="flex gap-4 text-sm">
            <motion.div 
              className="text-center"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <div className="font-bold text-emerald-600">{currentStreak}</div>
              <div className="text-emerald-500/70 text-xs flex items-center gap-1">
                <Flame className="h-3 w-3" />
                Streak
              </div>
            </motion.div>
            <motion.div 
              className="text-center"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <div className="font-bold text-blue-600">{activeDays}</div>
              <div className="text-blue-500/70 text-xs flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Active
              </div>
            </motion.div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-6">
          {/* GitHub-style heatmap */}
          <div className="relative">
            {/* Month labels */}
            <div className="flex mb-2 text-xs text-gray-500 font-medium">
              {showExtended ? (
                <>
                  <div className="w-12">Jan</div>
                  <div className="flex-1 text-center">Feb</div>
                  <div className="flex-1 text-center">Mar</div>
                  <div className="flex-1 text-center">Apr</div>
                  <div className="flex-1 text-center">May</div>
                  <div className="flex-1 text-center">Jun</div>
                  <div className="flex-1 text-center">Jul</div>
                  <div className="flex-1 text-center">Aug</div>
                  <div className="flex-1 text-center">Sep</div>
                  <div className="flex-1 text-center">Oct</div>
                  <div className="flex-1 text-center">Nov</div>
                  <div className="w-12 text-right">Dec</div>
                </>
              ) : (
                <div className="text-center w-full">
                  {new Date(activityData[0]?.date).toLocaleDateString('en-US', { 
                    month: 'short' 
                  })} - {new Date(activityData[activityData.length - 1]?.date).toLocaleDateString('en-US', { 
                    month: 'short' 
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-1">
              {/* Day labels */}
              <div className="flex flex-col gap-1 mr-2 text-xs text-gray-500">
                <div className="h-3"></div>
                <div>Mon</div>
                <div className="h-3"></div>
                <div>Wed</div>
                <div className="h-3"></div>
                <div>Fri</div>
                <div className="h-3"></div>
              </div>

              {/* Heatmap grid */}
              <div className="flex gap-1">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {week.map((day, dayIndex) => {
                      const squareIndex = weekIndex * 7 + dayIndex
                      const isHovered = hoveredDay?.date === day.date
                      const isSelected = selectedSquare === squareIndex
                      
                      return (
                        <motion.div
                          key={day.date}
                          className={cn(
                            'relative w-3 h-3 rounded-sm border cursor-pointer transition-all duration-200',
                            getHeatmapColor(day.count),
                            isHovered && 'ring-2 ring-emerald-400 ring-opacity-60',
                            isSelected && 'ring-2 ring-blue-500 scale-110'
                          )}
                          whileHover={{ 
                            scale: 1.2,
                            zIndex: 10,
                          }}
                          whileTap={{ scale: 0.95 }}
                          animate={isSelected ? { scale: 1.15 } : { scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                          onHoverStart={() => setHoveredDay(day)}
                          onHoverEnd={() => setHoveredDay(null)}
                          onClick={() => setSelectedSquare(isSelected ? null : squareIndex)}
                          title={formatTooltip(day)}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Tooltip */}
            <AnimatePresence>
              {hoveredDay && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute -top-16 left-1/2 transform -translate-x-1/2 z-20"
                >
                  <div className="bg-gray-900 text-white text-xs py-2 px-3 rounded-lg shadow-lg border">
                    <div className="font-semibold">{hoveredDay.count} reviews</div>
                    <div className="text-gray-300">
                      {new Date(hoveredDay.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric'
                      })}
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Enhanced legend */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span className="font-medium">Less</span>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((level) => (
                  <motion.div
                    key={level}
                    className={cn(
                      'h-3 w-3 rounded-sm border',
                      level === 0 && 'bg-gray-100 border-gray-200',
                      level === 1 && 'bg-emerald-200 border-emerald-300',
                      level === 2 && 'bg-emerald-400 border-emerald-500',
                      level === 3 && 'bg-emerald-500 border-emerald-600',
                      level === 4 && 'bg-emerald-600 border-emerald-700'
                    )}
                    whileHover={{ scale: 1.2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  />
                ))}
              </div>
              <span className="font-medium">More</span>
            </div>
            
            {maxCount > 0 && (
              <div className="text-xs text-gray-500">
                Best day: <span className="font-semibold text-emerald-600">{maxCount} reviews</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Helper functions
function groupIntoWeeks(activityData: ActivityData[]): ActivityData[][] {
  const weeks: ActivityData[][] = []
  let currentWeek: ActivityData[] = []
  
  activityData.forEach((day, index) => {
    currentWeek.push(day)
    
    if (currentWeek.length === 7 || index === activityData.length - 1) {
      // Fill incomplete weeks with empty days
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', count: 0 })
      }
      weeks.push(currentWeek)
      currentWeek = []
    }
  })
  
  return weeks
}

function calculateCurrentStreak(activityData: ActivityData[]): number {
  let streak = 0
  for (let i = activityData.length - 1; i >= 0; i--) {
    if (activityData[i].count > 0) {
      streak++
    } else {
      break
    }
  }
  return streak
}

function formatTooltip(day: ActivityData): string {
  const date = new Date(day.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  return `${day.count} reviews on ${date}`
}

export default GitHubStyleHeatmap