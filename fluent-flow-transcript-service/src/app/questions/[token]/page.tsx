'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { useParams } from 'next/navigation'
// Import new components
import { PresetSelector, QuestionPreset } from '../../../components/questions/PresetSelector'
import { DifficultyGroup } from '../../../components/questions/ProgressIndicator'
import {
  Question,
  QuestionCard,
  QuestionResponse
} from '../../../components/questions/QuestionCard'
import { QuestionSet, QuestionSetInfo } from '../../../components/questions/QuestionSetInfo'
import { ResultsSummary } from '../../../components/questions/ResultsSummary'
import { TranscriptPanel } from '../../../components/questions/TranscriptPanel'
import { VocabularyPanel } from '../../../components/questions/VocabularyPanel'
import { useQuizAuth } from '../../../lib/hooks/use-quiz-auth'
import { quizFavoritesService } from '../../../lib/services/quiz-favorites-service'

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
  const [showVocabulary, setShowVocabulary] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)

  // Favorites state
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)

  // Authentication state for shared sessions
  const [authToken, setAuthToken] = useState<string | undefined>()
  const { user, isAuthenticated, isLoading: authLoading, signOut } = useQuizAuth(authToken)

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

  const getCurrentQuestion = () => {
    if (!difficultyGroups.length || currentSetIndex >= difficultyGroups.length) {
      return null
    }

    const currentGroup = difficultyGroups[currentSetIndex]
    if (!currentGroup || currentQuestionIndex >= currentGroup.questions.length) {
      return null
    }

    // Calculate the absolute index for this question
    let startIndex = 0
    for (let i = 0; i < currentSetIndex; i++) {
      startIndex += difficultyGroups[i].questions.length
    }
    const absoluteIndex = startIndex + currentQuestionIndex

    return {
      question: currentGroup.questions[currentQuestionIndex],
      questionIndex: absoluteIndex,
      groupData: currentGroup
    }
  }

  const handlePresetSelect = (preset: QuestionPreset) => {
    if (!questionSet) return

    setSelectedPreset(preset)
    const groups = createPresetGroups(preset, questionSet.questions)
    setDifficultyGroups(groups)
    setAppState('question-info')
  }

  const handleQuestionInfoStart = () => {
    setAppState('quiz-active')
  }

  const submitCurrentSet = async () => {
    if (!difficultyGroups.length || !questionSet) return

    setSubmitting(true)
    setError(null)

    try {
      const currentGroup = difficultyGroups[currentSetIndex]

      // Calculate absolute indices for current set
      let startIndex = 0
      for (let i = 0; i < currentSetIndex; i++) {
        startIndex += difficultyGroups[i].questions.length
      }
      const endIndex = startIndex + currentGroup.questions.length - 1

      // Get only responses for current set (using absolute indices)
      const setResponses = responses.filter(
        r => r.questionIndex >= startIndex && r.questionIndex <= endIndex
      )

      console.log(
        `Submitting set ${currentSetIndex}: questions ${startIndex}-${endIndex}, ${setResponses.length} responses`
      )

      // Prepare data for submission - match API expectations
      const submissionData = {
        responses: setResponses,
        questions: currentGroup.questions, // Current set questions
        setIndex: currentSetIndex,
        difficulty: currentGroup.difficulty,
        // Include user data for authenticated users
        userData: isAuthenticated
          ? {
              userId: user?.id,
              email: user?.email
            }
          : undefined
      }

      // Fix: Use correct API endpoint with token parameter
      const response = await fetch(`/api/questions/${token}/submit-set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to submit: ${response.status} ${errorData}`)
      }

      const result = await response.json()
      console.log('Set submission result:', result)

      // Move to next set or show final results
      if (currentSetIndex < difficultyGroups.length - 1) {
        // Move to next set
        setCurrentSetIndex(currentSetIndex + 1)
        setCurrentQuestionIndex(0)
      } else {
        // Last set completed - calculate final results
        console.log('Quiz completed - calculating final results...')

        // Calculate total score across all sets and collect all results
        let totalQuestions = 0
        let totalCorrect = 0
        const allResults: any[] = []
        let startIndex = 0

        for (let i = 0; i < difficultyGroups.length; i++) {
          const setQuestions = difficultyGroups[i].questions.length
          const endIndex = startIndex + setQuestions - 1

          const setResponses = responses.filter(
            r => r.questionIndex >= startIndex && r.questionIndex <= endIndex
          )

          totalQuestions += setQuestions

          // Create results for each question in this set
          const setResults = setResponses.map((response, responseIndex) => {
            const question = difficultyGroups[i].questions.find(
              (_, idx) => startIndex + idx === response.questionIndex
            )
            const isCorrect = question && question.correctAnswer === response.answer

            if (isCorrect) totalCorrect++

            // Convert option letter back to full text for display
            const userOptionIndex = response.answer.charCodeAt(0) - 65 // A->0, B->1, etc.
            const correctOptionIndex = question?.correctAnswer.charCodeAt(0) - 65
            const userAnswerText = question?.options[userOptionIndex] || response.answer
            const correctAnswerText =
              question?.options[correctOptionIndex] || question?.correctAnswer

            return {
              questionId: question?.id || `q_${response.questionIndex}`,
              question: question?.question || 'Unknown question',
              userAnswer: userAnswerText,
              correctAnswer: correctAnswerText,
              isCorrect: !!isCorrect,
              explanation: question?.explanation || 'No explanation available.',
              points: isCorrect ? 1 : 0
            }
          })

          allResults.push(...setResults)
          startIndex += setQuestions
        }

        const finalScore = Math.round((totalCorrect / totalQuestions) * 100)

        // Fix: Create results object with proper structure matching ResultsSummaryProps
        setResults({
          sessionId: `final_${Date.now()}`,
          score: finalScore,
          totalQuestions,
          correctAnswers: totalCorrect,
          results: allResults, // This is the nested results array that was missing
          submittedAt: new Date().toISOString(),
          setIndex: difficultyGroups.length - 1,
          difficulty: 'mixed',
          userData: isAuthenticated
            ? {
                userId: user?.id,
                email: user?.email
              }
            : undefined
        })

        setAppState('quiz-results')
      }
    } catch (error) {
      console.error('Error submitting set:', error)
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    const newResponse: QuestionResponse = {
      questionIndex,
      answer
    }
    setResponses(prev => [...prev.filter(r => r.questionIndex !== questionIndex), newResponse])
  }

  const moveToNextQuestion = () => {
    if (currentQuestionIndex < (difficultyGroups[currentSetIndex]?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const isLastQuestionInSet = () => {
    const currentGroup = difficultyGroups[currentSetIndex]
    return currentQuestionIndex === (currentGroup?.questions.length || 0) - 1
  }

  const allQuestionsInSetAnswered = () => {
    const currentGroup = difficultyGroups[currentSetIndex]
    if (!currentGroup) return false

    // Calculate absolute indices for current set
    let startIndex = 0
    for (let i = 0; i < currentSetIndex; i++) {
      startIndex += difficultyGroups[i].questions.length
    }

    // Check that all questions in current set are answered
    for (let i = 0; i < currentGroup.questions.length; i++) {
      const absoluteIndex = startIndex + i
      const hasResponse = responses.some(r => r.questionIndex === absoluteIndex)
      if (!hasResponse) {
        return false
      }
    }

    return true
  }

  const handleRestart = () => {
    setAppState('preset-selection')
    setSelectedPreset(null)
    setDifficultyGroups([])
    setCurrentSetIndex(0)
    setCurrentQuestionIndex(0)
    setResponses([])
    setResults(null)
    setError(null)
  }

  const handleAuthSuccess = (user: any) => {
    console.log('Quiz Auth: User authenticated successfully:', user.email)
    // Refresh favorite status after authentication
    if (questionSet && token) {
      quizFavoritesService.isFavorited(token).then(setIsFavorited).catch(console.error)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setIsFavorited(false) // Reset favorite status
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  // Check if quiz is favorited on mount
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!questionSet || !token) return
      try {
        const favorited = await quizFavoritesService.isFavorited(token)
        setIsFavorited(favorited)
      } catch (error) {
        console.error('Failed to check favorite status:', error)
      }
    }

    checkFavoriteStatus()
  }, [questionSet, token])

  // Handle favorite toggle
  const handleFavoriteToggle = async () => {
    if (!questionSet || !token) return

    setFavoriteLoading(true)
    try {
      if (isFavorited) {
        const success = await quizFavoritesService.removeFromFavorites(token)
        if (success) {
          setIsFavorited(false)
        }
      } else {
        const success = await quizFavoritesService.addToFavorites({
          sessionId: token,
          questionSetTitle: questionSet.title || 'Quiz Session',
          videoTitle: questionSet.videoTitle || 'Unknown Video',
          videoUrl: questionSet.videoUrl,
          difficulty: selectedPreset?.name || 'Mixed',
          totalQuestions: questionSet.questions.length,
          userScore: results?.score
        })
        if (success) {
          setIsFavorited(true)
        }
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    } finally {
      setFavoriteLoading(false)
    }
  }

  // Load question set with authentication support
  useEffect(() => {
    const fetchQuestionSet = async () => {
      try {
        const response = await fetch(`/api/questions/${token}`)
        if (!response.ok) {
          throw new Error('Failed to load questions')
        }

        const data = await response.json()
        console.log('Loaded question set:', data)

        // Check if there's auth data in the shared session
        if (data.authData?.accessToken) {
          console.log('Quiz Auth: Found auth token in shared session')
          setAuthToken(data.authData.accessToken)
        }

        setQuestionSet(data)
        setAppState('preset-selection')
      } catch (err) {
        console.error('Error loading questions:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchQuestionSet()
    }
  }, [token])

  // Show auth status in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Quiz Auth State:', {
        isAuthenticated,
        userId: user?.id,
        email: user?.email,
        authLoading
      })
    }
  }, [isAuthenticated, user, authLoading])

  // Render states
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading questions...</p>
          {authLoading && <p className="mt-2 text-sm text-gray-500">Checking authentication...</p>}
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
          {/* Authentication Status Card */}
          {/* <div className="fixed right-4 top-4 w-80 z-50">
            <AuthHeader
              user={user}
              isAuthenticated={isAuthenticated}
              onAuthSuccess={handleAuthSuccess}
              onSignOut={handleSignOut}
              showBenefits={true}
            />
          </div> */}

          {/* Video Information Header */}
          <div className="border-b border-gray-200 bg-white shadow-lg">
            <div className="mx-auto max-w-5xl p-6">
              <div className="flex items-center justify-between">
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
                            .padStart(
                              2,
                              '0'
                            )} - ${Math.floor(questionSet.endTime / 60)}:${Math.round(
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
                            d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Mixed Difficulty
                      </span>
                    </div>
                  </div>
                </div>

                {/* Favorite Star Button */}
                <button
                  onClick={handleFavoriteToggle}
                  disabled={favoriteLoading}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all duration-200 ${
                    isFavorited
                      ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-yellow-500'
                  } ${favoriteLoading ? 'cursor-wait opacity-50' : 'hover:scale-105'}`}
                  title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star
                    className={`h-5 w-5 transition-all ${
                      isFavorited ? 'fill-current text-yellow-500' : ''
                    }`}
                  />
                  <span className="text-sm font-medium">
                    {favoriteLoading ? 'Saving...' : isFavorited ? 'Starred' : 'Star'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl p-8">
            <PresetSelector
              presets={QUESTION_PRESETS}
              onPresetSelect={handlePresetSelect}
              availableCounts={getAvailableQuestionCounts(questionSet.questions)}
            />
          </div>
        </div>
      )

    case 'question-info':
      if (!questionSet || !selectedPreset) {
        return (
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        )
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          {/* <div className="fixed right-4 top-4 z-50 w-80">
            <AuthHeader
              user={user}
              isAuthenticated={isAuthenticated}
              onAuthSuccess={handleAuthSuccess}
              onSignOut={handleSignOut}
              showBenefits={false}
            />
          </div> */}

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
          <div className="flex items-center justify-between border-b bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              {/* Compact auth status - now with proper z-index handling */}
              <div className="flex items-center gap-2">
                {isAuthenticated ? (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                      <span className="text-xs text-white">✓</span>
                    </div>
                    <span className="font-medium text-green-700">{user?.email}</span>
                  </div>
                ) : (
                  <div className="inline-block">
                    {/* <AuthHeader
                      user={user}
                      isAuthenticated={isAuthenticated}
                      onAuthSuccess={handleAuthSuccess}
                      onSignOut={handleSignOut}
                      showBenefits={false}
                    /> */}
                  </div>
                )}
              </div>

              {/* Star button in quiz header */}
              <button
                onClick={handleFavoriteToggle}
                disabled={favoriteLoading}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all duration-200 ${
                  isFavorited
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-yellow-500'
                } ${favoriteLoading ? 'cursor-wait opacity-50' : 'hover:scale-105'}`}
                title={isFavorited ? 'Starred' : 'Star this quiz'}
              >
                <Star
                  className={`h-3.5 w-3.5 transition-all ${
                    isFavorited ? 'fill-current text-yellow-500' : ''
                  }`}
                />
                <span className="font-medium">
                  {favoriteLoading ? 'Saving...' : isFavorited ? 'Starred' : 'Star'}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              {/* Vocabulary and Transcript toggle buttons */}
              {questionSet?.vocabulary && (
                <button
                  onClick={() => setShowVocabulary(!showVocabulary)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    showVocabulary
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📚 Vocabulary
                </button>
              )}

              {questionSet?.transcript && (
                <button
                  onClick={() => setShowTranscript(!showTranscript)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    showTranscript
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📄 Transcript
                </button>
              )}
            </div>
          </div>

          <div className="mx-auto max-w-4xl p-6">
            <QuestionCard
              question={currentData.question}
              questionIndex={currentData.questionIndex}
              totalQuestions={difficultyGroups[currentSetIndex]?.questions.length || 0}
              currentSetIndex={currentSetIndex}
              totalSets={difficultyGroups.length}
              responses={responses}
              onAnswerSelect={handleAnswerSelect}
              enableWordSelection={true}
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

          {/* Vocabulary and Transcript Panels */}
          {questionSet?.vocabulary && (
            <VocabularyPanel
              vocabulary={questionSet.vocabulary}
              isOpen={showVocabulary}
              onToggle={() => setShowVocabulary(!showVocabulary)}
              enableWordSelection={true}
            />
          )}

          {questionSet?.transcript && (
            <TranscriptPanel
              transcript={questionSet.transcript}
              videoTitle={questionSet.videoTitle}
              startTime={questionSet.startTime}
              endTime={questionSet.endTime}
              isOpen={showTranscript}
              onToggle={() => setShowTranscript(!showTranscript)}
              enableWordSelection={true}
            />
          )}
        </div>
      )

    case 'quiz-results':
      if (!results || !questionSet) {
        return (
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600">No results available</p>
              <button
                onClick={handleRestart}
                className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Start Over
              </button>
            </div>
          </div>
        )
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          {/* <div className="fixed right-4 top-4 z-50 w-80">
            <AuthHeader
              user={user}
              isAuthenticated={isAuthenticated}
              onAuthSuccess={handleAuthSuccess}
              onSignOut={handleSignOut}
              showBenefits={false}
            />
          </div> */}

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
