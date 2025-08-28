import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, X, Minimize2 } from 'lucide-react'
import type { ConversationQuestions, QuestionPracticeResult } from '../../lib/types/fluent-flow-types'

interface QuestionOverlayProps {
  questions: ConversationQuestions
  onClose: () => void
  onComplete?: (results: QuestionPracticeResult[], score: number) => void
  onMinimize?: () => void
}

export function QuestionOverlay({ 
  questions, 
  onClose, 
  onComplete,
  onMinimize 
}: QuestionOverlayProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<QuestionPracticeResult[]>([])
  const [isMinimized, setIsMinimized] = useState(false)

  const currentQuestion = questions.questions[currentQuestionIndex]
  const totalQuestions = questions.questions.length
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }))
  }

  const handleNext = () => {
    if (!selectedAnswers[currentQuestion.id]) return

    const isCorrect = selectedAnswers[currentQuestion.id] === currentQuestion.correctAnswer
    const result: QuestionPracticeResult = {
      questionId: currentQuestion.id,
      selectedAnswer: selectedAnswers[currentQuestion.id],
      isCorrect,
      timeSpent: 10, // Simplified for overlay
      attemptedAt: new Date()
    }

    const newResults = [...results, result]
    setResults(newResults)

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      const correctAnswers = newResults.filter(r => r.isCorrect).length
      const score = Math.round((correctAnswers / totalQuestions) * 100)
      setShowResults(true)
      onComplete?.(newResults, score)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleMinimize = () => {
    setIsMinimized(!isMinimized)
    onMinimize?.()
  }

  if (showResults) {
    const correctAnswers = results.filter(r => r.isCorrect).length
    const score = Math.round((correctAnswers / totalQuestions) * 100)

    return (
      <div className="bg-white rounded-lg shadow-xl border-2 border-blue-500 p-4 max-w-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg text-green-600">Complete!</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="text-center mb-4">
          <div className="text-4xl font-bold text-green-600 mb-2">{score}%</div>
          <p className="text-sm text-gray-600">
            {correctAnswers}/{totalQuestions} correct
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
        >
          Close Practice
        </button>
      </div>
    )
  }

  if (isMinimized) {
    return (
      <div className="bg-blue-500 text-white rounded-lg shadow-xl p-2 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Q {currentQuestionIndex + 1}/{totalQuestions}</span>
          <button
            onClick={handleMinimize}
            className="p-1 hover:bg-blue-600 rounded text-white"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-600 rounded text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-xl border-2 border-blue-500 p-4 max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-blue-600">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </span>
          <span className={`text-xs px-2 py-1 rounded ${
            currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
            currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {currentQuestion.difficulty}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleMinimize}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-800 leading-relaxed">
          {currentQuestion.question}
        </p>
      </div>

      {/* Answer options */}
      <div className="space-y-2 mb-4">
        {currentQuestion.options.map((option, index) => {
          const letter = ['A', 'B', 'C', 'D'][index]
          const isSelected = selectedAnswers[currentQuestion.id] === letter
          
          return (
            <button
              key={index}
              onClick={() => handleAnswerSelect(letter)}
              className={`w-full text-left p-2 rounded border text-sm transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="font-medium">{letter}.</span> {option}
            </button>
          )
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <button
          onClick={handleNext}
          disabled={!selectedAnswers[currentQuestion.id]}
          className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentQuestionIndex === totalQuestions - 1 ? 'Finish' : 'Next'}
          {currentQuestionIndex !== totalQuestions - 1 && (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  )
}