import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../../../../contexts/AuthContext'
import { useSessionParticipants } from '../../../components/sessions/hooks/useSessionParticipants'
import { useRealtimeSession } from './useRealtimeSession'
import { fetchQuestionSet } from '../../../../../questions/[token]/queries'
import { fetchGroupSession, fetchGroup, submitGroupQuizResults } from '../queries'
import { useQuizAuth } from '../../../../../../lib/hooks/use-quiz-auth'

// Import types and utilities from individual quiz
import type { QuestionPreset } from '../../../../../../components/questions/PresetSelector'
import type { DifficultyGroup } from '../../../../../../components/questions/ProgressIndicator'
import type { Question, QuestionResponse } from '../../../../../../components/questions/QuestionCard'

type AppState =
  | 'loading'
  | 'preset-selection'
  | 'question-info'
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
  const {
    realtimeData,
    isConnected: isRealtimeConnected,
    broadcastQuizEvent,
    refreshSession
  } = useRealtimeSession({
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

  const [showVocabulary, setShowVocabulary] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [showGridView, setShowGridView] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  // Fetch group session data
  const { data: session, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ['group-session', groupId, sessionId],
    queryFn: () => fetchGroupSession(groupId, sessionId),
    enabled: !!groupId && !!sessionId
  })

  // Fetch group data
  const { data: group, isLoading: groupLoading, error: groupError } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => fetchGroup(groupId),
    enabled: !!groupId
  })

  // Fetch question set using share token from session
  const {
    data: questionSet,
    isLoading: questionSetLoading,
    error: questionSetError
  } = useQuery({
    queryKey: ['questionSet', session?.share_token],
    queryFn: () => fetchQuestionSet(session?.share_token || ''),
    enabled: !!session?.share_token
  })

  // Debug logging
  useEffect(() => {
    console.log('🔍 Group Quiz Debug:', {
      sessionLoading,
      groupLoading,
      questionSetLoading,
      participantsLoading,
      session: session ? { 
        id: session.id, 
        title: session.title,
        share_token: session.share_token,
        hasShareToken: !!session.share_token 
      } : null,
      questionSet: questionSet ? 'loaded' : 'null',
      questionSetQueryEnabled: !!session?.share_token,
      sessionError: sessionError?.message,
      groupError: groupError?.message,
      questionSetError: questionSetError?.message,
      appState
    })
  }, [sessionLoading, groupLoading, questionSetLoading, participantsLoading, session, questionSet, sessionError, groupError, questionSetError, appState])

  // Auth handling (similar to individual quiz)
  const [authToken, setAuthToken] = useState<string | undefined>()
  const {
    user: quizUser,
    isAuthenticated,
    isLoading: authLoading,
    signOut
  } = useQuizAuth(authToken)

  useEffect(() => {
    if ((questionSet as any)?.authData?.accessToken) {
      setAuthToken((questionSet as any).authData.accessToken)
    }
  }, [questionSet])

  // Favorites handling (simplified for group context)
  const { data: isFavorited = false } = useQuery({
    queryKey: ['isFavorited', session?.share_token],
    queryFn: () => false, // Simplified for now
    enabled: !!session?.share_token && !!questionSet
  })

  // Group results submission
  const submitGroupResultsMutation = useMutation({
    mutationFn: (resultsData: any) => submitGroupQuizResults(groupId, sessionId, resultsData),
    onSuccess: (data) => {
      // Use formatted results from API response
      setResults(data.formattedResults || data)
      setAppState('quiz-results')
      // Invalidate group results queries
      queryClient.invalidateQueries({
        queryKey: ['group-results', groupId, sessionId]
      })
    }
  })

  // State management
  useEffect(() => {
    const isLoading = sessionLoading || groupLoading || questionSetLoading || participantsLoading
    
    if (isLoading) {
      setAppState('loading')
    } else if (sessionError || groupError || questionSetError) {
      setAppState('error')
    } else if (questionSet) {
      // If we have questionSet, we can proceed (isUserJoined will be handled in component)
      setAppState('preset-selection')
    }
  }, [sessionLoading, groupLoading, questionSetLoading, participantsLoading, sessionError, groupError, questionSetError, questionSet])

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
    },
    []
  )

  const handlePresetSelect = useCallback(
    (preset: QuestionPreset) => {
      if (!questionSet) return

      if (!isAuthenticated) {
        setShowAuthPrompt(true)
        return
      }

      setSelectedPreset(preset)
      const groups = createPresetGroups(preset, questionSet.questions)
      setDifficultyGroups(groups)
      setAppState('question-info')
    },
    [questionSet, createPresetGroups, isAuthenticated]
  )

  const handleQuestionInfoStart = () => {
    setAppState('quiz-active')
  }

  const submitCurrentSet = async () => {
    if (!difficultyGroups.length || !questionSet) return

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
      userData: isAuthenticated
        ? { userId: user?.id, email: user?.email }
        : undefined,
      // Additional group context
      groupId,
      sessionId,
      participants: participants.map(p => ({ 
        user_id: p.user_id, 
        user_email: p.user_email 
      }))
    }

    if (currentSetIndex < difficultyGroups.length - 1) {
      // Continue with next set (but still submit current results)
      setCurrentSetIndex(currentSetIndex + 1)
      setCurrentQuestionIndex(0)
      // Submit current set results to group
      submitGroupResultsMutation.mutate(submissionData)
    } else {
      // Final submission - calculate final results
      submitGroupResultsMutation.mutate(submissionData)
    }
  }

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    const newResponse: QuestionResponse = { questionIndex, answer }
    setResponses(prev => [
      ...prev.filter(r => r.questionIndex !== questionIndex),
      newResponse
    ])
  }

  const moveToNextQuestion = () => {
    if (
      currentQuestionIndex <
      (difficultyGroups[currentSetIndex]?.questions.length || 0) - 1
    ) {
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
    if (
      !difficultyGroups.length ||
      currentSetIndex >= difficultyGroups.length
    )
      return null
    const currentGroup = difficultyGroups[currentSetIndex]
    if (!currentGroup || currentQuestionIndex >= currentGroup.questions.length)
      return null

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

  const handleAuthSuccess = (authUser: any) => {
    setShowAuthPrompt(false)
    queryClient.invalidateQueries({ queryKey: ['questionSet', session?.share_token] })
  }

  const handleCloseAuthPrompt = () => {
    setShowAuthPrompt(false)
  }

  const openGridView = () => setShowGridView(true)
  const closeGridView = () => setShowGridView(false)

  return {
    // App state
    appState,
    questionSet,
    error: sessionError || groupError || questionSetError,

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
    getCurrentQuestion,
    responses,
    handleAnswerSelect,
    moveToNextQuestion,
    submitCurrentSet,
    isLastQuestionInSet,
    allQuestionsInSetAnswered,
    submitting: submitGroupResultsMutation.isPending,
    handleRestart,
    showVocabulary,
    setShowVocabulary,
    showTranscript,
    setShowTranscript,
    currentSetIndex,
    difficultyGroups,
    results,
    authLoading,
    showGridView,
    openGridView,
    closeGridView,
    user: quizUser || user,
    isAuthenticated,
    signOut
  }
}