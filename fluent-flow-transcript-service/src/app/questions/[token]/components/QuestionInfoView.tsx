'use client'

import { QuestionSetInfo, QuestionSet } from '../../../../components/questions/QuestionSetInfo'
import { Question } from '../../../../components/questions/QuestionCard'

interface QuestionInfoViewProps {
  questionSet: QuestionSet | null
  onStart: () => void
  getAvailableQuestionCounts: (questions: Question[]) => { easy: number; medium: number; hard: number }
}

export function QuestionInfoView({
  questionSet,
  onStart,
  getAvailableQuestionCounts
}: QuestionInfoViewProps) {
  if (!questionSet) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <QuestionSetInfo
        questionSet={questionSet}
        onStart={onStart}
        availableCounts={getAvailableQuestionCounts(questionSet.questions)}
      />
    </div>
  )
}
