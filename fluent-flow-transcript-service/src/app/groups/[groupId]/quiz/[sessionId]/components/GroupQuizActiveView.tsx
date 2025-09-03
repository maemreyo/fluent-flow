'use client'

import { useState } from 'react'
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
  isLastQuestion,
  allAnswered,
  submitting,
  currentSetIndex,
  totalSets,
  participants,
  onlineParticipants
}: GroupQuizActiveViewProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  console.log('currentQuestion', currentQuestion)
  if (!currentQuestion) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-800">Loading question...</h3>
        </div>
      </div>
    )
  }

  const { question, questionIndex } = currentQuestion
  const currentResponse = responses.find(r => r.questionIndex === questionIndex)

  const handleAnswerClick = (answer: string) => {
    setSelectedAnswer(answer)
    onAnswerSelect(questionIndex, answer)
  }

  const handleNext = () => {
    if (isLastQuestion) {
      onSubmitSet()
    } else {
      onNextQuestion()
    }
  }

  return (
    <div className="space-y-6">
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
          <div className="text-right">
            <div className="text-sm text-gray-600">Progress</div>
            <div className="text-lg font-semibold text-gray-800">
              {Math.round(((currentSetIndex + 1) / totalSets) * 100)}%
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
            style={{ width: `${((currentSetIndex + 1) / totalSets) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card - Much larger space */}
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

          {/* Answer Options - Large clickable areas */}
          <div className="space-y-4">
            {question.options?.map((option: any, index: number) => {
              const optionLetter = String.fromCharCode(65 + index) // A, B, C, D
              const isSelected = currentResponse?.answer === option
              const wasSelected = selectedAnswer === option

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerClick(option)}
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

      {/* Live Participants Status during question */}
      {/* <div className="rounded-xl border border-white/40 bg-white/60 p-4">
        <h4 className="mb-3 font-medium text-gray-800">Participants Status</h4>
        <div className="flex flex-wrap items-center gap-2">
          {onlineParticipants.slice(0, 8).map(participant => (
            <div
              key={participant.user_id}
              className="flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5 text-sm"
            >
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
              <span className="text-gray-700">
                {participant.user_email?.split('@')[0] || 'User'}
              </span>
            </div>
          ))}
          {onlineParticipants.length > 8 && (
            <span className="px-2 text-sm text-gray-500">
              +{onlineParticipants.length - 8} more
            </span>
          )}
        </div>
      </div> */}

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
