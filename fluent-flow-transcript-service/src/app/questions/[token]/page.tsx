'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
// Import new components
import { GridView } from '../../../components/questions/GridView'
import { PresetSelector, QuestionPreset } from '../../../components/questions/PresetSelector'
import { DifficultyGroup } from '../../../components/questions/ProgressIndicator'
import {
  Question,
  QuestionCard,
  QuestionResponse
} from '../../../components/questions/QuestionCard'
import { QuestionSet, QuestionSetInfo } from '../../../components/questions/QuestionSetInfo'
import { ResultsSummary } from '../../../components/questions/ResultsSummary'
import { UserAvatar } from '../../../components/UserAvatar'

// Define presets
const QUESTION_PRESETS: QuestionPreset[] = [
  {
    name: 'Entry Level',
    description: 'Perfect for beginners - mostly easy questions with some challenge',
    distribution: { easy: 4, medium: 3, hard: 2 }
  },
  {
    name: 'Intermediate',
    description: 'Balanced difficulty - equal mix of all levels',
    distribution: { easy: 3, medium: 3, hard: 3 }
  },
  {
    name: 'Advanced',
    description: 'For confident learners - emphasis on harder questions',
    distribution: { easy: 2, medium: 3, hard: 4 }
  },
  {
    name: 'Quick Practice',
    description: 'Short session with mixed difficulty',
    distribution: { easy: 2, medium: 2, hard: 1 }
  }
]

type AppState = 'loading' | 'preset-selection' | 'question-info' | 'quiz-active' | 'quiz-results'

export default function QuestionsPage() {
  const params = useParams()
  const token = params.token as string

  const [questionSet, setQuestionSet] = useState<QuestionSet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // App state management
  const [appState, setAppState] = useState<AppState>('loading')
  const [selectedPreset, setSelectedPreset] = useState<QuestionPreset | null>(null)

  // Quiz state
  const [difficultyGroups, setDifficultyGroups] = useState<DifficultyGroup[]>([])
  const [currentSetIndex, setCurrentSetIndex] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState<QuestionResponse[]>([])
  const [results, setResults] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showGridView, setShowGridView] = useState(false)

  // Helper functions
  const getAvailableQuestionCounts = (questions: Question[]) => {
    return {
      easy: questions.filter(q => q.difficulty === 'easy').length,
      medium: questions.filter(q => q.difficulty === 'medium').length,
      hard: questions.filter(q => q.difficulty === 'hard').length
    }
  }

  const createPresetGroups = (preset: QuestionPreset, questions: Question[]): DifficultyGroup[] => {
    const categorizedQuestions = {
      easy: questions.filter(q => q.difficulty === 'easy'),
      medium: questions.filter(q => q.difficulty === 'medium'),
      hard: questions.filter(q => q.difficulty === 'hard')
    }

    const result: DifficultyGroup[] = []

    // Create groups in order: easy, medium, hard
    const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard']
    difficulties.forEach(difficulty => {
      const questionCount = preset.distribution[difficulty]
      if (questionCount > 0) {
        const availableQuestions = categorizedQuestions[difficulty]
        // Shuffle and take required amount
        const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5)
        const selectedQuestions = shuffled.slice(0, questionCount)

        // Create one group for this difficulty
        result.push({
          difficulty,
          questions: selectedQuestions,
          completed: false
        })
      }
    })

    return result
  }

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
        setAppState('preset-selection')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load questions')
        setAppState('preset-selection') // Show error state but allow preset selection
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      loadQuestions()
    }
  }, [token])

  // Event handlers
  const handlePresetSelect = (preset: QuestionPreset) => {
    if (!questionSet) return

    const presetGroups = createPresetGroups(preset, questionSet.questions)
    setSelectedPreset(preset)
    setDifficultyGroups(presetGroups)
    setAppState('quiz-active')
    setCurrentSetIndex(0)
    setCurrentQuestionIndex(0)
    setResponses([])
  }

  const handleQuestionInfoStart = () => {
    setAppState('quiz-active')
  }

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    const newResponses = [...responses]
    const existingIndex = newResponses.findIndex(r => r.questionIndex === questionIndex)

    if (existingIndex !== -1) {
      newResponses[existingIndex] = { questionIndex, answer }
    } else {
      newResponses.push({ questionIndex, answer })
    }

    setResponses(newResponses)
  }

  const moveToNextQuestion = () => {
    const currentGroup = difficultyGroups[currentSetIndex]
    if (currentQuestionIndex < currentGroup.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // Move to next set or complete
      if (currentSetIndex < difficultyGroups.length - 1) {
        setCurrentSetIndex(currentSetIndex + 1)
        setCurrentQuestionIndex(0)
      }
    }
  }

  const submitCurrentSet = async () => {
    const currentGroup = difficultyGroups[currentSetIndex]

    // Calculate the absolute question indices for the current set
    let startIndex = 0
    for (let i = 0; i < currentSetIndex; i++) {
      startIndex += difficultyGroups[i].questions.length
    }
    const endIndex = startIndex + currentGroup.questions.length - 1

    // Get responses for the current set only
    const setResponses = responses.filter(
      r => r.questionIndex >= startIndex && r.questionIndex <= endIndex
    )

    console.log(
      `Submitting set ${currentSetIndex}: questions ${startIndex}-${endIndex}, ${setResponses.length} responses`
    )

    setSubmitting(true)
    try {
      const response = await fetch(`/api/questions/${token}/submit-set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses: setResponses,
          questions: currentGroup.questions,
          setIndex: currentSetIndex,
          difficulty: currentGroup.difficulty
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit answers')
      }

      const result = await response.json()

      // Update the completed group with score
      const updatedGroups = [...difficultyGroups]
      updatedGroups[currentSetIndex] = {
        ...updatedGroups[currentSetIndex],
        completed: true,
        score: result.score
      }
      setDifficultyGroups(updatedGroups)

      // Check if all sets are complete
      const allComplete = updatedGroups.every(group => group.completed)
      if (allComplete) {
        setResults(result)
        setAppState('quiz-results')
      } else {
        // Move to next set
        setCurrentSetIndex(currentSetIndex + 1)
        setCurrentQuestionIndex(0)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answers')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRestart = () => {
    setSelectedPreset(null)
    setDifficultyGroups([])
    setCurrentSetIndex(0)
    setCurrentQuestionIndex(0)
    setResponses([])
    setResults(null)
    setAppState('preset-selection')
  }

  // Get current question data
  const getCurrentQuestion = (): { question: Question; questionIndex: number } | null => {
    if (difficultyGroups.length === 0 || currentSetIndex >= difficultyGroups.length) {
      return null
    }

    const currentGroup = difficultyGroups[currentSetIndex]
    if (currentQuestionIndex >= currentGroup.questions.length) {
      return null
    }

    // Calculate absolute question index across all groups
    let absoluteIndex = 0
    for (let i = 0; i < currentSetIndex; i++) {
      absoluteIndex += difficultyGroups[i].questions.length
    }
    absoluteIndex += currentQuestionIndex

    return {
      question: currentGroup.questions[currentQuestionIndex],
      questionIndex: absoluteIndex
    }
  }

  const isLastQuestionInSet = (): boolean => {
    if (difficultyGroups.length === 0 || currentSetIndex >= difficultyGroups.length) {
      return false
    }
    const currentGroup = difficultyGroups[currentSetIndex]
    return currentQuestionIndex === currentGroup.questions.length - 1
  }

  const allQuestionsInSetAnswered = (): boolean => {
    if (difficultyGroups.length === 0 || currentSetIndex >= difficultyGroups.length) {
      return false
    }

    const currentGroup = difficultyGroups[currentSetIndex]

    // Calculate absolute question indices for current set
    let startIndex = 0
    for (let i = 0; i < currentSetIndex; i++) {
      startIndex += difficultyGroups[i].questions.length
    }

    // Check if all questions in current set are answered
    for (let i = 0; i < currentGroup.questions.length; i++) {
      const absoluteIndex = startIndex + i
      if (!responses.find(r => r.questionIndex === absoluteIndex)) {
        return false
      }
    }

    return true
  }

  // Render states
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading questions...</p>
        </div>
      </div>
    )
  }

  if (error && !questionSet) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="mx-auto max-w-md p-6 text-center">
          <h1 className="mb-4 text-2xl font-bold text-red-600">Error</h1>
          <p className="mb-4 text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Main app states
  switch (appState) {
    case 'preset-selection':
      if (!questionSet) {
        return (
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600">No questions available</p>
            </div>
          </div>
        )
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <div className="absolute right-4 top-4">
            <UserAvatar email="user@example.com" size="sm" />
          </div>

          {/* Video Information Header */}
          <div className="border-b border-gray-200 bg-white shadow-lg">
            <div className="mx-auto max-w-5xl p-6">
              <div className="flex items-center space-x-6">
                <div className="rounded-2xl bg-gradient-to-r from-red-500 to-red-600 p-3 text-white">
                  <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="mb-2 text-2xl font-bold text-gray-900">
                    {questionSet.videoTitle}
                  </h2>
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <span className="flex items-center">
                      <svg className="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.414L11 9.586V6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {questionSet.startTime !== undefined &&
                        questionSet.endTime !== undefined &&
                        `${Math.floor(questionSet.startTime / 60)}:${Math.round(
                          questionSet.startTime % 60
                        )
                          .toString()
                          .padStart(2, '0')} - ${Math.floor(questionSet.endTime / 60)}:${Math.round(
                          questionSet.endTime % 60
                        )
                          .toString()
                          .padStart(2, '0')}`}
                    </span>
                    <span className="flex items-center">
                      <svg className="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {questionSet.questions.length} Questions
                    </span>
                    <span className="flex items-center">
                      <svg className="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Created by {questionSet.metadata.sharedBy}
                    </span>
                  </div>

                  {/* Expiration Warning */}
                  {questionSet.expirationInfo && (
                    <div className="mt-4 rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
                      <div className="flex items-center gap-3 text-amber-800">
                        <span className="text-2xl">⏰</span>
                        <div>
                          <p className="text-sm font-bold">
                            Link expires in {Math.round(questionSet.expirationInfo.hoursRemaining)}h{' '}
                            {Math.round(questionSet.expirationInfo.minutesRemaining)}m
                          </p>
                          <p className="text-xs text-amber-600">
                            Complete soon to avoid losing access!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <PresetSelector
              presets={QUESTION_PRESETS}
              onPresetSelect={handlePresetSelect}
              availableCounts={getAvailableQuestionCounts(questionSet.questions)}
            />

            {/* Grid View Button */}
            <div className="fixed bottom-6 right-6">
              <button
                onClick={() => setShowGridView(true)}
                className="transform rounded-full bg-gradient-to-r from-purple-500 to-pink-600 p-4 text-white shadow-2xl transition-all duration-200 hover:scale-110 hover:from-purple-600 hover:to-pink-700"
                title="View all questions in grid"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
            </div>

            {/* Grid View Modal */}
            {showGridView && (
              <GridView
                questions={questionSet.questions}
                onClose={() => setShowGridView(false)}
                videoTitle={questionSet.videoTitle}
              />
            )}
          </div>
        </div>
      )

    case 'question-info':
      if (!questionSet) return null

      return (
        <div className="min-h-screen bg-gray-50">
          <div className="absolute right-4 top-4">
            <UserAvatar email="user@example.com" size="sm" />
          </div>
          <QuestionSetInfo
            questionSet={questionSet}
            onStart={handleQuestionInfoStart}
            availableCounts={getAvailableQuestionCounts(questionSet.questions)}
          />
        </div>
      )

    case 'quiz-active':
      const currentData = getCurrentQuestion()
      if (!currentData || !questionSet) {
        return (
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600">No questions available</p>
              <button
                onClick={handleRestart}
                className="mt-4 rounded bg-blue-600 px-4 py-2 text-gray-800 hover:bg-blue-700"
              >
                Start Over
              </button>
            </div>
          </div>
        )
      }

      return (
        <div className="min-h-screen bg-gray-50">
          <div className="absolute right-4 top-4">
            <UserAvatar email="user@example.com" size="sm" />
          </div>

          <div className="mx-auto max-w-4xl p-6">
            {/* <ProgressIndicator
              difficultyGroups={difficultyGroups}
              currentSetIndex={currentSetIndex}
              currentQuestionIndex={currentQuestionIndex}
              totalQuestionsInCurrentSet={difficultyGroups[currentSetIndex]?.questions.length || 0}
            /> */}

            <QuestionCard
              question={currentData.question}
              questionIndex={currentData.questionIndex}
              totalQuestions={difficultyGroups[currentSetIndex]?.questions.length || 0}
              currentSetIndex={currentSetIndex}
              totalSets={difficultyGroups.length}
              responses={responses}
              onAnswerSelect={handleAnswerSelect}
            />

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={handleRestart}
                className="rounded border border-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-50"
              >
                Start Over
              </button>

              <div className="space-x-4">
                {!isLastQuestionInSet() && (
                  <button
                    onClick={moveToNextQuestion}
                    disabled={!responses.find(r => r.questionIndex === currentData.questionIndex)}
                    className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next Question
                  </button>
                )}

                {isLastQuestionInSet() && (
                  <button
                    onClick={submitCurrentSet}
                    disabled={!allQuestionsInSetAnswered() || submitting}
                    className="rounded bg-green-600 px-6 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Complete Set'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )

    case 'quiz-results':
      if (!results || !questionSet) return null

      return (
        <div className="min-h-screen bg-gray-50">
          <div className="absolute right-4 top-4">
            <UserAvatar email="user@example.com" size="sm" />
          </div>
          <ResultsSummary
            results={results}
            onRestart={handleRestart}
            videoTitle={questionSet.videoTitle}
            videoUrl={questionSet.videoUrl}
          />
        </div>
      )

    default:
      return null
  }
}
