import React from 'react'
import { Brain, Target } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { type SRSStats } from '../../lib/services/srs-service'

interface DailyReviewSectionProps {
  stats: SRSStats
  onStartReview?: () => void
}

export const DailyReviewSection: React.FC<DailyReviewSectionProps> = ({ 
  stats, 
  onStartReview 
}) => {
  return (
    <Card className="bg-gradient-to-r from-primary/5 to-blue-500/5 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl">Today's Reviews</CardTitle>
              <CardDescription>
                {stats.dueToday > 0 
                  ? `${stats.dueToday} cards are waiting for review`
                  : "You're all caught up! Great work!"}
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-primary">{stats.dueToday}</div>
            <div className="text-sm text-muted-foreground">due cards</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Button 
            onClick={onStartReview} 
            size="lg" 
            disabled={stats.dueToday === 0}
            className="px-8"
          >
            <Brain className="mr-2 h-5 w-5" />
            Start Review Session
          </Button>
          {stats.dueToday === 0 && (
            <p className="text-sm text-muted-foreground">
              Check back tomorrow for new reviews!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default DailyReviewSection