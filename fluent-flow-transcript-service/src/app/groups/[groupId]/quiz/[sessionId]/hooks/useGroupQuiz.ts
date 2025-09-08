import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
// Import types and utilities from individual quiz
import type { QuestionPreset } from '../../../../../../components/questions/PresetSelector'
import type { DifficultyGroup } from '../../../../../../components/questions/ProgressIndicator'
import type {
  Question,
  QuestionResponse
} from '../../../../../../components/questions/QuestionCard'
import { useAuth } from '../../../../../../contexts/AuthContext'
import { useQuizAuth } from '../../../../../../lib/hooks/use-quiz-auth'
import { supabase } from '../../../../../../lib/supabase/client'
import { fetchQuestionSet, submitSet } from '../../../../../questions/[token]/queries'
import { useSessionParticipants } from '../../../components/sessions/hooks/useSessionParticipants'
import { fetchGroup, fetchGroupSession } from '../queries'
import { useRealtimeSession } from './useRealtimeSession'
import { quizQueryKeys, quizQueryOptions } from '../lib/query-keys'

type AppState =
  | 'loading'
  | 'preset-selection'
  | 'question-info'
  | 'question-preview' // Add this new state
  | 'quiz-active'
  | 'quiz-results'
  | 'error'

interface UseGroupQuizProps {
  groupId: string
  sessionId: string
}

export function useGroupQuiz({ groupId, sessionId }: UseGroupQuizProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Group context
  const {
    participants,
    onlineParticipants,
    isUserJoined,
    isLoading: participantsLoading
  } = useSessionParticipants({
    groupId,
    sessionId,
    userId: user?.id,
    enabled: true
  })

  // Enhanced real-time features
  const { refreshSession } = useRealtimeSession({
    groupId,
    sessionId,
    enabled: true
  })

  // Quiz state (similar to individual useQuiz)
  const [appState, setAppState] = useState<AppState>('loading')
  const [selectedPreset, setSelectedPreset] = useState<QuestionPreset | null>(null)
  const [difficultyGroups, setDifficultyGroups] = useState<DifficultyGroup[]>([])
  const [currentSetIndex, setCurrentSetIndex] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState<QuestionResponse[]>([])
  const [results, setResults] = useState<any>(null)
  const [videoUrl, setVideoUrl] = useState<string | undefined>()

  const [showVocabulary, setShowVocabulary] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [showGridView, setShowGridView] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  // Query keys and options are now imported directly

  // Fetch group session data
  const {
    data: session,
    isLoading: sessionLoading,
    error: sessionError
  } = useQuery({
    queryKey: quizQueryKeys.session(groupId, sessionId),
    queryFn: () => fetchGroupSession(groupId, sessionId),
    enabled: !!groupId && !!sessionId,
    ...quizQueryOptions.session
  })

  // Fetch group data
  const {
    data: group,
    isLoading: groupLoading,
    error: groupError
  } = useQuery({
    queryKey: quizQueryKeys.group(groupId),
    queryFn: () => fetchGroup(groupId),
    enabled: !!groupId,
    ...quizQueryOptions.static
  })

  // Auth handling (similar to individual quiz)
  const [authToken, setAuthToken] = useState<string | undefined>()
  const {
    user: quizUser,
    isAuthenticated,
    isLoading: authLoading,
    signOut
  } = useQuizAuth(authToken)

  // Function to load questions from shareTokens with React Query caching
  const loadQuestionsFromShareTokens = useCallback(async (shareTokens: Record<string, string>) => {
    const availableTokens = Object.entries(shareTokens).filter(([_, token]) => token)
    if (availableTokens.length === 0) {
      throw new Error('No questions available')
    }

    console.log('🔄 [loadQuestionsFromShareTokens] Loading questions with React Query caching:', shareTokens)

    const questionPromises = availableTokens.map(async ([difficulty, shareToken]) => {
      // Check if data is already cached in React Query
      const cacheKey = quizQueryKeys.questionSet(shareToken)
      const cachedData = queryClient.getQueryData(cacheKey) as any
      
      if (cachedData) {
        console.log(`✅ [loadQuestionsFromShareTokens] Using cached ${difficulty} questions`)
        return cachedData
      }

      // If not cached, fetch and cache it
      console.log(`🔄 [loadQuestionsFromShareTokens] Fetching ${difficulty} questions from API`)
      const response = await fetch(`/api/questions/${shareToken}?groupId=${groupId}&sessionId=${sessionId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load ${difficulty} questions`)
      }
      
      const questionData = await response.json()
      const result = {
        difficulty,
        questions: questionData.questions || [],
        shareToken,
        questionSet: questionData
      }

      // Cache the result with React Query
      queryClient.setQueryData(cacheKey, result)
      
      console.log(`✅ [loadQuestionsFromShareTokens] Cached ${difficulty} questions: ${result.questions.length}`)
      return result
    })

    const loadedQuestions = await Promise.all(questionPromises)
    
    // Set difficultyGroups so questions are available for getCurrentQuestion
    const formattedGroups: DifficultyGroup[] = loadedQuestions.map((loadedQuestion: any) => ({
      difficulty: loadedQuestion.difficulty as 'easy' | 'medium' | 'hard',
      questions: loadedQuestion.questions,
      shareToken: loadedQuestion.shareToken,
      questionsData: loadedQuestion.questions,
      questionSet: { questions: loadedQuestion.questions },
      completed: false // Add required property
    }))
    
    console.log('📚 Setting difficultyGroups from loaded questions:', formattedGroups.map(g => `${g.difficulty}: ${g.questions.length}`))
    setDifficultyGroups(formattedGroups)
    
    return loadedQuestions
  }, [groupId, sessionId, queryClient])

  // Favorites handling (simplified for group context)
  const { data: isFavorited = false } = useQuery({
    queryKey: ['isFavorited', session?.share_token],
    queryFn: () => false, // Simplified for now
    enabled: !!session?.share_token
  })

  // Group results submission
  const submitGroupResultsMutation = useMutation({
    mutationFn: async (resultsData: any) => {
      // Use auth-utils for proper authentication headers
      const { getAuthHeaders } = await import('@/lib/supabase/auth-utils')
      const headers = await getAuthHeaders()

      // Use group-specific submit API instead of share token submit
      const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify(resultsData)
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to submit: ${response.status} ${errorData}`)
      }

      return await response.json()
    },
    onSuccess: () => {
      // Just confirm submission success - don't auto-advance
      console.log('Set submitted successfully')
    },
    onError: error => {
      console.error('Error submitting set:', error)
    }
  })

  // State management with auto-load from shareTokens  
  useEffect(() => {
    const isLoading = sessionLoading || groupLoading || participantsLoading

    console.log('🔍 useGroupQuiz state management:', {
      isLoading,
      sessionLoading,
      groupLoading,
      participantsLoading,
      sessionError,
      groupError,
      hasSession: !!session,
      hasGroup: !!group
    })

    if (isLoading) {
      console.log('📝 Setting appState to: loading')
      setAppState('loading')
    } else if (sessionError || groupError) {
      console.log('📝 Setting appState to: error')
      setAppState('error')
    } else if (session && group) {
      // Check session status to determine proper state
      console.log('📊 Session data:', {
        id: session.id,
        status: session.status,
        state: (session as any).state,
        quiz_title: session.quiz_title,
        created_by: session.created_by,
        started_at: session.started_at,
        currentAppState: appState
      })
      
      // CRITICAL FIX: Only initialize state if currently in loading/error, preserve advanced states
      if (appState === 'loading' || appState === 'error') {
        console.log('📝 Initializing appState to: preset-selection')
        setAppState('preset-selection')
      } else {
        console.log(`📝 Preserving existing appState: ${appState} (not overriding with preset-selection)`)
      }
    } else {
      console.log('⚠️ No state match, staying in current state')
    }
  }, [
    sessionLoading,
    groupLoading,
    participantsLoading,
    sessionError,
    groupError,
    session,
    group
  ])

  // Auto-load questions from existing shareTokens on mount
  useEffect(() => {
    const loadExistingQuestions = async () => {
      // Only try to load if we're in preset-selection state and don't have questions yet
      if (appState !== 'preset-selection' || difficultyGroups.length > 0) {
        return
      }

      try {
        // Fetch existing shareTokens from the backend using optimized query
        console.log('🔄 Checking for existing questions...')
        const { getAuthHeaders } = await import('@/lib/supabase/auth-utils')
        const headers = await getAuthHeaders()
        
        const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/questions`, {
          headers,
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('📦 Found existing questions:', data)
          
          // Parse the actual API response structure  
          if (data.success && data.data?.questionsByDifficulty) {
            const questionsByDiff = data.data.questionsByDifficulty
            
            // Convert to shareTokens format
            const shareTokens: Record<string, string> = {}
            Object.keys(questionsByDiff).forEach(difficulty => {
              const diffData = questionsByDiff[difficulty]
              if (diffData.shareToken) {
                shareTokens[difficulty] = diffData.shareToken
              }
            })
            
            if (Object.keys(shareTokens).length > 0) {
              console.log('🎯 Loading questions from existing shareTokens:', shareTokens)
              await loadQuestionsFromShareTokens(shareTokens)
              // Move to question-info state since we have questions
              setAppState('question-info')
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load existing questions:', error)
      }
    }

    loadExistingQuestions()
  }, [appState, difficultyGroups.length, groupId, sessionId, loadQuestionsFromShareTokens])

  // Quiz functionality (reused from individual quiz)
  const getAvailableQuestionCounts = useCallback((questions: Question[]) => {
    return {
      easy: questions.filter(q => q.difficulty === 'easy').length,
      medium: questions.filter(q => q.difficulty === 'medium').length,
      hard: questions.filter(q => q.difficulty === 'hard').length
    }
  }, [])

  const createPresetGroups = useCallback(
    (preset: QuestionPreset, questions: Question[]): DifficultyGroup[] => {
      const categorizedQuestions = {
        easy: questions.filter(q => q.difficulty === 'easy'),
        medium: questions.filter(q => q.difficulty === 'medium'),
        hard: questions.filter(q => q.difficulty === 'hard')
      }

      const result: DifficultyGroup[] = []
      const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard']

      // Get group quiz settings
      const groupSettings = (group as any)?.settings || {}
      const shouldShuffleQuestions = groupSettings.shuffleQuestions || false

      difficulties.forEach(difficulty => {
        const questionCount = preset.distribution[difficulty]
        if (questionCount > 0) {
          const availableQuestions = categorizedQuestions[difficulty]
          
          // Apply question shuffling based on group settings
          const questionsToSelect = shouldShuffleQuestions 
            ? [...availableQuestions].sort(() => Math.random() - 0.5)
            : availableQuestions
            
          const selectedQuestions = questionsToSelect.slice(0, questionCount)
          
          // Apply answer shuffling to individual questions if enabled
          const questionsWithShuffledAnswers = selectedQuestions.map(question => {
            if (!groupSettings.shuffleAnswers) {
              return question
            }
            
            // Shuffle answers while preserving correct answer mapping
            const originalOptions = question.options
            const correctIndex = question.options.findIndex(
              (_, index) => ['A', 'B', 'C', 'D'][index] === question.correctAnswer
            )
            const correctOption = originalOptions[correctIndex]
            
            const shuffledOptions = [...originalOptions].sort(() => Math.random() - 0.5)
            const newCorrectIndex = shuffledOptions.indexOf(correctOption)
            const newCorrectAnswer = ['A', 'B', 'C', 'D'][newCorrectIndex]
            
            return {
              ...question,
              options: shuffledOptions,
              correctAnswer: newCorrectAnswer
            }
          })
          
          result.push({
            difficulty,
            questions: questionsWithShuffledAnswers,
            completed: false
          })
        }
      })
      return result
    },
    [(group as any)?.settings]
  )

  const handlePresetSelect = useCallback(
    async (preset: QuestionPreset, shareTokens?: Record<string, string>) => {
      if (!isAuthenticated) {
        setShowAuthPrompt(true)
        return
      }

      try {
        let allQuestions: Question[] = []
        
        if (shareTokens) {
          // Load questions from shareTokens
          const loadedQuestions = await loadQuestionsFromShareTokens(shareTokens)
          allQuestions = loadedQuestions.flatMap((q: any) => q.questions)
          
          const primaryQuestionSet = loadedQuestions.find((q: any) => q.questions.length > 0)?.questionSet
          if (primaryQuestionSet && session?.share_token) {
            queryClient.setQueryData(
              quizQueryKeys.questionSet(session.share_token),
              primaryQuestionSet
            )
          }

          // Store the video URL from the first available question set
          const firstQuestionSetWithVideo = loadedQuestions.find((q: any) => q.questionSet.videoUrl)
          if (firstQuestionSetWithVideo) {
            setVideoUrl(firstQuestionSetWithVideo.questionSet.videoUrl)
          }
        } else {
          // Try to get questions from existing cache (fallback)
          const cachedQuestionSet = queryClient.getQueryData(quizQueryKeys.questionSet(session?.share_token || ''))
          if (cachedQuestionSet && (cachedQuestionSet as any).questions) {
            allQuestions = (cachedQuestionSet as any).questions
          } else {
            throw new Error('No questions available. Please generate questions first.')
          }
        }

        if (allQuestions.length === 0) {
          throw new Error('No questions found. Please generate questions first.')
        }

        setSelectedPreset(preset)
        const groups = createPresetGroups(preset, allQuestions)
        setDifficultyGroups(groups)
        setAppState('question-info')
      } catch (error) {
        console.error('Error loading questions:', error)
        alert(error instanceof Error ? error.message : 'Failed to load questions')
      }
    },
    [isAuthenticated, session?.share_token, queryClient, quizQueryKeys]
  )

  const handleQuestionInfoStart = () => {
    setAppState('question-preview')
  }

  const handleStartQuizFromPreview = useCallback(async (currentShareTokens?: Record<string, string>) => {
    setAppState('quiz-active')
    
    // Return shareTokens for broadcasting (if available)
    return currentShareTokens || {}
  }, [])

  const handleGoBackFromPreview = () => {
    setAppState('question-info')
  }

  const submitCurrentSet = async () => {
    if (!difficultyGroups.length) return

    const currentGroup = difficultyGroups[currentSetIndex]
    let startIndex = 0
    for (let i = 0; i < currentSetIndex; i++) {
      startIndex += difficultyGroups[i].questions.length
    }
    const endIndex = startIndex + currentGroup.questions.length - 1
    const setResponses = responses.filter(
      r => r.questionIndex >= startIndex && r.questionIndex <= endIndex
    )

    // For group quiz, we submit to group results endpoint
    const submissionData = {
      responses: setResponses,
      questions: currentGroup.questions,
      setIndex: currentSetIndex,
      difficulty: currentGroup.difficulty,
      userData: isAuthenticated ? { userId: user?.id, email: user?.email } : undefined,
      // Additional group context
      groupId,
      sessionId,
      participants: participants.map(p => ({
        user_id: p.user_id,
        user_email: p.user_email
      }))
    }

    // Always submit current set results, but don't auto-advance
    // The UI component will handle showing results and letting user decide to continue
    submitGroupResultsMutation.mutate(submissionData)
  }

  const moveToNextSet = () => {
    if (currentSetIndex < difficultyGroups.length - 1) {
      setCurrentSetIndex(currentSetIndex + 1)
      setCurrentQuestionIndex(0)
    } else {
      // Final set completed - calculate and show results
      calculateFinalResults()
    }
  }

  const calculateFinalResults = async () => {
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

      const setResults = currentSetResponses.map(response => {
        const question = difficultyGroups[i].questions.find(
          (_, idx) => resultStartIndex + idx === response.questionIndex
        )
        const isCorrect = question && question.correctAnswer === response.answer
        if (isCorrect) totalCorrect++

        const userOptionIndex = response.answer.charCodeAt(0) - 65
        const correctOptionIndex = question?.correctAnswer.charCodeAt(0) - 65
        const userAnswerText = question?.options[userOptionIndex]
          ? `${response.answer}. ${question.options[userOptionIndex]}`
          : response.answer
        const correctAnswerText = question?.options[correctOptionIndex]
          ? `${question.correctAnswer}. ${question.options[correctOptionIndex]}`
          : question?.correctAnswer

        return {
          questionId: question?.id || `q_${response.questionIndex}`,
          question: question?.question || 'Unknown question',
          userAnswer: userAnswerText,
          correctAnswer: correctAnswerText,
          isCorrect: !!isCorrect,
          explanation: question?.explanation || 'No explanation available.',
          points: isCorrect ? 1 : 0,
          videoUrl: videoUrl
        }
      })

      allResults.push(...setResults)
      resultStartIndex += setQuestions
    }

    const finalScore = Math.round((totalCorrect / totalQuestions) * 100)

    const finalResults = {
      sessionId: `group_${sessionId}_${Date.now()}`,
      score: finalScore,
      totalQuestions,
      correctAnswers: totalCorrect,
      results: allResults,
      submittedAt: new Date().toISOString(),
      setIndex: difficultyGroups.length - 1,
      difficulty: 'mixed',
      userData: isAuthenticated ? { userId: user?.id, email: user?.email } : undefined,
      // Additional group context
      groupId,
      groupSessionId: sessionId,
      isGroupQuiz: true
    }

    // Submit final results to group leaderboard with proper authentication
    if (isAuthenticated && user?.id) {
      try {
        // Use auth-utils for proper authentication headers
        const { getAuthHeaders } = await import('@/lib/supabase/auth-utils')
        const headers = await getAuthHeaders()

        const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/results`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            score: finalScore,
            total_questions: totalQuestions,
            correct_answers: totalCorrect,
            time_taken_seconds: null, // Could add timer functionality later
            result_data: {
              allResults,
              difficultyGroups: difficultyGroups.map(g => ({
                difficulty: g.difficulty,
                questionCount: g.questions.length
              }))
            }
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Failed to submit final results to group leaderboard:', errorData)
        } else {
          console.log('Final results submitted successfully to group leaderboard')
        }
      } catch (error) {
        console.error('Error submitting final results:', error)
      }
    }

    setResults(finalResults)
    setAppState('quiz-results')
    console.log('Final results with videoUrl:', finalResults)
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

  const handleRestart = () => {
    setAppState('preset-selection')
    setSelectedPreset(null)
    setDifficultyGroups([])
    setCurrentSetIndex(0)
    setCurrentQuestionIndex(0)
    setResponses([])
    setResults(null)
  }

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true)
      return
    }
    // Simplified for group context
  }

  const handleAuthSuccess = () => {
    setShowAuthPrompt(false)
    queryClient.invalidateQueries({ queryKey: quizQueryKeys.questionSet(session?.share_token || '') })
  }

  const handleCloseAuthPrompt = () => {
    setShowAuthPrompt(false)
  }

  const openGridView = () => setShowGridView(true)
  const closeGridView = () => setShowGridView(false)

  // Navigation methods
  const navigateToQuestion = useCallback((questionIndex: number) => {
    const currentSet = difficultyGroups[currentSetIndex]
    if (currentSet && questionIndex >= 0 && questionIndex < currentSet.questions.length) {
      setCurrentQuestionIndex(questionIndex)
    }
  }, [difficultyGroups, currentSetIndex, setCurrentQuestionIndex])

  const navigateToPrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }, [currentQuestionIndex, setCurrentQuestionIndex])

  const navigateToNext = useCallback(() => {
    const currentSet = difficultyGroups[currentSetIndex]
    if (currentSet && currentQuestionIndex < currentSet.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }, [difficultyGroups, currentSetIndex, currentQuestionIndex, setCurrentQuestionIndex])

  return {
    // App state
    appState,
    questionSet: null, // Removed questionSet dependency
    error: sessionError || groupError,

    // Group context
    session,
    group,
    participants,
    onlineParticipants,
    isUserJoined,

    // Quiz functionality
    isFavorited,
    favoriteLoading: false,
    showAuthPrompt,
    handleFavoriteToggle,
    handleAuthSuccess,
    handleCloseAuthPrompt,
    handlePresetSelect,
    getAvailableQuestionCounts,
    handleQuestionInfoStart,
    handleStartQuizFromPreview,
    handleGoBackFromPreview,
    getCurrentQuestion,
    responses,
    handleAnswerSelect,
    moveToNextQuestion,
    submitCurrentSet,
    moveToNextSet,
    isLastQuestionInSet,
    allQuestionsInSetAnswered,
    submitting: submitGroupResultsMutation.isPending,
    handleRestart,
    showVocabulary,
    setShowVocabulary,
    showTranscript,
    setShowTranscript,
    currentSetIndex,
    currentQuestionIndex,
    difficultyGroups,
    results,
    authLoading,
    showGridView,
    openGridView,
    closeGridView,
    user: quizUser || user,
    isAuthenticated,
    signOut,
    loadQuestionsFromShareTokens, // Expose for external use
    // Navigation methods
    navigateToQuestion,
    navigateToPrevious,
    navigateToNext
  }
}
