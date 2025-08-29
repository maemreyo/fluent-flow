import React from 'react'
import { ChevronRight, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { type SRSStats } from '../../lib/services/srs-service'

interface LearningOverviewProps {
  stats: SRSStats
  onViewAllCards?: () => void
}

export const LearningOverview: React.FC<LearningOverviewProps> = ({ 
  stats, 
  onViewAllCards 
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Learning Overview</CardTitle>
            <CardDescription>
              Manage your vocabulary collection
            </CardDescription>
          </div>
          <Button variant="outline" onClick={onViewAllCards}>
            View All Cards
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total reviews completed</span>
            <span className="font-semibold">{stats.totalReviews}</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Learning progress</span>
              <span className="font-semibold">
                {stats.totalCards > 0 
                  ? Math.round(((stats.reviewCards + stats.matureCards) / stats.totalCards) * 100)
                  : 0}%
              </span>
            </div>
            <Progress 
              value={stats.totalCards > 0 
                ? ((stats.reviewCards + stats.matureCards) / stats.totalCards) * 100
                : 0} 
            />
          </div>

          {stats.dueToday > 0 && (
            <div className="rounded-lg bg-primary/10 p-4">
              <div className="flex items-center gap-2 text-primary">
                <Clock className="h-4 w-4" />
                <span className="font-semibold">Ready to review!</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                You have {stats.dueToday} cards scheduled for today. Regular practice 
                is essential for long-term retention.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default LearningOverview