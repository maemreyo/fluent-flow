'use client'

import { useState, useEffect } from 'react'

interface MultipleChoiceQuestionProps {
  question: {
    id: string
    question: string
    options: string[]
    explanation?: string
  }
  currentAnswer: string
  onAnswerChange: (answer: string) => void
  disabled?: boolean
}

export function MultipleChoiceQuestion({
  question,
  currentAnswer,
  onAnswerChange,
  disabled = false
}: MultipleChoiceQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>(currentAnswer || '')

  // Update local state when prop changes
  useEffect(() => {
    setSelectedAnswer(currentAnswer || '')
  }, [currentAnswer])

  const handleAnswerClick = (optionLetter: string) => {
    if (disabled) return
    
    setSelectedAnswer(optionLetter)
    onAnswerChange(optionLetter)
  }

  return (
    <div className="space-y-6">
      {/* Question */}
      <div>
        <h2 className="mb-6 text-xl font-semibold leading-relaxed text-gray-800">
          {question.question}
        </h2>
      </div>

      {/* Answer Options */}
      <div className="space-y-3">
        {question.options?.map((option: string, index: number) => {
          const optionLetter = String.fromCharCode(65 + index) // A, B, C, D
          const isSelected = selectedAnswer === optionLetter

          return (
            <button
              key={optionLetter}
              onClick={() => handleAnswerClick(optionLetter)}
              disabled={disabled}
              className={`w-full rounded-xl border-2 p-4 text-left transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 ${
                isSelected
                  ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-semibold ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-100 text-indigo-700'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  {optionLetter}
                </div>
                <span
                  className={`leading-relaxed ${
                    isSelected ? 'text-indigo-800' : 'text-gray-700'
                  }`}
                >
                  {option}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Selection Status */}
      <div className="text-center">
        {selectedAnswer ? (
          <div className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-800">
            Selected: {selectedAnswer}
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            Please select an answer
          </div>
        )}
      </div>
    </div>
  )
}