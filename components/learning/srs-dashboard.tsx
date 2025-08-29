import React, { useEffect, useState } from 'react'
import {
  BookOpen,
  Brain,
  Calendar,
  Clock,
  Flame,
  Target,
  TrendingUp,
  Trophy,
  Zap,
  ChevronRight
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { srsService, type SRSStats } from '../../lib/services/srs-service'

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
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      const srsStats = await srsService.getStats()
      setStats(srsStats)
      generateHeatmapData() // Mock for now
    } catch (error) {
      console.error('Failed to load SRS dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateHeatmapData = () => {
    // Generate last 100 days of mock data
    const data: HeatmapData[] = []
    const today = new Date()
    
    for (let i = 99; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const count = Math.floor(Math.random() * 20) // Mock review count
      data.push({
        date: date.toISOString().split('T')[0],
        count
      })
    }
    
    setHeatmapData(data)
  }

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-muted'
    if (count <= 5) return 'bg-green-200 dark:bg-green-900'
    if (count <= 10) return 'bg-green-300 dark:bg-green-800'
    if (count <= 15) return 'bg-green-400 dark:bg-green-700'
    return 'bg-green-500 dark:bg-green-600'
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
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold">Learning Dashboard</h1>
        <p className="text-muted-foreground">
          Track your progress with spaced repetition learning
        </p>
      </header>

      {/* Daily Review Section */}
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

      {/* Stats Grid */}
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

      {/* Learning Streak */}
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

      {/* Activity Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Review Activity
          </CardTitle>
          <CardDescription>
            Your learning activity over the past 100 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Heatmap Grid */}
            <div className="grid grid-cols-10 gap-1 sm:grid-cols-20">
              {heatmapData.map((day, index) => (
                <div
                  key={index}
                  className={cn(
                    'aspect-square rounded-sm',
                    getHeatmapColor(day.count)
                  )}
                  title={`${day.date}: ${day.count} reviews`}
                />
              ))}
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-sm bg-muted" />
                <div className="h-3 w-3 rounded-sm bg-green-200 dark:bg-green-900" />
                <div className="h-3 w-3 rounded-sm bg-green-300 dark:bg-green-800" />
                <div className="h-3 w-3 rounded-sm bg-green-400 dark:bg-green-700" />
                <div className="h-3 w-3 rounded-sm bg-green-500 dark:bg-green-600" />
              </div>
              <span>More</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Overview */}
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
    </div>
  )
}

export default SRSDashboard