'use client'

import { useState, useEffect } from 'react'
import { Badge } from '../../../../../../components/ui/badge'
import { Button } from '../../../../../../components/ui/button'
import { Card, CardContent } from '../../../../../../components/ui/card'

interface GroupQuizActiveViewProps {
  currentQuestion: {
    question: any
    questionIndex: number
    groupData: any
  } | null
  responses: Array<{ questionIndex: number; answer: string }>
  onAnswerSelect: (questionIndex: number, answer: string) => void
  onNextQuestion: () => void
  onSubmitSet: () => void
  onMoveToNextSet: () => void
  isLastQuestion: boolean
  allAnswered: boolean
  submitting: boolean
  currentSetIndex: number
  totalSets: number
  participants: Array<{ user_id: string; user_email: string; is_online: boolean }>
  onlineParticipants: Array<{ user_id: string; user_email: string; is_online: boolean }>
}

export function GroupQuizActiveView({
  currentQuestion,
  responses,
  onAnswerSelect,
  onNextQuestion,
  onSubmitSet,
  onMoveToNextSet,
  isLastQuestion,
  allAnswered,
  submitting,
  currentSetIndex,
  totalSets,
  participants,
  onlineParticipants
}: GroupQuizActiveViewProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [setSubmitted, setSetSubmitted] = useState(false)
  console.log('currentQuestion', currentQuestion)

  // Reset selectedAnswer when question changes
  useEffect(() => {
    setSelectedAnswer('')
  }, [currentQuestion?.questionIndex])
  
  const handleAnswerClick = (optionLetter: string) => {
    setSelectedAnswer(optionLetter)
    onAnswerSelect(currentQuestion?.questionIndex || 0, optionLetter)
  }

  const handleNext = () => {
    if (isLastQuestion) {
      onSubmitSet()
      setSetSubmitted(true)
      
      // If this is the last set, automatically calculate final results after a brief delay
      const isLastSet = currentSetIndex >= totalSets - 1
      if (isLastSet) {
        setTimeout(() => {
          onMoveToNextSet() // This will call calculateFinalResults()
        }, 2000) // 2 second delay to show completion message
      }
    } else {
      onNextQuestion()
    }
  }

  const handleContinueToNextSet = () => {
    onMoveToNextSet()
    setSetSubmitted(false) // Reset for next set
  }

  const handleGoBack = () => {
    if (window.confirm('Are you sure you want to go back? You will lose your current progress in this quiz session.')) {
      window.history.back()
    }
  }
  
  if (!currentQuestion) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-800">Loading question...</h3>
        </div>
      </div>
    )
  }

  // Show set completion screen after submission
  if (setSubmitted) {
    const isLastSet = currentSetIndex >= totalSets - 1
    
    return (
      <div className="space-y-6">
        {/* Back Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleGoBack}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            ← Back to Group
          </button>
        </div>

        {/* Set Completion Card */}
        <Card className="border-green-200 bg-green-50/80 shadow-lg">
          <CardContent className="text-center py-12">
            <div className="mb-6">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-white font-bold">✓</span>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Set {currentSetIndex + 1} Complete!
              </h2>
              <p className="text-gray-600">
                {isLastSet 
                  ? "Congratulations! You've completed all sets. Your results are being processed."
                  : "Great job! Ready to continue with the next set?"
                }
              </p>
            </div>

            <div className="flex items-center justify-center gap-4">
              {!isLastSet && (
                <Button
                  onClick={handleContinueToNextSet}
                  disabled={submitting}
                  className="rounded-xl bg-indigo-600 px-8 py-3 font-semibold text-white hover:bg-indigo-700"
                >
                  Continue to Set {currentSetIndex + 2} →
                </Button>
              )}
              
              {isLastSet && (
                <div className="flex flex-col items-center gap-3">
                  <div className="text-sm text-gray-500">
                    {submitting ? "Processing your final results..." : "All sets completed!"}
                  </div>
                  {!submitting && (
                    <Button
                      onClick={handleContinueToNextSet}
                      className="rounded-xl bg-green-600 px-6 py-2 font-semibold text-white hover:bg-green-700"
                    >
                      View Results →
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progress Summary */}
        <div className="rounded-xl border border-white/40 bg-white/60 p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Progress Summary</h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-600 font-medium">
              Set {currentSetIndex + 1} of {totalSets} completed
            </span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentSetIndex + 1) / totalSets) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { question, questionIndex } = currentQuestion
  const currentResponse = responses.find(r => r.questionIndex === questionIndex)

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          ← Back to Group
        </button>
        <div className="text-sm text-gray-500">
          Question {questionIndex + 1}
        </div>
      </div>

      {/* Progress Header */}
      <div className="rounded-xl border border-white/40 bg-white/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Set {currentSetIndex + 1} of {totalSets}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                {currentQuestion.groupData.difficulty}
              </Badge>
              <span>Question {questionIndex + 1}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Question Card */}
      <Card className="border-white/40 bg-white/80 shadow-lg">
        <CardContent>
          {/* Question Text */}
          <div className="mb-6">
            <h3 className="mb-4 text-2xl font-bold leading-relaxed text-gray-800">
              {question.question}
            </h3>

            {/* Audio Player if available */}
            {question.audio_url && (
              <div className="mb-6">
                <audio controls className="w-full" src={question.audio_url}>
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}

            {/* Context if available */}
            {question.context && (
              <div className="mb-4 rounded-lg bg-gray-50 p-4">
                <p className="italic text-gray-700">{question.context}</p>
              </div>
            )}
          </div>

          {/* Answer Options */}
          <div className="space-y-4">
            {question.options?.map((option: any, index: number) => {
              const optionLetter = String.fromCharCode(65 + index) // A, B, C, D
              const isSelected = currentResponse?.answer === optionLetter
              const wasSelected = selectedAnswer === optionLetter

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerClick(optionLetter)}
                  disabled={submitting}
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                    isSelected || wasSelected
                      ? 'border-indigo-500 bg-indigo-50 shadow-md'
                      : 'hover:bg-indigo-25 border-gray-200 bg-white hover:border-indigo-300'
                  } ${submitting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        isSelected || wasSelected
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {optionLetter}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg text-gray-800">{option}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {currentResponse ? (
            <span className="flex items-center gap-1 text-green-600">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              Answer selected
            </span>
          ) : (
            <span>Select an answer to continue</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!isLastQuestion ? (
            <Button
              onClick={handleNext}
              disabled={!currentResponse || submitting}
              className="rounded-xl bg-indigo-600 px-8 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              {submitting ? 'Processing...' : 'Next Question →'}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!allAnswered || submitting}
              className="rounded-xl bg-green-600 px-8 py-3 font-semibold text-white hover:bg-green-700"
            >
              {submitting ? 'Submitting...' : 'Submit Set ✓'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}