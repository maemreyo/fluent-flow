'use client'

import {
  AlertCircle,
  BarChart3,
  CheckCircle,
  Clock,
  Medal,
  TrendingUp,
  Trophy,
  Users
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuizResults } from '../../hooks/useQuizResults'

interface GroupQuizResultsProps {
  groupId: string
  sessionId: string
  sessionTitle?: string
}

export function GroupQuizResults({ groupId, sessionId, sessionTitle }: GroupQuizResultsProps) {
  const { results, stats, loading, error, refetch } = useQuizResults(groupId, sessionId)

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-yellow-600 bg-yellow-50'
      case 2:
        return 'text-gray-600 bg-gray-50'
      case 3:
        return 'text-amber-600 bg-amber-50'
      default:
        return 'text-blue-600 bg-blue-50'
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-600" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-600" />
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />
      default:
        return (
          <span className="flex h-5 w-5 items-center justify-center text-sm font-bold text-blue-600">
            #{rank}
          </span>
        )
    }
  }

  const formatTime = (seconds?: number) => {
    if (!seconds || !isFinite(seconds) || seconds <= 0) return 'N/A'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getUserDisplayName = (result: any) => {
    return result.username || result.user_name || result.user_email || 'Anonymous User'
  }

  const getUserInitial = (result: any) => {
    const displayName = getUserDisplayName(result)
    return displayName.charAt(0).toUpperCase()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="mb-4 h-8 rounded bg-gray-200"></div>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 rounded-xl bg-gray-200"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 rounded-xl bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h3 className="mb-2 text-lg font-semibold text-gray-800">Error Loading Results</h3>
            <p className="mb-4 text-gray-600">{error}</p>
            <Button onClick={refetch} variant="outline">
              <TrendingUp className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {/* <h2 className="text-2xl font-bold text-gray-800">Quiz Results</h2>
          {sessionTitle && (
            <p className="text-gray-600">{sessionTitle}</p>
          )} */}
        </div>
        <Button onClick={refetch} variant="outline">
          <TrendingUp className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Side - Statistics Cards (2x2 Grid) */}
        {stats && (
          <div className="lg:col-span-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Participants</p>
                      <p className="text-2xl font-bold text-gray-800">{stats.total_participants}</p>
                    </div>
                    <Users className="h-8 w-8 text-indigo-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Average Score</p>
                      <p className="text-2xl font-bold text-gray-800">{stats.average_score}%</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Highest Score</p>
                      <p className="text-2xl font-bold text-gray-800">{stats.highest_score}%</p>
                    </div>
                    <Trophy className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                      <p className="text-2xl font-bold text-gray-800">{stats.completion_rate}%</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Right Side - Leaderboard */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
            <CardDescription>Results sorted by score and completion time</CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="py-8 text-center">
                <Trophy className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="text-gray-600">No results yet</p>
                <p className="text-sm text-gray-500">
                  Results will appear here as members complete the quiz
                </p>
              </div>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {results.map((result, index) => {
                  const rank = index + 1

                  return (
                    <div
                      key={result.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-sm ${
                        rank <= 3
                          ? 'border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      {/* Rank */}
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${getRankColor(rank)}`}
                      >
                        {rank <= 3 ? getRankIcon(rank) : rank}
                      </div>

                      {/* User Info */}
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-500 text-sm font-bold text-white">
                            {getUserInitial(result)}
                          </div>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-800">
                            {getUserDisplayName(result)}
                          </p>
                          {/* <p className="text-xs text-gray-500">
                            {new Date(result.completed_at).toLocaleDateString()}
                          </p> */}
                        </div>
                      </div>

                      {/* Score & Stats */}
                      <div className="flex items-center gap-4">
                        <p className="text-lg font-bold text-gray-800">{result.score}%</p>
                        <p className="text-xs text-gray-500">
                          {/* {result.correct_answers}/{result.total_questions} */}
                        </p>

                        {/* Time */}
                        {/* <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(result.time_taken_seconds)}</span>
                        </div> */}

                        {/* Badge for winner */}
                        {/* {rank === 1 && (
                          <Badge
                            variant="secondary"
                            className="bg-yellow-100 text-xs text-yellow-800"
                          >
                            🏆
                          </Badge>
                        )} */}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Analytics - Temporarily Hidden */}
      {/* {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Analytics</CardTitle>
            <CardDescription>
              Detailed breakdown of group performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Score Distribution</h4>
                <div className="space-y-2">
                  {[
                    { range: '90-100%', color: 'bg-green-500', count: results.filter(r => r.score >= 90).length },
                    { range: '80-89%', color: 'bg-blue-500', count: results.filter(r => r.score >= 80 && r.score < 90).length },
                    { range: '70-79%', color: 'bg-yellow-500', count: results.filter(r => r.score >= 70 && r.score < 80).length },
                    { range: 'Below 70%', color: 'bg-red-500', count: results.filter(r => r.score < 70).length }
                  ].map((item) => (
                    <div key={item.range} className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded ${item.color}`}></div>
                      <span className="text-sm flex-1">{item.range}</span>
                      <span className="text-sm font-semibold">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Time Analysis</h4>
                <div className="space-y-2">
                  {(() => {
                    const { min, max, avg } = getTimesWithValidData()
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Fastest:</span>
                          <span className="text-sm font-semibold">
                            {formatTime(min || undefined)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Average:</span>
                          <span className="text-sm font-semibold">
                            {formatTime(avg || undefined)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Slowest:</span>
                          <span className="text-sm font-semibold">
                            {formatTime(max || undefined)}
                          </span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Insights</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-500" />
                    <span>{results.filter(r => r.score >= stats!.average_score).length} above average</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                    <span>{results.filter(r => r.score === 100).length} perfect scores</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-500" />
                    <span>{results.filter(r => r.time_taken_seconds && r.time_taken_seconds < 300).length} completed in under 5 min</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )} */}
    </div>
  )
}
