'use client'

import { useState, useEffect } from 'react'
import { 
  Trophy, 
  Users, 
  Target, 
  Clock,
  Medal,
  BarChart3,
  TrendingUp,
  CheckCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'

interface QuizResult {
  id: string
  user_id: string
  user_name: string
  score: number
  total_questions: number
  correct_answers: number
  time_taken_seconds?: number
  completed_at: string
  result_data: any
}

interface SessionStats {
  total_participants: number
  average_score: number
  highest_score: number
  completion_rate: number
}

interface GroupQuizResultsProps {
  groupId: string
  sessionId: string
  sessionTitle?: string
}

export function GroupQuizResults({ groupId, sessionId, sessionTitle }: GroupQuizResultsProps) {
  const [results, setResults] = useState<QuizResult[]>([])
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchResults()
  }, [groupId, sessionId])

  const fetchResults = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/results`)
      const data = await response.json()
      
      if (response.ok) {
        setResults(data.results || [])
        setStats(data.stats)
      } else {
        console.error('Error fetching results:', data.error)
      }
    } catch (error) {
      console.error('Error fetching results:', error)
    } finally {
      setLoading(false)
    }
  }

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
        return <Trophy className="w-5 h-5 text-yellow-600" />
      case 2:
        return <Medal className="w-5 h-5 text-gray-600" />
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-blue-600">#{rank}</span>
    }
  }

  const formatTime = (seconds?: number) => {
    if (!seconds) return 'N/A'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-xl"></div>
            ))}
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
          <h2 className="text-2xl font-bold text-gray-800">Quiz Results</h2>
          {sessionTitle && (
            <p className="text-gray-600">{sessionTitle}</p>
          )}
        </div>
        <Button onClick={fetchResults} variant="outline">
          <TrendingUp className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Participants</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.total_participants}</p>
                </div>
                <Users className="w-8 h-8 text-indigo-500" />
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
                <BarChart3 className="w-8 h-8 text-green-500" />
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
                <Trophy className="w-8 h-8 text-yellow-500" />
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
                <CheckCircle className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results List */}
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>
            Results sorted by score and completion time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No results yet</p>
              <p className="text-sm text-gray-500">Results will appear here as members complete the quiz</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((result, index) => {
                const rank = index + 1
                const accuracy = Math.round((result.correct_answers / result.total_questions) * 100)
                
                return (
                  <div 
                    key={result.id} 
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md ${
                      rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {/* Rank */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${getRankColor(rank)}`}>
                      {getRankIcon(rank)}
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="w-10 h-10">
                        <div className="w-full h-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {result.user_name.charAt(0).toUpperCase()}
                        </div>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-gray-800">{result.user_name}</p>
                        <p className="text-sm text-gray-600">
                          Completed {new Date(result.completed_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-800">{result.score}%</p>
                      <p className="text-sm text-gray-600">Score</p>
                    </div>

                    {/* Accuracy */}
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-800">
                        {result.correct_answers}/{result.total_questions}
                      </p>
                      <p className="text-sm text-gray-600">{accuracy}% correct</p>
                    </div>

                    {/* Time */}
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          {formatTime(result.time_taken_seconds)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-24">
                      <Progress 
                        value={result.score} 
                        className="h-2"
                      />
                      <p className="text-xs text-gray-500 text-center mt-1">
                        Progress
                      </p>
                    </div>

                    {/* Badge for top performers */}
                    {rank === 1 && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        🏆 Winner
                      </Badge>
                    )}
                    {result.score === 100 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        ✨ Perfect
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Analytics */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Analytics</CardTitle>
            <CardDescription>
              Detailed breakdown of group performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Score Distribution */}
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

              {/* Time Analysis */}
              <div>
                <h4 className="font-semibold mb-3">Time Analysis</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Fastest:</span>
                    <span className="text-sm font-semibold">
                      {formatTime(Math.min(...results.filter(r => r.time_taken_seconds).map(r => r.time_taken_seconds!)))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Average:</span>
                    <span className="text-sm font-semibold">
                      {formatTime(Math.round(
                        results.filter(r => r.time_taken_seconds).reduce((sum, r) => sum + (r.time_taken_seconds || 0), 0) / 
                        results.filter(r => r.time_taken_seconds).length
                      ))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Slowest:</span>
                    <span className="text-sm font-semibold">
                      {formatTime(Math.max(...results.filter(r => r.time_taken_seconds).map(r => r.time_taken_seconds!)))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Participation Insights */}
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
      )}
    </div>
  )
}