'use client'

import { Card, CardContent } from '../../../ui/card'

interface PersonalStatsCardsProps {
  results: {
    score: number
    correctAnswers: number
    totalQuestions: number
    userData?: {
      userId: string
    }
  }
  groupRank: number
}

export function PersonalStatsCards({ results, groupRank }: PersonalStatsCardsProps) {
  return (
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
            {groupRank || '?'}
          </div>
          <p className="text-sm text-gray-600">Group Rank</p>
        </CardContent>
      </Card>
    </div>
  )
}