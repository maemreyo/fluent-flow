'use client'

import { use, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PermissionManager } from '../../../../../../lib/permissions'
import { GroupQuizResults } from '../components/GroupQuizResults'
import { useQuizFlow } from '../shared/hooks/useQuizFlow'
import { fetchUserResults } from '../queries'

interface ResultsPageProps {
  params: Promise<{
    groupId: string
    sessionId: string
  }>
}

export default function ResultsPage({ params }: ResultsPageProps) {
  const { groupId, sessionId } = use(params)

  const {
    group,
    user,
    participants,
    handleRestart,
    navigateToSetup
  } = useQuizFlow({ groupId, sessionId })
  
  // Fetch user's personal results from database
  const { data: userResults, isLoading: userResultsLoading, error: userResultsError } = useQuery({
    queryKey: ['user-results', groupId, sessionId],
    queryFn: () => fetchUserResults(groupId, sessionId),
    enabled: !!groupId && !!sessionId && !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1
  })
  
  // Debug logging
  console.log('🎯 ResultsPage fetched user results:', { userResults, hasResults: !!userResults, loading: userResultsLoading, error: userResultsError })

  // Enhanced restart handler that combines state reset with navigation
  const handleRestartWithNavigation = useCallback(() => {
    // First reset the quiz state
    handleRestart()
    // Then navigate to setup page
    navigateToSetup()
  }, [handleRestart, navigateToSetup])

  // Role-based permissions
  const permissions = new PermissionManager(user, group, null)

  // Group settings
  const groupSettings = (group as any)?.settings || {}

  // Show loading while fetching results
  if (userResultsLoading) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your results...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl">
      <GroupQuizResults
        results={userResults}
        groupId={groupId}
        sessionId={sessionId}
        onRestart={handleRestartWithNavigation}
        participants={participants}
        showCorrectAnswers={groupSettings.showCorrectAnswers ?? true}
        canRetakeQuiz={permissions.canRetakeQuiz()}
      />
    </div>
  )
}