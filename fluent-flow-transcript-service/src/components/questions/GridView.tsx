'use client'

import { useEffect } from 'react'
import { useWordSelection } from '../../lib/hooks/use-word-selection'
import { Question } from './QuestionCard'

interface GridViewProps {
  questions: Question[]
  onClose: () => void
  videoTitle?: string
}

export function GridView({ questions, onClose, videoTitle }: GridViewProps) {
  const { enableSelection, disableSelection } = useWordSelection()
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'hard':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '🟢'
      case 'medium':
        return '🟡'
      case 'hard':
        return '🔴'
      default:
        return '⚪'
    }
  }

  // Enable word selection on mount
  useEffect(() => {
    enableSelection('questions-grid', 'quiz', `grid-${questions.length}`)
    return () => {
      disableSelection('questions-grid')
    }
  }, [enableSelection, disableSelection, questions.length])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="min-h-screen py-8">
        <div className="mx-auto max-w-7xl p-6">
          {/* Header */}
          <div className="mb-6 rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="mb-2 text-3xl font-bold text-gray-900">Questions Preview</h1>
                {videoTitle && <p className="text-gray-600">{videoTitle}</p>}
                <p className="mt-1 text-sm text-gray-500">
                  Preview all questions before starting • Total: {questions.length} questions
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-2xl bg-gray-500 px-6 py-3 font-medium text-white shadow-lg transition-colors hover:bg-gray-600"
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Questions Grid */}
          <div id="questions-grid" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {questions.map((question, index) => (
              <div
                key={question.id}
                className="rounded-3xl border-2 border-gray-100 bg-white p-6 shadow-lg transition-shadow hover:shadow-xl"
              >
                {/* Question Header */}
                <div className="mb-4 flex items-start justify-between">
                  <span className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-1 text-sm font-bold text-white">
                    #{index + 1}
                  </span>
                  <div className="flex items-center space-x-2">
                    {/* <span className="text-lg">{getDifficultyIcon(question.difficulty)}</span> */}
                    {/* <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(question.difficulty)}`}>
                      {question.difficulty}
                    </span> */}
                  </div>
                </div>

                {/* Question Text */}
                <h3 className="mb-4 text-lg font-semibold leading-relaxed text-gray-900">
                  {question.question}
                </h3>

                {/* Options - Preview Only (No Answers Shown) */}
                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => {
                    const optionLetter = String.fromCharCode(65 + optionIndex)

                    return (
                      <div
                        key={optionIndex}
                        className="flex items-center space-x-3 rounded-xl border-2 border-gray-200 bg-gray-50 p-3 text-gray-700"
                      >
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-300 text-sm font-bold text-gray-700">
                          {optionLetter}
                        </span>
                        <span className="flex-1 text-sm">{option}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Note about answers */}
                {/* <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-center">
                  <p className="text-sm font-medium text-blue-700">
                    💡 Answers will be revealed during the quiz
                  </p>
                </div> */}

                {/* Question Type */}
                {/* <div className="mt-4 text-center">
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800">
                    {question.type.replace(/_/g, ' ').toLowerCase()}
                  </span>
                </div> */}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <button
              onClick={onClose}
              className="transform rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3 font-bold text-white shadow-lg transition-all hover:scale-105 hover:from-blue-600 hover:to-purple-700"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
