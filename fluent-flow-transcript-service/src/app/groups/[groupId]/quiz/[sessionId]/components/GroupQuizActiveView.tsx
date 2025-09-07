'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
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
  timeLimit?: number | null
  allowQuestionSkipping?: boolean
  currentQuestionIndex: number // Add this prop for proper progress calculation
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
  onlineParticipants,
  timeLimit,
  allowQuestionSkipping = false,
  currentQuestionIndex
}: GroupQuizActiveViewProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [setSubmitted, setSetSubmitted] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    timeLimit ? timeLimit * 60 : null
  )
  const [timerStarted, setTimerStarted] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Start timer when component mounts
  useEffect(() => {
    if (timeLimit && timeLimit > 0 && !timerStarted) {
      setTimeRemaining(timeLimit * 60) // Convert minutes to seconds
      setTimerStarted(true)
    }
  }, [timeLimit, timerStarted])

  // Timer countdown effect
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0 && timerStarted && !setSubmitted) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => (prev !== null ? prev - 1 : null))
      }, 1000)
    } else if (timeRemaining === 0 && !setSubmitted) {
      // Time's up - auto submit
      handleNext()
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [timeRemaining, timerStarted, setSubmitted])

  // Reset selectedAnswer when question changes
  useEffect(() => {
    setSelectedAnswer('')
  }, [currentQuestion?.questionIndex])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTimerColor = (seconds: number): string => {
    if (seconds > 300) return 'text-green-600' // > 5 minutes
    if (seconds > 60) return 'text-yellow-600' // > 1 minute
    return 'text-red-600' // ≤ 1 minute
  }

  // Helper function to get display name for participants
  const getParticipantDisplayName = (participant: any) => {
    if (participant.username && participant.username.trim()) {
      return participant.username.trim()
    }
    if (participant.user_email && participant.user_email.includes('@')) {
      return participant.user_email.split('@')[0]
    }
    if (participant.user_email && participant.user_email.trim()) {
      return participant.user_email.trim()
    }
    return `User ${participant.user_id?.slice(-4) || 'Unknown'}`
  }

  const handleAnswerClick = (optionLetter: string) => {
    setSelectedAnswer(optionLetter)
    onAnswerSelect(currentQuestion?.questionIndex || 0, optionLetter)
  }

  const handleNext = () => {
    if (isLastQuestion) {
      onSubmitSet()
      setSetSubmitted(true)

      // Stop timer when submitting
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

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

  const handleSkip = () => {
    // Skip without selecting an answer - move to next question
    onNextQuestion()
  }

  const handleContinueToNextSet = () => {
    onMoveToNextSet()
    setSetSubmitted(false) // Reset for next set
    // Reset timer for next set
    if (timeLimit && timeLimit > 0) {
      setTimeRemaining(timeLimit * 60)
      setTimerStarted(true)
    }
  }

  const handleGoBack = () => {
    if (
      window.confirm(
        'Are you sure you want to go back? You will lose your current progress in this quiz session.'
      )
    ) {
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
          <CardContent className="py-12 text-center">
            <div className="mb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
                  <span className="font-bold text-white">✓</span>
                </div>
              </div>
              <h2 className="mb-2 text-2xl font-bold text-gray-800">
                Set {currentSetIndex + 1} Complete!
              </h2>
              <p className="text-gray-600">
                {isLastSet
                  ? "Congratulations! You've completed all sets. Your results are being processed."
                  : 'Great job! Ready to continue with the next set?'}
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
                    {submitting ? 'Processing your final results...' : 'All sets completed!'}
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
          <h3 className="mb-2 font-semibold text-gray-800">Progress Summary</h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium text-green-600">
              Set {currentSetIndex + 1} of {totalSets} completed
            </span>
            <div className="h-2 flex-1 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${((currentSetIndex + 1) / totalSets) * 100}%` }}
              />
            </div>
            <span className="text-gray-500">
              {Math.round(((currentSetIndex + 1) / totalSets) * 100)}%
            </span>
          </div>
        </div>
      </div>
    )
  }

  const { question, questionIndex, groupData } = currentQuestion
  const currentResponse = responses.find(r => r.questionIndex === questionIndex)

  // Calculate current question number within the set properly
  // We need to derive the current question position within the set from the available data
  // Since getCurrentQuestion() calculates absolute questionIndex, we need to get the relative position
  let currentQuestionInSet = 1 // Default fallback
  let totalQuestionsInSet = groupData?.questions?.length || 0

  // Calculate the starting index for the current set
  let setStartIndex = 0
  // We need to access difficultyGroups to get question counts for previous sets
  // For now, we'll need to pass this information from the parent component
  // As a temporary solution, let's calculate based on responses pattern

  // Find responses that belong to the current set by analyzing questionIndex patterns
  const setResponses = responses.filter(r => {
    // This is a heuristic - we assume responses are sequential within sets
    // A proper fix would require passing currentQuestionIndex from the parent
    return r.questionIndex >= setStartIndex && r.questionIndex < setStartIndex + totalQuestionsInSet
  })

  // For now, let's use a simpler approach: count responses in current set
  // This assumes questions are answered sequentially
  const responsesInCurrentSet = responses.filter(r => {
    // Calculate which set each response belongs to based on groupData structure
    let tempIndex = 0
    let tempSetIndex = 0

    // This is imperfect without access to all sets data
    // We need currentQuestionIndex from parent to fix this properly
    return tempSetIndex === currentSetIndex
  })

  // TEMPORARY FIX: Calculate based on questionIndex pattern
  // We'll extract this from the absolute questionIndex and current set info
  if (groupData?.questions) {
    // Since questionIndex is absolute, we need to find where current set starts
    // This requires knowing the structure of previous sets
    // For now, estimate based on current groupData
    const questionsAnsweredInCurrentSet = responses.filter(r => {
      // Simple heuristic: if we know the set has N questions,
      // and we're at absolute index X, then current question in set = (X % N) + 1
      return Math.floor(r.questionIndex / totalQuestionsInSet) === currentSetIndex
    }).length

    // Better approach: use the fact that questionIndex in getCurrentQuestion
    // already accounts for previous sets
    // The current question in set should be derivable from the response pattern
    currentQuestionInSet = Math.min(questionsAnsweredInCurrentSet + 1, totalQuestionsInSet)
  }

  return (
    <div className="space-y-6">
      {/* Header with Timer */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          ← Back to Group
        </button>

        {/* Timer Display */}
        {timeRemaining !== null && (
          <div
            className={`flex items-center gap-2 rounded-lg border bg-white px-4 py-2 shadow-sm ${
              timeRemaining <= 60
                ? 'border-red-200 bg-red-50'
                : timeRemaining <= 300
                  ? 'border-yellow-200 bg-yellow-50'
                  : 'border-green-200 bg-green-50'
            }`}
          >
            <Clock className={`h-4 w-4 ${getTimerColor(timeRemaining)}`} />
            <span className={`font-mono font-semibold ${getTimerColor(timeRemaining)}`}>
              {formatTime(timeRemaining)}
            </span>
            {timeRemaining <= 60 && (
              <span className="text-xs font-medium text-red-600">Time's almost up!</span>
            )}
          </div>
        )}
      </div>

      {/* Progress indicator */}
      <div className="rounded-xl border border-white/40 bg-white/60 p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            Set {currentSetIndex + 1} of {totalSets}
          </span>
          <span className="text-gray-500">
            Question {currentQuestionInSet} of {totalQuestionsInSet}
          </span>
        </div>

        <div className="h-2 rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-indigo-500 transition-all duration-300"
            style={{
              width: `${totalQuestionsInSet > 0 ? (currentQuestionInSet / totalQuestionsInSet) * 100 : 0}%`
            }}
          />
        </div>
      </div>

      {/* Participants Status */}
      {participants && participants.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Group Progress</h3>
              <Badge variant="outline" className="text-xs">
                {onlineParticipants?.length || 0} / {participants.length} online
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {participants.slice(0, 8).map((participant, index) => {
                const isOnline = onlineParticipants?.some(op => op.user_id === participant.user_id)
                const displayName = getParticipantDisplayName(participant)

                return (
                  <div
                    key={participant.user_id || index}
                    className={`flex items-center gap-2 rounded-lg p-2 text-xs ${
                      isOnline
                        ? 'border border-green-200 bg-green-50'
                        : 'border border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div
                      className={`h-2 w-2 rounded-full ${
                        isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                    <span
                      className={`truncate font-medium ${
                        isOnline ? 'text-green-800' : 'text-gray-600'
                      }`}
                    >
                      {displayName}
                    </span>
                  </div>
                )
              })}

              {participants.length > 8 && (
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs">
                  <span className="text-gray-600">+{participants.length - 8} more</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question Card */}
      <Card className="bg-white shadow-lg">
        <CardContent className="p-8">
          <div className="space-y-6">
            {/* Question */}
            <div>
              <h2 className="mb-6 text-xl font-semibold leading-relaxed text-gray-800">
                {question?.question}
              </h2>
            </div>

            {/* Answer Options */}
            <div className="space-y-3">
              {question?.options?.map((option: any, index: number) => {
                const optionLetter = String.fromCharCode(65 + index) // A, B, C, D
                const isSelected = selectedAnswer === optionLetter
                const wasAnswered = currentResponse?.answer === optionLetter

                return (
                  <button
                    key={optionLetter}
                    onClick={() => handleAnswerClick(optionLetter)}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
                      isSelected || wasAnswered
                        ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-semibold ${
                          isSelected || wasAnswered
                            ? 'border-indigo-500 bg-indigo-100 text-indigo-700'
                            : 'border-gray-300 text-gray-600'
                        }`}
                      >
                        {optionLetter}
                      </div>
                      <span
                        className={`leading-relaxed ${
                          isSelected || wasAnswered ? 'text-indigo-800' : 'text-gray-700'
                        }`}
                      >
                        {option}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 border-t border-gray-200 pt-6">
              {allowQuestionSkipping && !isLastQuestion && (
                <Button
                  onClick={handleSkip}
                  variant="outline"
                  className="flex-1 rounded-xl border-2 border-gray-300 py-3 font-semibold"
                >
                  Skip Question
                </Button>
              )}

              <Button
                onClick={handleNext}
                disabled={!selectedAnswer && !currentResponse}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 font-semibold text-white hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
              >
                {isLastQuestion ? 'Submit Set' : 'Next Question'} →
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
