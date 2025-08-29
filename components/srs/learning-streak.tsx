import React from 'react'
import { Flame } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { type SRSStats } from '../../lib/services/srs-service'

interface LearningStreakProps {
  stats: SRSStats
}

export const LearningStreak: React.FC<LearningStreakProps> = ({ stats }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flame className="h-6 w-6 text-orange-500" />
            <div>
              <CardTitle>Learning Streak</CardTitle>
              <CardDescription>Consistency is key to mastering vocabulary</CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-orange-500">{stats.currentStreak}</div>
            <div className="text-sm text-muted-foreground">days</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current streak</span>
            <span className="font-semibold">{stats.currentStreak} days</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Longest streak</span>
            <span className="font-semibold">{stats.longestStreak} days</span>
          </div>
          <Progress 
            value={stats.currentStreak > 0 ? Math.min((stats.currentStreak / 30) * 100, 100) : 0} 
            className="h-2"
          />
          <p className="text-xs text-muted-foreground">
            Keep practicing daily to build your streak!
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default LearningStreak