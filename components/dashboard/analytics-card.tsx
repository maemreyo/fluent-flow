import { Calendar, Flame, Target, TrendingDown, TrendingUp } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

interface AnalyticsData {
  weeklyTrend: Array<{
    date: Date
    sessions: number
    practiceTime: number
    recordings: number
  }>
  monthlyTrend: Array<{
    weekStart: Date
    sessions: number
    practiceTime: number
    recordings: number
  }>
  dailyAverages: {
    thisWeek: number
    lastWeek: number
    thisMonth: number
  }
  practiceStreak: number
  mostActiveDay: number | null
  improvementRate: number
}

interface AnalyticsCardProps {
  analytics: AnalyticsData
  formatTime: (seconds: number) => string
}

export function AnalyticsCard({ analytics, formatTime }: AnalyticsCardProps) {
  const { dailyAverages, practiceStreak, mostActiveDay, improvementRate, weeklyTrend } = analytics

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const mostActiveDayName = mostActiveDay !== null ? dayNames[mostActiveDay] : 'None'

  // Get trend direction
  const isImproving = improvementRate > 0
  const hasWeeklyData = weeklyTrend.some(day => day.sessions > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          Practice Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Practice Streak */}
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <Flame className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-sm font-medium">{practiceStreak} day streak</p>
              <p className="text-xs text-muted-foreground">Consecutive days</p>
            </div>
          </div>

          {/* Most Active Day */}
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <Calendar className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-sm font-medium">{mostActiveDayName}</p>
              <p className="text-xs text-muted-foreground">Most active day</p>
            </div>
          </div>
        </div>

        {/* Weekly Comparison */}
        <div className="rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Weekly Progress</p>
            <Badge variant={isImproving ? 'default' : 'secondary'} className="text-xs">
              {isImproving ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {improvementRate >= 0 ? '+' : ''}
              {Math.round(improvementRate)}%
            </Badge>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">This week avg:</span>
              <span>{formatTime(Math.round(dailyAverages.thisWeek))}/day</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last week avg:</span>
              <span>{formatTime(Math.round(dailyAverages.lastWeek))}/day</span>
            </div>
          </div>
        </div>

        {/* Weekly Activity Chart (Simple bars) */}
        {hasWeeklyData && (
          <div className="rounded-lg border p-3">
            <p className="mb-3 text-sm font-medium">Last 7 Days</p>
            <div className="flex items-end justify-between gap-1">
              {weeklyTrend.map((day, index) => {
                const maxTime = Math.max(...weeklyTrend.map(d => d.practiceTime))
                const height = maxTime > 0 ? Math.max((day.practiceTime / maxTime) * 40, 2) : 2
                const isToday = index === weeklyTrend.length - 1

                return (
                  <div key={day.date.toDateString()} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-6 rounded-sm ${
                        day.sessions > 0 ? (isToday ? 'bg-blue-500' : 'bg-blue-300') : 'bg-gray-200'
                      }`}
                      style={{ height: `${height}px` }}
                      title={`${day.date.toLocaleDateString()}: ${formatTime(day.practiceTime)}, ${day.sessions} sessions`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {day.date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Goals Section */}
        <div className="rounded-lg border p-3">
          <div className="mb-2 flex items-center gap-2">
            <Target className="h-4 w-4 text-green-500" />
            <p className="text-sm font-medium">Daily Goal</p>
          </div>
          <div className="text-xs text-muted-foreground">
            <p>Current avg: {formatTime(Math.round(dailyAverages.thisWeek))}/day</p>
            <p>Suggested goal: {formatTime(Math.round(dailyAverages.thisWeek * 1.2))}/day</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
