import React, { useEffect, useState } from 'react'
import {
  AlertCircle,
  BarChart3,
  Brain,
  Calendar,
  CheckCircle,
  Clock,
  Play,
  Target,
  TrendingUp,
  Trophy,
  Users
} from 'lucide-react'
import { srsService, type SRSStats } from '../../lib/services/srs-service'
import type { SavedLoop } from '../../lib/types/fluent-flow-types'
import EnhancedSRSFlashcard from '../learning/enhanced-srs-flashcard'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'

interface SpacedRepetitionTabProps {
  currentLoop?: SavedLoop | null
}

export const SpacedRepetitionTab: React.FC<SpacedRepetitionTabProps> = ({ currentLoop }) => {
  const [stats, setStats] = useState<SRSStats | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setIsLoading(true)
    try {
      const srsStats = await srsService.getStats()
      setStats(srsStats)
    } catch (error) {
      console.error('Failed to load SRS stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartReview = () => {
    setIsReviewing(true)
  }

  const handleCompleteReview = () => {
    setIsReviewing(false)
    loadStats() // Refresh stats after review
  }

  if (isReviewing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Brain className="h-5 w-5" />
            Spaced Repetition Review
          </h2>
          <Button variant="outline" onClick={() => setIsReviewing(false)}>
            Exit Review
          </Button>
        </div>

        <EnhancedSRSFlashcard
          onComplete={handleCompleteReview}
          loopId={currentLoop?.id} // Use current loop for contextual learning cache
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Brain className="h-5 w-5" />
            Spaced Repetition System
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review vocabulary with examples and collocations
          </p>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Brain className="mr-2 h-6 w-6 animate-pulse text-blue-500" />
            <span className="text-muted-foreground">Loading SRS statistics...</span>
          </CardContent>
        </Card>
      ) : stats ? (
        <>
          {/* Statistics Overview */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-red-500" />
                  Due Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.dueToday}</div>
                <p className="text-xs text-muted-foreground">Cards ready for review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4 text-blue-500" />
                  Total Cards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCards}</div>
                <p className="text-xs text-muted-foreground">In your deck</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Accuracy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.accuracyRate}%</div>
                <p className="text-xs text-muted-foreground">Overall accuracy</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.currentStreak}</div>
                <p className="text-xs text-muted-foreground">Current streak</p>
              </CardContent>
            </Card>
          </div>

          {/* Learning Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Learning Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* New Cards */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium">New Cards</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{stats.newCards}</Badge>
                    <div className="w-24">
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
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{stats.learningCards}</Badge>
                    <div className="w-24">
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
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{stats.reviewCards}</Badge>
                    <div className="w-24">
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
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{stats.matureCards}</Badge>
                    <div className="w-24">
                      <Progress
                        value={(stats.matureCards / stats.totalCards) * 100}
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Start Review Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Start Review Session
              </CardTitle>
              <CardDescription>
                Review vocabulary with AI-generated examples and collocations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.dueToday > 0 ? (
                  <>
                    <div className="flex items-center gap-4 rounded-lg bg-blue-50 p-4">
                      <Clock className="h-8 w-8 text-blue-600" />
                      <div className="flex-1">
                        <h3 className="font-medium">Ready for Review</h3>
                        <p className="text-sm text-muted-foreground">
                          {stats.dueToday} cards are due for review today
                        </p>
                      </div>
                      <Button onClick={handleStartReview} size="lg">
                        <Play className="mr-2 h-4 w-4" />
                        Start Review
                      </Button>
                    </div>

                    {/* Enhanced Features Info */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-lg border p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <Target className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">AI Examples</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Contextual usage examples from your loops
                        </p>
                      </div>

                      <div className="rounded-lg border p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">Smart Caching</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          No API cost for previously generated content
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
                    <h3 className="mb-2 font-medium">All caught up!</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      No cards are due for review today. Come back tomorrow or add more vocabulary.
                    </p>
                    <div className="flex justify-center gap-2">
                      <Button variant="outline" onClick={loadStats}>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Refresh Stats
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Learning Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">💡 SRS Learning Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  • <strong>Consistency is key:</strong> Review daily for best results
                </p>
                <p>
                  • <strong>Be honest:</strong> Rate your recall accurately for optimal scheduling
                </p>
                <p>
                  • <strong>Use examples:</strong> Study the AI-generated examples to understand
                  context
                </p>
                <p>
                  • <strong>Practice collocations:</strong> Learn word patterns for natural usage
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="mx-auto mb-4 h-8 w-8 text-orange-500" />
              <p className="mb-2 text-lg font-medium">No vocabulary data found</p>
              <p className="text-muted-foreground">
                Start learning by analyzing video transcripts in the Loops tab.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default SpacedRepetitionTab
