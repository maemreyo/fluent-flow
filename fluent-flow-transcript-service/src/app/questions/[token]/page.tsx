'use client'

import { useQuiz } from './hooks/useQuiz'
import { LoadingView } from './components/LoadingView'
import { ErrorView } from './components/ErrorView'
import { PresetSelectionView } from './components/PresetSelectionView'
import { QuestionInfoView } from './components/QuestionInfoView'
import { QuizActiveView } from './components/QuizActiveView'
import { QuizResultsView } from './components/QuizResultsView'

export default function QuestionsPage() {
  const {
    appState,
    questionSet,
    error,
    isFavorited,
    favoriteLoading,
    handleFavoriteToggle,
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
    closeGridView
  } = useQuiz()

  if (appState === 'loading' || (authLoading && !questionSet)) {
    return <LoadingView message="Loading questions..." />
  }

  if (appState === 'error') {
    return <ErrorView error={error} onRetry={() => window.location.reload()} />
  }

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
}