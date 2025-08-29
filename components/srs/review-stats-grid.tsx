import React from 'react'
import {
  BookOpen,
  Zap,
  Clock,
  TrendingUp,
  Trophy,
  Target
} from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { type SRSStats } from '../../lib/services/srs-service'

interface ReviewStatsGridProps {
  stats: SRSStats
}

export const ReviewStatsGrid: React.FC<ReviewStatsGridProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <Card className="text-center">
        <CardContent className="p-4">
          <BookOpen className="mx-auto mb-2 h-6 w-6 text-blue-600" />
          <div className="text-2xl font-bold">{stats.totalCards}</div>
          <div className="text-xs text-muted-foreground">Total Cards</div>
        </CardContent>
      </Card>
      
      <Card className="text-center">
        <CardContent className="p-4">
          <Zap className="mx-auto mb-2 h-6 w-6 text-green-600" />
          <div className="text-2xl font-bold">{stats.newCards}</div>
          <div className="text-xs text-muted-foreground">New</div>
        </CardContent>
      </Card>
      
      <Card className="text-center">
        <CardContent className="p-4">
          <Clock className="mx-auto mb-2 h-6 w-6 text-orange-600" />
          <div className="text-2xl font-bold">{stats.learningCards}</div>
          <div className="text-xs text-muted-foreground">Learning</div>
        </CardContent>
      </Card>
      
      <Card className="text-center">
        <CardContent className="p-4">
          <TrendingUp className="mx-auto mb-2 h-6 w-6 text-blue-600" />
          <div className="text-2xl font-bold">{stats.reviewCards}</div>
          <div className="text-xs text-muted-foreground">Review</div>
        </CardContent>
      </Card>
      
      <Card className="text-center">
        <CardContent className="p-4">
          <Trophy className="mx-auto mb-2 h-6 w-6 text-purple-600" />
          <div className="text-2xl font-bold">{stats.matureCards}</div>
          <div className="text-xs text-muted-foreground">Mature</div>
        </CardContent>
      </Card>
      
      <Card className="text-center">
        <CardContent className="p-4">
          <Target className="mx-auto mb-2 h-6 w-6 text-green-600" />
          <div className="text-2xl font-bold">{stats.accuracyRate}%</div>
          <div className="text-xs text-muted-foreground">Accuracy</div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ReviewStatsGrid