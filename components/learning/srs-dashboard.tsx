import React from 'react'
import { Brain } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { useSRSDashboardData } from '../../lib/hooks/use-srs-queries'

// Import the new comprehensive component
import { ComprehensiveLearningStats } from '../srs/comprehensive-learning-stats'
import { TodaysReviews } from '../srs/todays-reviews'

interface SRSDashboardProps {
  onStartReview?: () => void
  onViewAllCards?: () => void
}

export const SRSDashboard: React.FC<SRSDashboardProps> = ({
  onStartReview,
  onViewAllCards
}) => {
  // Use the optimized React Query hook that fetches all data in parallel
  const { stats, activityData = [], isLoading, isError, refetch } = useSRSDashboardData()

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

  if (isError) {
    return (
      <Card className="rounded-2xl bg-white/60 backdrop-blur-sm border border-red-200/50 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-red-600">Error Loading Dashboard</CardTitle>
          <CardDescription>
            There was an error loading your learning statistics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={refetch}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card className="rounded-2xl bg-white/60 backdrop-blur-sm border border-gray-200/50 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle>No Data Available</CardTitle>
          <CardDescription>
            No learning statistics found.
          </CardDescription>
        </CardHeader>
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

      {/* Comprehensive Learning Stats - Combined component replaces separate components */}
      <ComprehensiveLearningStats
        stats={stats}
        activityData={activityData}
        isLoading={isLoading}
        onViewAllCards={onViewAllCards}
      />
    </div>
  )
}

export default SRSDashboard