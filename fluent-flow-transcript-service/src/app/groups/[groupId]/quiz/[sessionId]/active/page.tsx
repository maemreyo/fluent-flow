'use client'

import { use } from 'react'
import { GroupQuizActiveView } from '../components/GroupQuizActiveView'
import { useQuizFlow } from '../shared/hooks/useQuizFlow'

interface ActivePageProps {
  params: Promise<{
    groupId: string
    sessionId: string
  }>
}

export default function ActivePage({ params }: ActivePageProps) {
  const { groupId, sessionId } = use(params)

  const {
    session,
    group,
    participants,
    onlineParticipants,
    user,
    getCurrentQuestion,
    responses,
    handleAnswerSelect,
    moveToNextQuestion,
    submitCurrentSet,
    moveToNextSet,
    isLastQuestionInSet,
    allQuestionsInSetAnswered,
    submitting,
    currentSetIndex,
    currentQuestionIndex,
    difficultyGroups,
    handleNavigateToQuestion,
    handleNavigatePrevious,
    handleNavigateNext
  } = useQuizFlow({ groupId, sessionId })

  // Group settings
  const groupSettings = (group as any)?.settings || {}

  return (
    <div className="mx-auto max-w-4xl">
      <GroupQuizActiveView
        currentQuestion={getCurrentQuestion()}
        responses={responses}
        onAnswerSelect={handleAnswerSelect}
        onNextQuestion={moveToNextQuestion}
        onSubmitSet={submitCurrentSet}
        onMoveToNextSet={moveToNextSet}
        isLastQuestion={isLastQuestionInSet()}
        allAnswered={allQuestionsInSetAnswered()}
        submitting={submitting}
        currentSetIndex={currentSetIndex}
        totalSets={difficultyGroups.length}
        participants={participants}
        onlineParticipants={onlineParticipants}
        timeLimit={
          groupSettings.enforceQuizTimeLimit
            ? groupSettings.defaultQuizTimeLimit || 30
            : null
        }
        allowQuestionSkipping={groupSettings.allowSkippingQuestions ?? false}
        currentQuestionIndex={currentQuestionIndex}
        quizSettings={groupSettings}
        onNavigateToQuestion={handleNavigateToQuestion}
        onNavigatePrevious={handleNavigatePrevious}
        onNavigateNext={handleNavigateNext}
        totalQuestionsInCurrentSet={getCurrentQuestion()?.groupData?.questions?.length || 0}
      />
    </div>
  )
}