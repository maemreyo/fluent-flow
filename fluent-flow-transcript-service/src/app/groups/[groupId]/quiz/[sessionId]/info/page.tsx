'use client'

import { use } from 'react'
import { QuestionInfoCard } from '../../../../../../components/groups/quiz/QuestionInfoCard'
import { useQuizFlow } from '../shared/hooks/useQuizFlow'

interface InfoPageProps {
  params: Promise<{
    groupId: string
    sessionId: string
  }>
}

export default function InfoPage({ params }: InfoPageProps) {
  const { groupId, sessionId } = use(params)

  const {
    session,
    difficultyGroups,
    handleQuestionInfoStart,
    navigateToPreview
  } = useQuizFlow({ groupId, sessionId })

  // Debug info page data
  console.log('📊 Info page debug:', {
    difficultyGroups,
    totalQuestions: difficultyGroups.reduce((sum, group) => sum + group.questions.length, 0),
    sessionTitle: session?.title || session?.quiz_title
  })

  const handleStart = () => {
    // Call the existing logic then navigate
    handleQuestionInfoStart()
    // Navigation will be handled by the existing logic or we navigate manually
    setTimeout(() => {
      navigateToPreview()
    }, 100)
  }

  return (
    <div className="relative mx-auto max-w-4xl">
      <QuestionInfoCard
        difficultyGroups={difficultyGroups}
        onStart={handleStart}
        sessionTitle={session?.title || 'Group Session'}
      />
    </div>
  )
}