import React from 'react'
import {
  AlertCircle,
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Play
} from 'lucide-react'
import type { ConversationQuestion, SavedLoop } from '../../lib/types/fluent-flow-types'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { QuestionShareButton } from '../question-share-button'

interface QuestionsSectionCollapsibleProps {
  questions: ConversationQuestion[] | null
  isLoading: boolean
  error: any
  onGenerate: () => void
  onPractice: () => void
  integrationService: any
  loop: SavedLoop
  backendUrl?: string
  defaultExpanded?: boolean
}

export const QuestionsSectionCollapsible: React.FC<QuestionsSectionCollapsibleProps> = ({
  questions,
  isLoading,
  error,
  onGenerate,
  onPractice,
  integrationService,
  loop,
  backendUrl = 'http://localhost:3838',
  defaultExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
            <Brain className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium text-gray-900">Questions</h3>
          </div>

          {questions && (
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-blue-200 bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                {questions.length} questions
              </span>
            </div>
          )}

          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="text-gray-300">•</span>
          {error && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs">Error</span>
            </div>
          )}

          {questions && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs">Ready</span>
            </div>
          )}
          <span className="text-gray-300">•</span>
          <span>{isExpanded ? 'Hide' : 'Show'}</span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-4 pb-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              <span className="text-sm text-gray-600">Generating questions...</span>
            </div>
          )}

          {error && (
            <div className="py-6 text-center">
              <div className="mb-3 flex items-center justify-center gap-1 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Failed to load questions</span>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={onGenerate}
                disabled={isLoading || !integrationService}
              >
                <Brain className="h-4 w-4" />
                Generate Questions
              </Button>
            </div>
          )}

          {!questions && !isLoading && !error && (
            <div className="py-6 text-center">
              <p className="mb-3 text-sm text-gray-600">No questions available for this segment.</p>
              <Button
                variant="default"
                size="sm"
                onClick={onGenerate}
                disabled={isLoading || !integrationService}
              >
                <Brain className="h-4 w-4" />
                Generate Questions
              </Button>
            </div>
          )}

          {questions && questions.length > 0 && (
            <div className="space-y-4 pt-4">
              {/* Question preview */}
              <div className="space-y-2">
                {questions.slice(0, 2).map((question, index) => (
                  <div key={index} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-sm font-medium text-gray-800">{question.question}</p>
                    {question.difficulty && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {question.difficulty}
                      </Badge>
                    )}
                  </div>
                ))}
                {questions.length > 2 && (
                  <p className="text-xs text-gray-500">+{questions.length - 2} more questions</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={onPractice}
                  title="Start interactive practice session with generated questions"
                >
                  <Play className="h-4 w-4" />
                  Practice
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onGenerate}
                  disabled={isLoading}
                  title="Generate new questions from the transcript"
                >
                  <Brain className="h-4 w-4" />
                  Regenerate
                </Button>
                <QuestionShareButton
                  questions={{
                    loopId: loop.id,
                    questions: questions,
                    metadata: {
                      totalQuestions: questions.length,
                      analysisDate: new Date().toISOString(),
                      generatedFromTranscript: true,
                      canRegenerateQuestions: true
                    }
                  }}
                  loop={loop}
                  className="flex-shrink-0"
                  backendUrl={backendUrl}
                />
              </div>

              {/* Stats footer */}
              <div className="border-t border-gray-100 pt-3 text-xs text-gray-500">
                <div className="flex items-center justify-between">
                  <span>{questions.length} questions available</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default QuestionsSectionCollapsible
