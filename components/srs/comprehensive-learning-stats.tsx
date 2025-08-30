import React from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  Brain,
  Calendar,
  ChevronRight,
  Clock,
  Flame,
  TrendingUp,
  Trophy,
  Users
} from 'lucide-react'
import type { SRSStats } from '../../lib/services/srs-service'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { GitHubStyleHeatmap } from './github-style-heatmap'

interface HeatmapData {
  date: string
  count: number
}

interface ComprehensiveLearningStatsProps {
  stats: SRSStats
  activityData: HeatmapData[]
  isLoading?: boolean
  onViewAllCards?: () => void
}

export const ComprehensiveLearningStats: React.FC<ComprehensiveLearningStatsProps> = ({
  stats,
  activityData,
  isLoading = false,
  onViewAllCards
}) => {
  return (
    <div className="space-y-6">
      {/* Comprehensive Stats Card */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-50 via-blue-50 to-emerald-50 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-blue-500/5 to-emerald-500/5" />

        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-violet-500 to-emerald-500 shadow-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="bg-gradient-to-r from-violet-600 to-emerald-600 bg-clip-text text-2xl text-transparent">
                  Learning Dashboard
                </CardTitle>
                <CardDescription className="text-base">
                  Your complete learning progress and statistics
                </CardDescription>
              </div>
            </div>
            {onViewAllCards && (
              <Button
                variant="outline"
                onClick={onViewAllCards}
                className="border-white/20 bg-white/70 backdrop-blur-sm hover:bg-white/90"
              >
                View All Cards
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="relative space-y-8">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-white/20 bg-white/70 p-4 shadow-lg backdrop-blur-sm"
            >
              <div className="mb-2 flex items-center gap-3">
                <Calendar className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-gray-700">Due Today</span>
              </div>
              <div className="text-3xl font-bold text-red-600">{stats.dueToday}</div>
              <p className="text-xs text-gray-500">Cards ready</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-white/20 bg-white/70 p-4 shadow-lg backdrop-blur-sm"
            >
              <div className="mb-2 flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">Total Cards</span>
              </div>
              <div className="text-3xl font-bold text-blue-600">{stats.totalCards}</div>
              <p className="text-xs text-gray-500">In your deck</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-white/20 bg-white/70 p-4 shadow-lg backdrop-blur-sm"
            >
              <div className="mb-2 flex items-center gap-3">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-medium text-gray-700">Accuracy</span>
              </div>
              <div className="text-3xl font-bold text-green-600">{stats.accuracyRate}%</div>
              <p className="text-xs text-gray-500">Overall rate</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl border border-white/20 bg-white/70 p-4 shadow-lg backdrop-blur-sm"
            >
              <div className="mb-2 flex items-center gap-3">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="text-sm font-medium text-gray-700">Streak</span>
              </div>
              <div className="text-3xl font-bold text-orange-600">{stats.currentStreak}</div>
              <p className="text-xs text-gray-500">Current days</p>
            </motion.div>
          </div>

          {/* Learning Progress Breakdown */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Progress Status */}
            <div className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-lg backdrop-blur-sm">
              <div className="mb-6 flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-violet-600" />
                <h3 className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-xl font-bold text-transparent">
                  Learning Progress
                </h3>
              </div>

              <div className="space-y-4">
                {/* New Cards */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium">New Cards</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-blue-600">{stats.newCards}</span>
                    <div className="w-20">
                      <Progress value={(stats.newCards / stats.totalCards) * 100} className="h-2" />
                    </div>
                  </div>
                </div>

                {/* Learning */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                    <span className="text-sm font-medium">Learning</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-orange-600">{stats.learningCards}</span>
                    <div className="w-20">
                      <Progress
                        value={(stats.learningCards / stats.totalCards) * 100}
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Review */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                    <span className="text-sm font-medium">Review</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-yellow-600">{stats.reviewCards}</span>
                    <div className="w-20">
                      <Progress
                        value={(stats.reviewCards / stats.totalCards) * 100}
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Mature */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium">Mature</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-green-600">{stats.matureCards}</span>
                    <div className="w-20">
                      <Progress
                        value={(stats.matureCards / stats.totalCards) * 100}
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Overall Progress */}
              <div className="mt-6 border-t border-white/20 pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {stats.totalCards > 0
                      ? Math.round(
                          ((stats.reviewCards + stats.matureCards) / stats.totalCards) * 100
                        )
                      : 0}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    stats.totalCards > 0
                      ? ((stats.reviewCards + stats.matureCards) / stats.totalCards) * 100
                      : 0
                  }
                  className="h-3"
                />
              </div>
            </div>

            {/* Streak & Achievement Stats */}
            <div className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-lg backdrop-blur-sm">
              <div className="mb-6 flex items-center gap-3">
                <Flame className="h-6 w-6 text-orange-500" />
                <h3 className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-xl font-bold text-transparent">
                  Achievements & Streaks
                </h3>
              </div>

              <div className="space-y-6">
                {/* Current Streak Display */}
                <div className="rounded-xl bg-gradient-to-r from-orange-100/70 to-red-100/70 p-4 text-center">
                  <div className="mb-1 text-4xl font-bold text-orange-600">
                    {stats.currentStreak}
                  </div>
                  <div className="text-sm font-medium text-orange-700">Current Streak Days</div>
                </div>

                {/* Streak Progress */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">Current streak</span>
                    <span className="font-bold text-orange-600">{stats.currentStreak} days</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">Longest streak</span>
                    <span className="font-bold text-red-600">{stats.longestStreak} days</span>
                  </div>
                  <Progress
                    value={
                      stats.currentStreak > 0 ? Math.min((stats.currentStreak / 30) * 100, 100) : 0
                    }
                    className="h-3"
                  />
                  <p className="text-center text-xs text-gray-500">
                    Goal: 30 days • Keep practicing daily! 🔥
                  </p>
                </div>

                {/* Additional Stats */}
                <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-violet-600">{stats.totalReviews}</div>
                    <div className="text-xs text-gray-600">Total Reviews</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">{stats.accuracyRate}%</div>
                    <div className="text-xs text-gray-600">Accuracy Rate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Heatmap */}
          {/* <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/20 p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <Target className="h-6 w-6 text-emerald-600" />
              <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Activity Overview
              </h3>
            </div>
            <GitHubStyleHeatmap 
              activityData={activityData} 
              isLoading={isLoading} 
              showExtended={true} 
            />
          </div> */}
          <GitHubStyleHeatmap
            activityData={activityData}
            isLoading={isLoading}
            showExtended={true}
          />

          {/* Study Reminder */}
          {stats.dueToday > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 p-6 shadow-lg"
            >
              <div className="mb-3 flex items-center gap-3 text-red-600">
                <Clock className="h-5 w-5" />
                <span className="text-lg font-bold">Ready to Review! 🎯</span>
              </div>
              <p className="mb-4 text-gray-700">
                You have <strong>{stats.dueToday}</strong> cards scheduled for today. Regular
                practice is essential for long-term retention and building your streak!
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <TrendingUp className="h-4 w-4" />
                <span>Consistent daily practice improves retention by up to 80%</span>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ComprehensiveLearningStats
