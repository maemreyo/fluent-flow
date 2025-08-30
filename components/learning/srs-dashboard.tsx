import React, { useEffect, useState } from 'react'
import { Brain } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { srsService, type SRSStats } from '../../lib/services/srs-service'

// Import the new components
import { LearningStreak } from '../srs/learning-streak'
import { GitHubStyleHeatmap } from '../srs/github-style-heatmap'
import { LearningOverview } from '../srs/learning-overview'
import { TodaysReviews } from '../srs/todays-reviews'

interface SRSDashboardProps {
  onStartReview?: () => void
  onViewAllCards?: () => void
}

interface HeatmapData {
  date: string
  count: number
}

export const SRSDashboard: React.FC<SRSDashboardProps> = ({
  onStartReview,
  onViewAllCards
}) => {
  const [stats, setStats] = useState<SRSStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activityData, setActivityData] = useState<HeatmapData[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      const [srsStats, activityData] = await Promise.all([
        srsService.getStats(),
        srsService.getActivityData(100) // Changed from 14 to 100 days
      ])
      
      setStats(srsStats)
      setActivityData(activityData)
    } catch (error) {
      console.error('Failed to load SRS dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center p-12">
        <div className="space-y-4 text-center">
          <Brain className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading your learning dashboard...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <Card className="mx-auto max-w-2xl text-center">
        <CardHeader>
          <Brain className="mx-auto h-16 w-16 text-muted-foreground" />
          <CardTitle>Unable to Load Dashboard</CardTitle>
          <CardDescription>
            There was an error loading your learning statistics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadDashboardData}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* Today's Reviews - Enhanced with preview */}
      <TodaysReviews
        dueCount={stats?.dueToday || 0}
        newCount={stats?.newCards || 0}
        onStartReview={onStartReview}
        onViewAllCards={onViewAllCards}
      />

      {/* Learning Stats Overview */}
      <LearningOverview stats={stats} />

      {/* Learning Streak */}
      <LearningStreak stats={stats} />

      {/* GitHub-style Activity Heatmap - Now shows 100 days */}
      <GitHubStyleHeatmap activityData={activityData} isLoading={isLoading} showExtended={true} />
    </div>
  )
}

export default SRSDashboard