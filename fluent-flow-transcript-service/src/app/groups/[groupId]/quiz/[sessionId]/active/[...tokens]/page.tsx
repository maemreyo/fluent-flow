'use client'

import { use, useEffect } from 'react'
import { GroupQuizActiveView } from '../../components/GroupQuizActiveView'
import { useQuizFlow } from '../../shared/hooks/useQuizFlow'

interface ActiveWithTokensPageProps {
  params: Promise<{
    groupId: string
    sessionId: string
    tokens: string[]
  }>
}

export default function ActiveWithTokensPage({ params }: ActiveWithTokensPageProps) {
  const { groupId, sessionId, tokens } = use(params)

  // Decode shareTokens from route parameters
  const decodeShareTokensFromRoute = () => {
    console.log('🔍 [Active/Tokens] Raw tokens from route:', tokens)
    
    if (!tokens || tokens.length === 0) {
      console.log('❌ [Active/Tokens] No tokens in route params')
      return {}
    }

    const shareTokens: Record<string, string> = {}
    
    try {
      // Tokens are encoded as a single base64 encoded JSON string
      // e.g., /active/eyJlYXN5IjoiYWJjMTIzIiwibWVkaXVtIjoiZGVmNDU2In0
      const encodedTokens = tokens[0] // First (and only) parameter
      console.log('🔍 [Active/Tokens] Encoded tokens string:', encodedTokens)
      
      // Decode from base64
      const decodedString = atob(encodedTokens)
      console.log('🔍 [Active/Tokens] Decoded JSON string:', decodedString)
      
      // Parse JSON
      const parsedTokens = JSON.parse(decodedString)
      console.log('✅ [Active/Tokens] Parsed shareTokens:', parsedTokens)
      
      // Validate that we have expected difficulty keys
      const validDifficulties = ['easy', 'medium', 'hard']
      Object.entries(parsedTokens).forEach(([difficulty, token]) => {
        if (validDifficulties.includes(difficulty) && typeof token === 'string') {
          shareTokens[difficulty] = token
          console.log(`✅ [Active/Tokens] Valid ${difficulty}Token:`, token.substring(0, 10) + '...')
        }
      })
      
    } catch (error) {
      console.error('❌ [Active/Tokens] Failed to decode shareTokens from route:', error)
    }

    console.log('✅ [Active/Tokens] Final decoded shareTokens:', shareTokens)
    return shareTokens
  }

  // Store shareTokens in sessionStorage for useGroupQuiz hook
  useEffect(() => {
    const shareTokens = decodeShareTokensFromRoute()
    
    if (Object.keys(shareTokens).length > 0) {
      const sessionStorageKey = `quiz-shareTokens-${sessionId}`
      console.log('💾 [Active/Tokens] Storing shareTokens in sessionStorage:', sessionStorageKey)
      sessionStorage.setItem(sessionStorageKey, JSON.stringify(shareTokens))
    }
  }, [tokens, sessionId])

  const {
    session,
    group,
    participants,
    onlineParticipants,
    user,
    getCurrentQuestion,
    responses,
    handleAnswerSelect,
    moveToNextQuestion,
    submitCurrentSet,
    moveToNextSet,
    isLastQuestionInSet,
    allQuestionsInSetAnswered,
    submitting,
    currentSetIndex,
    currentQuestionIndex,
    difficultyGroups,
    handleNavigateToQuestion,
    handleNavigatePrevious,
    handleNavigateNext,
    navigateToResults,
    appState
  } = useQuizFlow({ groupId, sessionId })

  // Auto-navigate to results when quiz is completed
  useEffect(() => {
    if (appState === 'quiz-results') {
      console.log('🎯 Quiz completed, navigating to results page')
      navigateToResults()
    }
  }, [appState, navigateToResults])

  // Group settings
  const groupSettings = (group as any)?.settings || {}

  return (
    <div className="mx-auto max-w-4xl">
      <GroupQuizActiveView
        currentQuestion={getCurrentQuestion()}
        responses={responses}
        onAnswerSelect={handleAnswerSelect}
        onNextQuestion={moveToNextQuestion}
        onSubmitSet={submitCurrentSet}
        onMoveToNextSet={moveToNextSet}
        isLastQuestion={isLastQuestionInSet()}
        allAnswered={allQuestionsInSetAnswered()}
        submitting={submitting}
        currentSetIndex={currentSetIndex}
        totalSets={difficultyGroups.length}
        participants={participants}
        onlineParticipants={onlineParticipants}
        timeLimit={
          groupSettings.enforceQuizTimeLimit
            ? groupSettings.defaultQuizTimeLimit || 30
            : null
        }
        allowQuestionSkipping={groupSettings.allowSkippingQuestions ?? false}
        currentQuestionIndex={currentQuestionIndex}
        quizSettings={groupSettings}
        onNavigateToQuestion={handleNavigateToQuestion}
        onNavigatePrevious={handleNavigatePrevious}
        onNavigateNext={handleNavigateNext}
        totalQuestionsInCurrentSet={getCurrentQuestion()?.groupData?.questions?.length || 0}
      />
    </div>
  )
}