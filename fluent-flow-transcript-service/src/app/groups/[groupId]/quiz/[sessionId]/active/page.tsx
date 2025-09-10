'use client'

import { use, useEffect } from 'react'
import { GroupQuizActiveView } from '../components/GroupQuizActiveView'
import { useQuizFlow } from '../shared/hooks/useQuizFlow'

interface ActivePageProps {
  params: Promise<{
    groupId: string
    sessionId: string
  }>
}

export default function ActivePage({ params }: ActivePageProps) {
  const { groupId, sessionId } = use(params)

  // Extract shareTokens from URL params for reliable question loading
  const getShareTokensFromUrl = () => {
    if (typeof window === 'undefined') return {}
    
    console.log('🔍 [Active Page] Current URL:', window.location.href)
    console.log('🔍 [Active Page] Search params:', window.location.search)
    
    const urlParams = new URLSearchParams(window.location.search)
    const tokens: Record<string, string> = {}
    
    // Look for difficulty tokens in URL params
    const difficulties = ['easy', 'medium', 'hard']
    difficulties.forEach(difficulty => {
      const token = urlParams.get(`${difficulty}Token`)
      if (token) {
        tokens[difficulty] = token
        console.log(`🔗 Found ${difficulty}Token in URL:`, token.substring(0, 10) + '...')
      }
    })
    
    if (Object.keys(tokens).length > 0) {
      console.log('🔗 Found shareTokens in URL params:', tokens)
      
      // Store in sessionStorage for useGroupQuiz hook to pick up
      sessionStorage.setItem(`quiz-shareTokens-${sessionId}`, JSON.stringify(tokens))
      console.log('💾 Stored shareTokens in sessionStorage for sessionId:', sessionId)
    } else {
      console.log('❌ No shareTokens found in URL params')
    }
    
    return tokens
  }

  // Initialize shareTokens from URL on mount
  useEffect(() => {
    getShareTokensFromUrl()
  }, [sessionId])

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
