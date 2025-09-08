'use client'

import { use } from 'react'
import { PermissionManager } from '../../../../../../lib/permissions'
import { GroupQuizResults } from '../components/GroupQuizResults'
import { useQuizFlow } from '../shared/hooks/useQuizFlow'

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
    results,
    handleRestart
  } = useQuizFlow({ groupId, sessionId })

  // Role-based permissions
  const permissions = new PermissionManager(user, group, null)

  // Group settings
  const groupSettings = (group as any)?.settings || {}

  return (
    <div className="mx-auto max-w-6xl">
      <GroupQuizResults
        results={results}
        groupId={groupId}
        sessionId={sessionId}
        onRestart={handleRestart}
        participants={participants}
        showCorrectAnswers={groupSettings.showCorrectAnswers ?? true}
        canRetakeQuiz={permissions.canRetakeQuiz()}
      />
    </div>
  )
}