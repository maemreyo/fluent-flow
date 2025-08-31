'use client'

import { useQuiz } from './hooks/useQuiz'
import { LoadingView } from './components/LoadingView'
import { ErrorView } from './components/ErrorView'
import { PresetSelectionView } from './components/PresetSelectionView'
import { QuestionInfoView } from './components/QuestionInfoView'
import { QuizActiveView } from './components/QuizActiveView'
import { QuizResultsView } from './components/QuizResultsView'
import { AuthPrompt } from '../../../components/auth/AuthPrompt'

export default function QuestionsPage() {
  const {
    appState,
    questionSet,
    error,
    isFavorited,
    favoriteLoading,
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
    submitting,
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
    user,
    isAuthenticated,
    signOut
  } = useQuiz()

  if (appState === 'loading' || (authLoading && !questionSet)) {
    return <LoadingView message="Loading questions..." />
  }

  if (appState === 'error') {
    return <ErrorView error={error} onRetry={() => window.location.reload()} />
  }

  return (
    <>
      {/* Auth Prompt Modal */}
      {showAuthPrompt && (
        <AuthPrompt
          onClose={handleCloseAuthPrompt}
          onAuthSuccess={handleAuthSuccess}
          title="Unlock Premium Learning Experience!"
          subtitle="Sign in to access personalized quizzes, track progress, and save favorites"
        />
      )}
      
      {(() => {
        switch (appState) {
          case 'preset-selection':
            return (
              <PresetSelectionView
                questionSet={questionSet}
                isFavorited={isFavorited}
                favoriteLoading={favoriteLoading}
                onFavoriteToggle={handleFavoriteToggle}
                onPresetSelect={handlePresetSelect}
                getAvailableQuestionCounts={getAvailableQuestionCounts}
                user={user}
                isAuthenticated={isAuthenticated}
                authLoading={authLoading}
                onSignOut={signOut}
              />
            )

          case 'question-info':
            return (
              <QuestionInfoView
                questionSet={questionSet}
                onStart={handleQuestionInfoStart}
                getAvailableQuestionCounts={getAvailableQuestionCounts}
              />
            )

          case 'quiz-active':
            return (
              <QuizActiveView
                questionSet={questionSet}
                currentData={getCurrentQuestion()}
                responses={responses}
                onAnswerSelect={handleAnswerSelect}
                moveToNextQuestion={moveToNextQuestion}
                submitCurrentSet={submitCurrentSet}
                isLastQuestionInSet={isLastQuestionInSet}
                allQuestionsInSetAnswered={allQuestionsInSetAnswered}
                submitting={submitting}
                handleRestart={handleRestart}
                error={error}
                showVocabulary={showVocabulary}
                setShowVocabulary={setShowVocabulary}
                showTranscript={showTranscript}
                setShowTranscript={setShowTranscript}
                isFavorited={isFavorited}
                favoriteLoading={favoriteLoading}
                onFavoriteToggle={handleFavoriteToggle}
                currentSetIndex={currentSetIndex}
                totalSets={difficultyGroups.length}
                showGridView={showGridView}
                openGridView={openGridView}
                closeGridView={closeGridView}
                difficultyGroups={difficultyGroups}
                user={user}
                isAuthenticated={isAuthenticated}
                authLoading={authLoading}
                onSignOut={signOut}
              />
            )

          case 'quiz-results':
            return (
              <QuizResultsView
                results={results}
                questionSet={questionSet}
                onRestart={handleRestart}
              />
            )

          default:
            return null
        }
      })()}
    </>
  )
}