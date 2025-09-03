'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Medal, Users, Clock, TrendingUp, RotateCcw, Share2 } from 'lucide-react'
import { fetchGroupResults } from '../queries'
import type { SessionParticipant } from '../../../components/sessions/queries'

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

  // Fetch group results for leaderboard
  const { data: groupResults, isLoading: groupResultsLoading } = useQuery({
    queryKey: ['group-results', groupId, sessionId],
    queryFn: () => fetchGroupResults(groupId, sessionId),
    enabled: !!groupId && !!sessionId
  })

  const getInitials = (email: string, username?: string) => {
    if (username) {
      return username.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.split('@')[0].slice(0, 2).toUpperCase()
  }

  const getDisplayName = (email: string, username?: string) => {
    return username || email.split('@')[0]
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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Sort results by score for leaderboard
  const sortedResults = groupResults?.slice().sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.time_taken - b.time_taken // Faster time wins if same score
  }) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            Quiz Complete! 🎉
          </h1>
          <p className="text-gray-600">
            Great job completing the group quiz session
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center">
          <div className="bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('personal')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'personal'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Your Results
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-indigo-600 mb-2">
                  {results.score}%
                </div>
                <p className="text-sm text-gray-600">Your Score</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {results.correctAnswers}/{results.totalQuestions}
                </div>
                <p className="text-sm text-gray-600">Correct Answers</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
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
                  <TrendingUp className="w-5 h-5" />
                  Question Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {results.results.map((result: any, index: number) => (
                    <div
                      key={result.questionId}
                      className={`p-4 rounded-lg border-l-4 ${
                        result.isCorrect
                          ? 'bg-green-50 border-l-green-500'
                          : 'bg-red-50 border-l-red-500'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-800">
                          Question {index + 1}
                        </h4>
                        <Badge
                          className={
                            result.isCorrect
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-red-100 text-red-800 border-red-200'
                          }
                        >
                          {result.isCorrect ? 'Correct' : 'Incorrect'}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-3">
                        {result.question}
                      </p>
                      
                      <div className="text-sm space-y-1">
                        <div>
                          <span className="font-medium text-gray-600">Your answer: </span>
                          <span className={result.isCorrect ? 'text-green-700' : 'text-red-700'}>
                            {result.userAnswer}
                          </span>
                        </div>
                        {!result.isCorrect && (
                          <div>
                            <span className="font-medium text-gray-600">Correct answer: </span>
                            <span className="text-green-700">{result.correctAnswer}</span>
                          </div>
                        )}
                      </div>
                      
                      {result.explanation && (
                        <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
                          {result.explanation}
                        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {participants.length}
                </div>
                <p className="text-sm text-gray-600">Total Participants</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {sortedResults.length}
                </div>
                <p className="text-sm text-gray-600">Completed Quiz</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-indigo-600 mb-2">
                  {sortedResults.length > 0 
                    ? Math.round(sortedResults.reduce((acc, r) => acc + r.score, 0) / sortedResults.length)
                    : 0}%
                </div>
                <p className="text-sm text-gray-600">Average Score</p>
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                Group Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {groupResultsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading results...</p>
                </div>
              ) : sortedResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Trophy className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p>No results available yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedResults.map((result, index) => (
                    <div
                      key={result.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        result.user_id === results?.userData?.userId
                          ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/30'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {/* Rank */}
                      <div className={`flex items-center justify-center w-12 h-12 rounded-full border ${getRankColor(index + 1)}`}>
                        {getRankIcon(index + 1)}
                      </div>

                      {/* User Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                        {getInitials(result.user_email, result.username)}
                      </div>

                      {/* User Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-800">
                            {getDisplayName(result.user_email, result.username)}
                          </p>
                          {result.user_id === results?.userData?.userId && (
                            <Badge className="text-xs bg-indigo-100 text-indigo-700 border-indigo-200">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{result.score}% ({result.total_questions} questions)</span>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(result.time_taken)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Score Badge */}
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        result.score >= 80
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : result.score >= 60
                          ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                          : 'bg-red-100 text-red-700 border border-red-200'
                      }`}>
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
      <div className="flex justify-center gap-4">
        <Button
          onClick={onRestart}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
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
            }
          }}
          className="flex items-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          Share Results
        </Button>
      </div>
    </div>
  )
}