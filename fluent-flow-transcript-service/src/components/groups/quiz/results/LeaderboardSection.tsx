'use client'

import { Medal, Trophy, RefreshCw } from 'lucide-react'
import { Badge } from '../../../ui/badge'
import { Button } from '../../../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card'
import type { SessionParticipant } from '../../../../app/groups/[groupId]/components/sessions/queries'

interface GroupQuizResult {
  id: string
  session_id: string
  user_id: string
  score: number
  total_questions: number
  time_taken: number
  answers_data: any
  completed_at: string
  user_email: string
  username?: string
}

interface LeaderboardSectionProps {
  participants: SessionParticipant[]
  groupResults: GroupQuizResult[] | undefined
  isLoading: boolean
  onRefresh: () => void
  currentUserResults?: {
    userData?: {
      userId: string
    }
  }
}

export function LeaderboardSection({
  participants,
  groupResults,
  isLoading,
  onRefresh,
  currentUserResults
}: LeaderboardSectionProps) {
  const getInitials = (email?: string | null, username?: string | null) => {
    if (username && username.trim()) {
      return username
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (email && email.includes('@')) {
      return email.split('@')[0].slice(0, 2).toUpperCase()
    }
    return '??'
  }

  const getDisplayName = (email?: string | null, username?: string | null) => {
    if (username && username.trim()) {
      return username.trim()
    }
    if (email && email.includes('@')) {
      return email.split('@')[0]
    }
    return 'Unknown User'
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

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 2:
        return 'text-gray-600 bg-gray-50 border-gray-200'
      case 3:
        return 'text-amber-600 bg-amber-50 border-amber-200'
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  // Sort results by score for leaderboard
  const sortedResults =
    groupResults?.slice().sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.time_taken - b.time_taken // Faster time wins if same score
    }) || []

  return (
    <div className="space-y-6">
      {/* Group Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="mb-2 text-3xl font-bold text-blue-600">{participants.length}</div>
            <p className="text-sm text-gray-600">Total Participants</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="mb-2 text-3xl font-bold text-green-600">{sortedResults.length}</div>
            <p className="text-sm text-gray-600">Completed Quiz</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="mb-2 text-3xl font-bold text-indigo-600">
              {sortedResults.length > 0
                ? Math.round(
                    sortedResults.reduce((acc, r) => acc + r.score, 0) / sortedResults.length
                  )
                : 0}
              %
            </div>
            <p className="text-sm text-gray-600">Average Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Group Leaderboard
            </CardTitle>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onRefresh}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading results...</p>
            </div>
          ) : sortedResults.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Trophy className="mx-auto mb-3 h-8 w-8 opacity-50" />
              <p>No results available yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedResults.map((result, index) => (
                <div
                  key={result.id}
                  className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
                    result.user_id === currentUserResults?.userData?.userId
                      ? 'border-indigo-200 bg-indigo-50 ring-2 ring-indigo-500/30'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {/* Rank */}
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full border ${getRankColor(index + 1)}`}
                  >
                    {getRankIcon(index + 1)}
                  </div>

                  {/* User Avatar */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-sm font-bold text-white">
                    {getInitials(result.user_email, result.username)}
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800">
                        {getDisplayName(result.user_email, result.username)}
                      </p>
                      {result.user_id === currentUserResults?.userData?.userId && (
                        <Badge className="border-indigo-200 bg-indigo-100 text-xs text-indigo-700">
                          You
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Score Badge */}
                  <div
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      result.score >= 80
                        ? 'border border-green-200 bg-green-100 text-green-700'
                        : result.score >= 60
                          ? 'border border-yellow-200 bg-yellow-100 text-yellow-700'
                          : 'border border-red-200 bg-red-100 text-red-700'
                    }`}
                  >
                    {result.score}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}