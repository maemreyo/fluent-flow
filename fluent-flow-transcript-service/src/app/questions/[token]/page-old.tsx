// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { UserAvatar } from '../../../components/UserAvatar'

interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  difficulty: 'easy' | 'medium' | 'hard'
  type: string
  explanation?: string
}

interface QuestionSet {
  id: string
  title: string
  videoTitle: string
  videoUrl: string
  startTime?: number
  endTime?: number
  questions: Question[]
  metadata: {
    totalQuestions: number
    createdAt: string
    sharedBy: string
    difficulty: string
    topics: string[]
  }
  expirationInfo?: {
    expiresAt: number
    timeRemaining: number
    hoursRemaining: number
    minutesRemaining: number
  }
}

interface QuestionResponse {
  questionIndex: number
  answer: string
}

interface EvaluationResult {
  questionId: string
  question: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
  explanation: string
  points: number
}

export default function QuestionsPage() {
  const params = useParams()
  const token = params.token as string

  const [questionSet, setQuestionSet] = useState<QuestionSet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState<QuestionResponse[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single')

  // Load questions
  useEffect(() => {
    async function loadQuestions() {
      try {
        const response = await fetch(`/api/questions/${token}`)

        if (!response.ok) {
          throw new Error('Failed to load questions')
        }

        const data = await response.json()
        setQuestionSet(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load questions')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      loadQuestions()
    }
  }, [token])

  const handleAnswerSelect = (answer: string) => {
    const newResponses = [...responses]
    const existingIndex = newResponses.findIndex(r => r.questionIndex === currentQuestionIndex)

    if (existingIndex >= 0) {
      newResponses[existingIndex] = { questionIndex: currentQuestionIndex, answer }
    } else {
      newResponses.push({ questionIndex: currentQuestionIndex, answer })
    }

    setResponses(newResponses)
  }

  const getCurrentResponse = () => {
    return responses.find(r => r.questionIndex === currentQuestionIndex)?.answer || ''
  }

  const canProceed = () => {
    return getCurrentResponse() !== ''
  }

  const nextQuestion = () => {
    if (questionSet && currentQuestionIndex < questionSet.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const submitAnswers = async () => {
    if (!questionSet) return

    setSubmitting(true)

    try {
      const response = await fetch(`/api/questions/${token}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ responses })
      })

      if (!response.ok) {
        throw new Error('Failed to submit answers')
      }

      const result = await response.json()
      setResults(result)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answers')
    } finally {
      setSubmitting(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-600 bg-green-100'
      case 'medium':
        return 'text-yellow-600 bg-yellow-100'
      case 'hard':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading questions...</p>
        </div>
      </div>
    )
  }

  if (error || !questionSet) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-md">
          <div className="mb-4 text-5xl text-red-500">⚠️</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Questions Not Found</h1>
          <p className="mb-4 text-gray-600">
            {error || "The questions you're looking for may have expired or been removed."}
          </p>
          <a href="/" className="text-blue-600 hover:text-blue-500">
            Go back to home
          </a>
        </div>
      </div>
    )
  }

  if (submitted && results) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-6 rounded-lg bg-white p-8 shadow-md">
            <div className="mb-8 text-center">
              <div className="mb-4 text-6xl">🎉</div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900">Quiz Complete!</h1>
              <p className="text-gray-600">Here are your results</p>
            </div>

            <div className="mb-8 rounded-lg bg-gray-50 p-6">
              <div className="grid grid-cols-1 gap-4 text-center md:grid-cols-3">
                <div>
                  <div className={`text-3xl font-bold ${getScoreColor(results.score)}`}>
                    {results.score}%
                  </div>
                  <div className="text-gray-600">Overall Score</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600">{results.correctAnswers}</div>
                  <div className="text-gray-600">Correct Answers</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-600">{results.totalQuestions}</div>
                  <div className="text-gray-600">Total Questions</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Question Review</h2>
              {results.results.map((result: EvaluationResult, index: number) => (
                <div
                  key={result.questionId}
                  className={`rounded-lg border p-6 ${result.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                >
                  <div className="mb-4 flex items-start justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Question {index + 1}</h3>
                    <span
                      className={`rounded-full px-2 py-1 text-sm font-medium ${result.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                    >
                      {result.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  </div>

                  <p className="mb-4 text-gray-800">{result.question}</p>

                  <div className="mb-4 space-y-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-gray-600">Your answer:</span>
                      <span
                        className={`font-medium ${result.isCorrect ? 'text-green-700' : 'text-red-700'}`}
                      >
                        {result.userAnswer}
                      </span>
                    </div>

                    {!result.isCorrect && (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-gray-600">Correct answer:</span>
                        <span className="font-medium text-green-700">{result.correctAnswer}</span>
                      </div>
                    )}
                  </div>

                  {result.explanation && (
                    <div className="rounded border-l-4 border-blue-500 bg-white p-4">
                      <h4 className="mb-1 font-medium text-gray-900">Explanation:</h4>
                      <p className="text-gray-700">{result.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentQuestion = questionSet.questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questionSet.questions.length) * 100
  const isLastQuestion = currentQuestionIndex === questionSet.questions.length - 1
  const allQuestionsAnswered = responses.length === questionSet.questions.length

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-6 overflow-hidden rounded-lg bg-white shadow-md">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h1 className="mb-2 text-2xl font-bold">{questionSet.title}</h1>
                <div className="flex flex-col items-start text-blue-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📺</span>
                    <span className="font-medium">{questionSet.videoTitle}</span>
                  </div>
                  {questionSet.startTime !== undefined && questionSet.endTime !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⏱️</span>
                      <span>
                        {Math.floor(Math.round(questionSet.startTime) / 60)}:
                        {(Math.round(questionSet.startTime) % 60).toString().padStart(2, '0')} -{' '}
                        {Math.floor(Math.round(questionSet.endTime) / 60)}:
                        {(Math.round(questionSet.endTime) % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-6">
            {/* Expiration Warning */}
            {questionSet.expirationInfo && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2 text-amber-800">
                  <span className="text-sm">⏰</span>
                  <span className="text-sm font-medium">
                    Expired in {questionSet.expirationInfo.hoursRemaining}h{' '}
                    {questionSet.expirationInfo.minutesRemaining}m
                  </span>
                </div>
              </div>
            )}

            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <UserAvatar email={questionSet.metadata.sharedBy} showName={true} size="sm" />
                </div>
                <div className="flex items-center gap-1">
                  <span>📅</span>
                  <span>{new Date(questionSet.metadata.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>🎯</span>
                  <span>{questionSet.metadata.totalQuestions} questions</span>
                </div>
              </div>

              {questionSet.videoUrl && (
                <a
                  href={questionSet.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  <span>🔗</span>
                  <span>Watch Original Video</span>
                  <span className="text-xs">↗</span>
                </a>
              )}
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="mb-2 flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'single' ? 'grid' : 'single')}
              className="rounded-md bg-white bg-opacity-20 px-3 py-1 text-sm text-blue-500 transition-colors hover:bg-opacity-30"
            >
              {viewMode === 'single' ? '📋 Grid View' : '📝 Single View'}
            </button>
          </div>
          <div className="mb-1 text-sm text-blue-700">Progress</div>
          <div className="text-2xl font-bold text-gray-700">
            {currentQuestionIndex + 1} / {questionSet.questions.length}
          </div>
        </div>

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {questionSet.questions.map((question, index) => (
              <div key={index} className="overflow-hidden rounded-lg bg-white shadow-md">
                <div className="border-b border-gray-200 bg-gray-200 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Question {index + 1}</h3>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getDifficultyColor(question.difficulty)}`}
                    >
                      {question.difficulty} • {question.type}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-4 rounded-r-lg border-l-4 border-blue-400 bg-blue-50 p-3">
                    <p className="text-base font-medium leading-relaxed text-gray-900">
                      {question.question}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {question.options.map((option, optionIndex) => (
                      <button
                        key={optionIndex}
                        onClick={() => {
                          const newResponses = [...responses]
                          const existingIndex = newResponses.findIndex(
                            r => r.questionIndex === index
                          )

                          if (existingIndex >= 0) {
                            newResponses[existingIndex] = { questionIndex: index, answer: option }
                          } else {
                            newResponses.push({ questionIndex: index, answer: option })
                          }

                          setResponses(newResponses)
                        }}
                        className={`w-full rounded-lg border-2 p-3 text-left text-sm transition-all duration-200 ${
                          responses.find(r => r.questionIndex === index)?.answer === option
                            ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-md'
                            : 'border-gray-300 bg-white text-gray-800 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                            {String.fromCharCode(65 + optionIndex)}
                          </span>
                          <span className="flex-1 leading-relaxed text-gray-900">{option}</span>
                          {responses.find(r => r.questionIndex === index)?.answer === option && (
                            <span className="flex-shrink-0 text-sm text-blue-500">✓</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Single Question View */}
        {viewMode === 'single' && (
          <div className="mb-6 overflow-hidden rounded-lg bg-white shadow-md">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Question {currentQuestionIndex + 1}
                </h2>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${getDifficultyColor(currentQuestion.difficulty)}`}
                >
                  {currentQuestion.difficulty} • {currentQuestion.type}
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6 rounded-r-lg border-l-4 border-blue-400 bg-blue-50 p-4">
                <p className="text-xl font-medium leading-relaxed text-gray-900">
                  {currentQuestion.question}
                </p>
              </div>

              <div className="space-y-4">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(option)}
                    className={`w-full rounded-xl border-2 p-5 text-left transition-all duration-200 ${
                      getCurrentResponse() === option
                        ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-md'
                        : 'border-gray-300 bg-white text-gray-800 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="flex-1 leading-relaxed text-gray-900">{option}</span>
                      {getCurrentResponse() === option && (
                        <span className="flex-shrink-0 text-blue-500">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          {viewMode === 'single' ? (
            <div className="flex items-center justify-between">
              <button
                onClick={previousQuestion}
                disabled={currentQuestionIndex === 0}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Previous
              </button>

              <div className="text-sm text-gray-500">
                {responses.length} / {questionSet.questions.length} questions answered
              </div>

              {isLastQuestion ? (
                <button
                  onClick={submitAnswers}
                  disabled={!allQuestionsAnswered || submitting}
                  className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Quiz'}
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  disabled={!canProceed()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next →
                </button>
              )}
            </div>
          ) : (
            /* Grid Navigation */
            <div className="text-center">
              <div className="mb-4">
                <span className="text-sm text-gray-500">
                  {responses.length} / {questionSet.questions.length} questions answered
                </span>
              </div>
              <button
                onClick={submitAnswers}
                disabled={responses.length !== questionSet.questions.length || submitting}
                className="rounded-lg bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit All Answers'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
