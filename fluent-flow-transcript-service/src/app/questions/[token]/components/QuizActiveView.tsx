'use client'

import { Star } from 'lucide-react'
import { GridView } from '../../../../components/questions/GridView'
import { QuestionCard, QuestionResponse } from '../../../../components/questions/QuestionCard'
import { QuestionSet } from '../../../../components/questions/QuestionSetInfo'
import { TranscriptPanel } from '../../../../components/questions/TranscriptPanel'
import { VocabularyPanel } from '../../../../components/questions/VocabularyPanel'
import { Button } from '../../../../components/ui/button'

interface QuizActiveViewProps {
  questionSet: QuestionSet | null
  currentData: any
  responses: QuestionResponse[]
  onAnswerSelect: (questionIndex: number, answer: string) => void
  moveToNextQuestion: () => void
  submitCurrentSet: () => void
  isLastQuestionInSet: () => boolean
  allQuestionsInSetAnswered: () => boolean
  submitting: boolean
  handleRestart: () => void
  error: string | null
  showVocabulary: boolean
  setShowVocabulary: (show: boolean) => void
  showTranscript: boolean
  setShowTranscript: (show: boolean) => void
  isFavorited: boolean
  favoriteLoading: boolean
  onFavoriteToggle: () => void
  currentSetIndex: number
  totalSets: number
  showGridView: boolean
  openGridView: () => void
  closeGridView: () => void
  difficultyGroups: any[]
}

export function QuizActiveView({
  questionSet,
  currentData,
  responses,
  onAnswerSelect,
  moveToNextQuestion,
  submitCurrentSet,
  isLastQuestionInSet,
  allQuestionsInSetAnswered,
  submitting,
  handleRestart,
  error,
  showVocabulary,
  setShowVocabulary,
  showTranscript,
  setShowTranscript,
  isFavorited,
  favoriteLoading,
  onFavoriteToggle,
  currentSetIndex,
  totalSets,
  showGridView,
  openGridView,
  closeGridView,
  difficultyGroups
}: QuizActiveViewProps) {
  if (!currentData || !questionSet) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No questions available</p>
          <Button onClick={handleRestart} className="mt-4">
            Start Over
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center justify-between border-b bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            onClick={onFavoriteToggle}
            disabled={favoriteLoading}
            variant={isFavorited ? 'default' : 'outline'}
            size="sm"
            className={`transition-all duration-200 ${
              favoriteLoading ? 'cursor-wait opacity-50' : ''
            }`}
          >
            <Star
              className={`mr-2 h-4 w-4 ${isFavorited ? 'fill-yellow-400 text-yellow-400' : ''}`}
            />
            {favoriteLoading ? 'Saving...' : isFavorited ? 'Starred' : 'Star'}
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {questionSet?.vocabulary && (
            <Button
              onClick={() => setShowVocabulary(!showVocabulary)}
              variant={showVocabulary ? 'secondary' : 'outline'}
              size="sm"
            >
              📚 Vocabulary
            </Button>
          )}

          {questionSet?.transcript && (
            <Button
              onClick={() => setShowTranscript(!showTranscript)}
              variant={showTranscript ? 'secondary' : 'outline'}
              size="sm"
            >
              📄 Transcript
            </Button>
          )}
          <Button onClick={openGridView} variant="outline" size="sm">
            Preview all questions
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl p-6">
        <QuestionCard
          question={currentData.question}
          questionIndex={currentData.questionIndex}
          totalQuestions={currentData.groupData.questions.length}
          currentSetIndex={currentSetIndex}
          totalSets={totalSets}
          responses={responses}
          onAnswerSelect={onAnswerSelect}
          enableWordSelection={true}
        />

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <Button onClick={handleRestart} variant="outline">
            Start Over
          </Button>

          <div className="space-x-4">
            {!isLastQuestionInSet() ? (
              <Button
                onClick={moveToNextQuestion}
                disabled={!responses.find(r => r.questionIndex === currentData.questionIndex)}
              >
                Next Question
              </Button>
            ) : (
              <Button
                onClick={submitCurrentSet}
                disabled={!allQuestionsInSetAnswered() || submitting}
                variant="default"
              >
                {submitting ? 'Submitting...' : 'Complete Set'}
              </Button>
            )}
          </div>
        </div>
      </div>

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

      {showGridView && (
        <GridView
          questions={difficultyGroups.flatMap(g => g.questions)}
          onClose={closeGridView}
          videoTitle={questionSet.videoTitle}
        />
      )}
    </div>
  )
}
