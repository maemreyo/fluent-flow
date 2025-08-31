'use client'

import { ResultsSummary } from '../../../../components/questions/ResultsSummary'
import { QuestionSet } from '../../../../components/questions/QuestionSetInfo'
import { Button } from '../../../../components/ui/button'

interface QuizResultsViewProps {
  results: any
  questionSet: QuestionSet | null
  onRestart: () => void
}

export function QuizResultsView({ results, questionSet, onRestart }: QuizResultsViewProps) {
  if (!results || !questionSet) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No results available</p>
          <Button onClick={onRestart} className="mt-4">
            Start Over
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <ResultsSummary
        results={results}
        onRestart={onRestart}
        videoTitle={questionSet.videoTitle}
        videoUrl={questionSet.videoUrl}
      />
    </div>
  )
}
