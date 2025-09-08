'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../../../../../components/ui/button'

interface QuestionNavigationBarProps {
  currentQuestionIndex: number
  totalQuestions: number
  responses: Array<{ questionIndex: number; answer: string }>
  onNavigateToQuestion: (questionIndex: number) => void
  onPrevious: () => void
  onNext: () => void
  allowNavigation: boolean
  disabled?: boolean
}

export function QuestionNavigationBar({
  currentQuestionIndex,
  totalQuestions,
  responses,
  onNavigateToQuestion,
  onPrevious,
  onNext,
  allowNavigation,
  disabled = false
}: QuestionNavigationBarProps) {
  const getQuestionStatus = (questionIndex: number) => {
    const hasAnswer = responses.some(r => r.questionIndex === questionIndex && r.answer)
    if (questionIndex === currentQuestionIndex) return 'current'
    if (hasAnswer) return 'answered'
    return 'unanswered'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'bg-blue-600 text-white border-blue-600'
      case 'answered': return 'bg-green-100 text-green-800 border-green-300'
      case 'unanswered': return 'bg-gray-100 text-gray-600 border-gray-300'
      default: return 'bg-gray-100 text-gray-600 border-gray-300'
    }
  }

  if (!allowNavigation) {
    return (
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              Question Progress:
            </span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
              <span className="text-sm text-gray-600">
                {currentQuestionIndex + 1} of {totalQuestions}
              </span>
            </div>
          </div>
          <div className="w-full max-w-xs bg-gray-200 rounded-full h-2 ml-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={disabled || currentQuestionIndex <= 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={disabled || currentQuestionIndex >= totalQuestions - 1}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Question Grid Navigation */}
      <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 gap-1">
        {Array.from({ length: totalQuestions }, (_, index) => {
          const status = getQuestionStatus(index)
          return (
            <button
              key={index}
              onClick={() => onNavigateToQuestion(index)}
              disabled={disabled}
              className={`
                w-8 h-8 text-xs font-medium rounded border-2 transition-all duration-200
                hover:scale-110 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500
                ${getStatusColor(status)}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              title={`Question ${index + 1} - ${status}`}
            >
              {index + 1}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-600 rounded border-2 border-blue-600"></div>
          <span className="text-gray-600">Current</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-100 rounded border-2 border-green-300"></div>
          <span className="text-gray-600">Answered</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-100 rounded border-2 border-gray-300"></div>
          <span className="text-gray-600">Unanswered</span>
        </div>
      </div>
    </div>
  )
}