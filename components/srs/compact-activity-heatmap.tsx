import React from 'react'
import { Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { cn } from '../../lib/utils'

interface ActivityData {
  date: string
  count: number
}

interface CompactActivityHeatmapProps {
  activityData: ActivityData[]
  isLoading?: boolean
}

export const CompactActivityHeatmap: React.FC<CompactActivityHeatmapProps> = ({ 
  activityData, 
  isLoading = false 
}) => {
  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-muted'
    if (count <= 3) return 'bg-green-200 dark:bg-green-900'
    if (count <= 7) return 'bg-green-300 dark:bg-green-800'
    if (count <= 12) return 'bg-green-400 dark:bg-green-700'
    return 'bg-green-500 dark:bg-green-600'
  }

  if (isLoading) {
    return (
      <Card className="bg-slate-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-4 w-4" />
            Recent Activity
          </CardTitle>
          <CardDescription className="text-sm">
            Loading activity data...
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="animate-pulse space-y-3">
            <div className="grid grid-cols-14 gap-1">
              {Array.from({ length: 14 }, (_, i) => (
                <div key={i} className="w-4 h-4 bg-muted rounded-sm" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-4 w-4" />
          Recent Activity
        </CardTitle>
        <CardDescription className="text-sm">
          Last 2 weeks
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Compact Heatmap with Days */}
          <div className="space-y-2">
            {/* Day labels */}
            <div className="grid grid-cols-14 gap-1 text-xs text-muted-foreground">
              {activityData.map((day, index) => {
                const date = new Date(day.date)
                const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)
                return (
                  <div key={index} className="text-center text-xs">
                    {dayLabel}
                  </div>
                )
              })}
            </div>
            
            {/* Heatmap squares */}
            <div className="grid grid-cols-14 gap-1">
              {activityData.map((day, index) => {
                const date = new Date(day.date)
                const dayOfMonth = date.getDate()
                return (
                  <div key={index} className="relative group">
                    <div
                      className={cn(
                        'w-4 h-4 rounded-sm cursor-pointer transition-all hover:scale-110',
                        getHeatmapColor(day.count)
                      )}
                      title={`${day.date}: ${day.count} reviews`}
                    />
                    <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground">
                      {dayOfMonth}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Compact Legend */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-4">
            <span>Less</span>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-sm bg-muted" />
              <div className="h-2 w-2 rounded-sm bg-green-200" />
              <div className="h-2 w-2 rounded-sm bg-green-300" />
              <div className="h-2 w-2 rounded-sm bg-green-400" />
              <div className="h-2 w-2 rounded-sm bg-green-500" />
            </div>
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CompactActivityHeatmap