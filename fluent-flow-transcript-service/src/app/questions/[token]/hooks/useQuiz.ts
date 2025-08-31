'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { QuestionSet } from '../../../../components/questions/QuestionSetInfo'
import { QuestionPreset } from '../../../../components/questions/PresetSelector'
import { DifficultyGroup } from '../../../../components/questions/ProgressIndicator'
import { Question, QuestionResponse } from '../../../../components/questions/QuestionCard'
import { useQuizAuth } from '../../../../lib/hooks/use-quiz-auth'
import { quizFavoritesService } from '../../../../lib/services/quiz-favorites-service'

type AppState = 'loading' | 'preset-selection' | 'question-info' | 'quiz-active' | 'quiz-results' | 'error'

export function useQuiz() {
  const params = useParams()
  const token = params.token as string

  const [questionSet, setQuestionSet] = useState<QuestionSet | null>(null)
  const [appState, setAppState] = useState<AppState>('loading')
  const [error, setError] = useState<string | null>(null)

  const [selectedPreset, setSelectedPreset] = useState<QuestionPreset | null>(null)
  const [difficultyGroups, setDifficultyGroups] = useState<DifficultyGroup[]>([])
  const [currentSetIndex, setCurrentSetIndex] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState<QuestionResponse[]>([])
  const [results, setResults] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  const [showVocabulary, setShowVocabulary] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [showGridView, setShowGridView] = useState(false)

  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  const [authToken, setAuthToken] = useState<string | undefined>()
  const { user, isAuthenticated, isLoading: authLoading, signOut } = useQuizAuth(authToken)

  const getAvailableQuestionCounts = useCallback((questions: Question[]) => {
    return {
      easy: questions.filter(q => q.difficulty === 'easy').length,
      medium: questions.filter(q => q.difficulty === 'medium').length,
      hard: questions.filter(q => q.difficulty === 'hard').length
    }
  }, [])

  const createPresetGroups = useCallback((preset: QuestionPreset, questions: Question[]): DifficultyGroup[] => {
    const categorizedQuestions = {
      easy: questions.filter(q => q.difficulty === 'easy'),
      medium: questions.filter(q => q.difficulty === 'medium'),
      hard: questions.filter(q => q.difficulty === 'hard')
    }

    const result: DifficultyGroup[] = []
    const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard']
    difficulties.forEach(difficulty => {
      const questionCount = preset.distribution[difficulty]
      if (questionCount > 0) {
        const availableQuestions = categorizedQuestions[difficulty]
        const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5)
        const selectedQuestions = shuffled.slice(0, questionCount)
        result.push({
          difficulty,
          questions: selectedQuestions,
          completed: false
        })
      }
    })
    return result
  }, [])

  const handlePresetSelect = useCallback((preset: QuestionPreset) => {
    if (!questionSet) return
    
    // Show auth prompt if user is not authenticated
    if (!isAuthenticated) {
      setShowAuthPrompt(true)
      return
    }
    
    setSelectedPreset(preset)
    const groups = createPresetGroups(preset, questionSet.questions)
    setDifficultyGroups(groups)
    setAppState('question-info')
  }, [questionSet, createPresetGroups, isAuthenticated])

  const handleQuestionInfoStart = () => {
    setAppState('quiz-active')
  }

  const submitCurrentSet = async () => {
    if (!difficultyGroups.length || !questionSet) return

    setSubmitting(true)
    setError(null)

    try {
      const currentGroup = difficultyGroups[currentSetIndex]
      let startIndex = 0
      for (let i = 0; i < currentSetIndex; i++) {
        startIndex += difficultyGroups[i].questions.length
      }
      const endIndex = startIndex + currentGroup.questions.length - 1
      const setResponses = responses.filter(
        r => r.questionIndex >= startIndex && r.questionIndex <= endIndex
      )

      const submissionData = {
        responses: setResponses,
        questions: currentGroup.questions,
        setIndex: currentSetIndex,
        difficulty: currentGroup.difficulty,
        userData: isAuthenticated ? { userId: user?.id, email: user?.email } : undefined
      }

      const response = await fetch(`/api/questions/${token}/submit-set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to submit: ${response.status} ${errorData}`)
      }

      if (currentSetIndex < difficultyGroups.length - 1) {
        setCurrentSetIndex(currentSetIndex + 1)
        setCurrentQuestionIndex(0)
      } else {
        let totalQuestions = 0
        let totalCorrect = 0
        const allResults: any[] = []
        let resultStartIndex = 0

        for (let i = 0; i < difficultyGroups.length; i++) {
          const setQuestions = difficultyGroups[i].questions.length
          const setEndIndex = resultStartIndex + setQuestions - 1
          const currentSetResponses = responses.filter(
            r => r.questionIndex >= resultStartIndex && r.questionIndex <= setEndIndex
          )

          totalQuestions += setQuestions

          const setResults = currentSetResponses.map((response) => {
            const question = difficultyGroups[i].questions.find(
              (_, idx) => resultStartIndex + idx === response.questionIndex
            )
            const isCorrect = question && question.correctAnswer === response.answer
            if (isCorrect) totalCorrect++

            const userOptionIndex = response.answer.charCodeAt(0) - 65
            const correctOptionIndex = question?.correctAnswer.charCodeAt(0) - 65
            const userAnswerText = question?.options[userOptionIndex] || response.answer
            const correctAnswerText = question?.options[correctOptionIndex] || question?.correctAnswer

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
          resultStartIndex += setQuestions
        }

        const finalScore = Math.round((totalCorrect / totalQuestions) * 100)

        setResults({
          sessionId: `final_${Date.now()}`,
          score: finalScore,
          totalQuestions,
          correctAnswers: totalCorrect,
          results: allResults,
          submittedAt: new Date().toISOString(),
          setIndex: difficultyGroups.length - 1,
          difficulty: 'mixed',
          userData: isAuthenticated ? { userId: user?.id, email: user?.email } : undefined
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
    const newResponse: QuestionResponse = { questionIndex, answer }
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
    let startIndex = 0
    for (let i = 0; i < currentSetIndex; i++) {
      startIndex += difficultyGroups[i].questions.length
    }
    for (let i = 0; i < currentGroup.questions.length; i++) {
      const absoluteIndex = startIndex + i
      if (!responses.some(r => r.questionIndex === absoluteIndex)) {
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

  const handleFavoriteToggle = async () => {
    if (!questionSet || !token) return
    
    // Show auth prompt if user is not authenticated
    if (!isAuthenticated) {
      setShowAuthPrompt(true)
      return
    }
    
    setFavoriteLoading(true)
    try {
      if (isFavorited) {
        if (await quizFavoritesService.removeFromFavorites(token)) {
          setIsFavorited(false)
        }
      } else {
        if (await quizFavoritesService.addToFavorites({
          sessionId: token,
          questionSetTitle: questionSet.title || 'Quiz Session',
          videoTitle: questionSet.videoTitle || 'Unknown Video',
          videoUrl: questionSet.videoUrl,
          difficulty: selectedPreset?.name || 'Mixed',
          totalQuestions: questionSet.questions.length,
          userScore: results?.score
        })) {
          setIsFavorited(true)
        }
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    } finally {
      setFavoriteLoading(false)
    }
  }

  useEffect(() => {
    const fetchQuestionSet = async () => {
      try {
        const response = await fetch(`/api/questions/${token}`)
        if (!response.ok) {
          throw new Error('Failed to load questions')
        }
        const data = await response.json()
        if (data.authData?.accessToken) {
          setAuthToken(data.authData.accessToken)
        }
        setQuestionSet(data)
        setAppState('preset-selection')
      } catch (err) {
        console.error('Error loading questions:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
        setAppState('error')
      } 
    }

    if (token) {
      fetchQuestionSet()
    }
  }, [token])

  useEffect(() => {
    if (questionSet && token) {
      quizFavoritesService.isFavorited(token).then(setIsFavorited).catch(console.error)
    }
  }, [questionSet, token])

  const getCurrentQuestion = () => {
    if (!difficultyGroups.length || currentSetIndex >= difficultyGroups.length) return null
    const currentGroup = difficultyGroups[currentSetIndex]
    if (!currentGroup || currentQuestionIndex >= currentGroup.questions.length) return null

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

  const handleAuthSuccess = (authUser: any) => {
    console.log('User authenticated successfully:', authUser.email)
    setShowAuthPrompt(false)
    // The auth state will be updated automatically through the auth state change listener
  }

  const handleCloseAuthPrompt = () => {
    setShowAuthPrompt(false)
  }

  return {
    token,
    questionSet,
    appState,
    error,
    selectedPreset,
    difficultyGroups,
    currentSetIndex,
    currentQuestionIndex,
    responses,
    results,
    submitting,
    showVocabulary,
    showTranscript,
    isFavorited,
    favoriteLoading,
    showAuthPrompt,
    user,
    isAuthenticated,
    authLoading,
    getAvailableQuestionCounts,
    handlePresetSelect,
    handleQuestionInfoStart,
    submitCurrentSet,
    handleAnswerSelect,
    moveToNextQuestion,
    isLastQuestionInSet,
    allQuestionsInSetAnswered,
    handleRestart,
    handleFavoriteToggle,
    handleAuthSuccess,
    handleCloseAuthPrompt,
    signOut,
    setShowVocabulary,
    setShowTranscript,
    getCurrentQuestion,
    showGridView,
    openGridView: () => setShowGridView(true),
    closeGridView: () => setShowGridView(false)
  }
}
