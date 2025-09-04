'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Home, Medal, RotateCcw, Share2, TrendingUp, Trophy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SessionParticipant } from '../../../components/sessions/queries'
import { fetchGroupResults } from '../queries'

interface GroupQuizResultsProps {
  results: any
  groupId: string
  sessionId: string
  onRestart: () => void
  participants: SessionParticipant[]
}

export function GroupQuizResults({
  results,
  groupId,
  sessionId,
  onRestart,
  participants
}: GroupQuizResultsProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'leaderboard'>('personal')

  // Fetch group results for leaderboard with proper caching
  const { data: groupResults, isLoading: groupResultsLoading } = useQuery({
    queryKey: ['group-results', groupId, sessionId],
    queryFn: () => fetchGroupResults(groupId, sessionId),
    enabled: !!groupId && !!sessionId,
    staleTime: 10 * 60 * 1000, // 10 minutes - results don't change often
    refetchInterval: false, // Disable auto-refetch
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
    retry: 1 // Only retry once on failure
  })

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

  // Removed unused formatTime function

  // Sort results by score for leaderboard
  const sortedResults =
    groupResults?.slice().sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.time_taken - b.time_taken // Faster time wins if same score
    }) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4 text-center">
        <div className="space-y-2">
          <h1 className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-3xl font-bold text-transparent">
            Quiz Complete! 🎉
          </h1>
          <p className="text-gray-600">Great job completing the group quiz session</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center">
          <div className="rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setActiveTab('personal')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'personal'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Your Results
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'leaderboard'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Group Leaderboard
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'personal' && results && (
        <div className="space-y-6">
          {/* Personal Stats Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="mb-2 text-3xl font-bold text-indigo-600">{results.score}%</div>
                <p className="text-sm text-gray-600">Your Score</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="mb-2 text-3xl font-bold text-green-600">
                  {results.correctAnswers}/{results.totalQuestions}
                </div>
                <p className="text-sm text-gray-600">Correct Answers</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="mb-2 text-3xl font-bold text-blue-600">
                  {sortedResults.findIndex(r => r.user_id === results.userData?.userId) + 1 || '?'}
                </div>
                <p className="text-sm text-gray-600">Group Rank</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Results */}
          {results.results && results.results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Question Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Summary Stats */}
                <div className="mb-6 grid grid-cols-3 gap-4 rounded-lg bg-gray-50 p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {results.results.filter((r: any) => r.isCorrect).length}
                    </div>
                    <div className="text-xs text-gray-600">Correct</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {results.results.filter((r: any) => !r.isCorrect).length}
                    </div>
                    <div className="text-xs text-gray-600">Incorrect</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{results.totalQuestions}</div>
                    <div className="text-xs text-gray-600">Total</div>
                  </div>
                </div>

                {/* Questions Grid */}
                <div className="grid max-h-96 grid-cols-1 gap-3 overflow-y-auto md:grid-cols-2">
                  {results.results.map((result: any, index: number) => (
                    <div
                      key={result.questionId}
                      className={`rounded-lg border p-3 transition-all hover:shadow-sm ${
                        result.isCorrect
                          ? 'border-green-200 bg-green-50 hover:bg-green-100'
                          : 'border-red-200 bg-red-50 hover:bg-red-100'
                      }`}
                    >
                      {/* Question Header */}
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              result.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                            }`}
                          >
                            {index + 1}
                          </div>
                          <span
                            className={`rounded px-2 py-1 text-xs ${
                              result.isCorrect
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {result.isCorrect ? '✓' : '✗'}
                          </span>
                        </div>
                      </div>

                      {/* Question Text */}
                      <p className="mb-2 line-clamp-2 text-sm text-gray-700">{result.question}</p>

                      {/* Answers */}
                      <div className="space-y-1 text-xs">
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 text-gray-500">Your:</span>
                          <span
                            className={`font-medium ${result.isCorrect ? 'text-green-700' : 'text-red-700'}`}
                          >
                            {result.userAnswer}
                          </span>
                        </div>
                        {!result.isCorrect && (
                          <div className="flex items-start gap-2">
                            <span className="shrink-0 text-gray-500">Correct:</span>
                            <span className="font-medium text-green-700">
                              {result.correctAnswer}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Explanation (Collapsed by default) */}
                      {result.explanation && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800">
                            View explanation
                          </summary>
                          <div className="mt-1 rounded bg-blue-50 p-2 text-xs text-blue-800">
                            {result.explanation}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'leaderboard' && (
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
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                Group Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {groupResultsLoading ? (
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
                        result.user_id === results?.userData?.userId
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
                          {result.user_id === results?.userData?.userId && (
                            <Badge className="border-indigo-200 bg-indigo-100 text-xs text-indigo-700">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {/* <span>{result.score}% ({result.total_questions} questions)</span> */}
                          {/* <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(result.time_taken)}</span>
                          </div> */}
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
      )}

      {/* Action Buttons */}
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        {/* Primary Actions */}
        <div className="flex gap-3">
          <Button
            onClick={() => (window.location.href = `/groups/${groupId}`)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Group
          </Button>

          <Button onClick={onRestart} className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
        </div>

        {/* Secondary Actions */}
        <div className="flex gap-3">
          <Button
            onClick={() => (window.location.href = '/groups')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            All Groups
          </Button>

          <Button
            onClick={() => {
              // Share results functionality
              if (navigator.share) {
                navigator.share({
                  title: 'Group Quiz Results',
                  text: `I scored ${results?.score || 0}% in our group quiz!`,
                  url: window.location.href
                })
              } else {
                // Fallback: copy to clipboard
                navigator.clipboard?.writeText(
                  `I scored ${results?.score || 0}% in our group quiz! ${window.location.href}`
                )
              }
            }}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>
    </div>
  )
}
