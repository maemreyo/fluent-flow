'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { SessionParticipant } from '../../../components/sessions/queries'
import { fetchGroupResults } from '../queries'
import { QuizResultsHeader } from '@/components/groups/quiz/results/QuizResultsHeader'
import { PersonalStatsCards } from '@/components/groups/quiz/results/PersonalStatsCards'
import { QuestionReviewList } from '@/components/groups/quiz/results/QuestionReviewList'
import { LeaderboardSection } from '@/components/groups/quiz/results/LeaderboardSection'
import { ResultsActionButtons } from '@/components/groups/quiz/results/ResultsActionButtons'

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
  const { data: groupResults, isLoading: groupResultsLoading, refetch: refetchGroupResults } = useQuery({
    queryKey: ['group-results', groupId, sessionId],
    queryFn: () => fetchGroupResults(groupId, sessionId),
    enabled: !!groupId && !!sessionId,
    staleTime: 2 * 60 * 1000, // 2 minutes - allow more frequent updates
    refetchInterval: false, // Disable auto-refetch
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
    retry: 1 // Only retry once on failure
  })

  // Manual refresh function for leaderboard
  const handleRefreshLeaderboard = async () => {
    await refetchGroupResults()
  }

  // Calculate group rank for personal stats
  const sortedResults = groupResults?.slice().sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.time_taken - b.time_taken // Faster time wins if same score
  }) || []
  
  const groupRank = sortedResults.findIndex(r => r.user_id === results?.userData?.userId) + 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <QuizResultsHeader 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      {activeTab === 'personal' && results && (
        <div className="space-y-6">
          {/* Personal Stats Cards */}
          <PersonalStatsCards 
            results={results}
            groupRank={groupRank}
          />

          {/* Question Review */}
          {results.results && results.results.length > 0 && (
            <QuestionReviewList results={results} />
          )}
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <LeaderboardSection
          participants={participants}
          groupResults={groupResults}
          isLoading={groupResultsLoading}
          onRefresh={handleRefreshLeaderboard}
          currentUserResults={results}
        />
      )}

      {/* Action Buttons */}
      <ResultsActionButtons
        groupId={groupId}
        onRestart={onRestart}
        userScore={results?.score}
      />
    </div>
  )
}
