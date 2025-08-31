'use client'

import { Star, BookOpen, FileText, Eye, RotateCcw, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react'
import { GridView } from '../../../../components/questions/GridView'
import { QuestionCard, QuestionResponse } from '../../../../components/questions/QuestionCard'
import { QuestionSet } from '../../../../components/questions/QuestionSetInfo'
import { TranscriptPanel } from '../../../../components/questions/TranscriptPanel'
import { VocabularyPanel } from '../../../../components/questions/VocabularyPanel'
import { Button } from '../../../../components/ui/button'
import { UserAvatar } from './UserAvatar'

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
  user?: any
  isAuthenticated?: boolean
  authLoading?: boolean
  onSignOut?: () => void
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
  difficultyGroups,
  user,
  isAuthenticated = false,
  authLoading = false,
  onSignOut
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-10 right-10 w-72 h-72 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-gradient-to-r from-pink-400/20 to-orange-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Standalone User Avatar */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-6">
        <div className="flex justify-end mb-4">
          <UserAvatar 
            user={user}
            isAuthenticated={isAuthenticated}
            authLoading={authLoading}
            onSignOut={onSignOut}
          />
        </div>
      </div>

      {/* Enhanced Header Bar */}
      <div className="relative z-10 border-b border-white/20 bg-white/80 backdrop-blur-sm shadow-lg">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between p-6">
            {/* Left Section - Favorite Button */}
            <div className="flex items-center gap-4">
              <Button
                onClick={onFavoriteToggle}
                disabled={favoriteLoading}
                className={`h-12 px-6 rounded-2xl font-semibold shadow-lg transition-all duration-300 ${
                  isFavorited 
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-yellow-200' 
                    : 'bg-white/70 backdrop-blur-sm border-2 border-gray-200 hover:border-yellow-400 hover:bg-yellow-50 text-gray-700'
                } ${favoriteLoading ? 'cursor-wait opacity-50' : 'hover:scale-105'}`}
              >
                <Star
                  className={`mr-2 h-5 w-5 transition-all duration-300 ${
                    isFavorited 
                      ? 'text-white fill-white' 
                      : 'text-gray-600 group-hover:text-yellow-500'
                  }`}
                />
                {favoriteLoading ? 'Saving...' : isFavorited ? 'Starred' : 'Star Quiz'}
              </Button>
            </div>

            {/* Right Section - Action Buttons */}
            <div className="flex items-center gap-3">
              {questionSet?.vocabulary && (
                <Button
                  onClick={() => setShowVocabulary(!showVocabulary)}
                  className={`h-11 px-5 rounded-2xl font-medium shadow-md transition-all duration-300 ${
                    showVocabulary 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-emerald-200' 
                      : 'bg-white/70 backdrop-blur-sm border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 text-gray-700'
                  } hover:scale-105`}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Vocabulary
                </Button>
              )}

              {questionSet?.transcript && (
                <Button
                  onClick={() => setShowTranscript(!showTranscript)}
                  className={`h-11 px-5 rounded-2xl font-medium shadow-md transition-all duration-300 ${
                    showTranscript 
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-blue-200' 
                      : 'bg-white/70 backdrop-blur-sm border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700'
                  } hover:scale-105`}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Transcript
                </Button>
              )}
              
              <Button 
                onClick={openGridView} 
                className="h-11 px-5 rounded-2xl font-medium shadow-md transition-all duration-300 bg-white/70 backdrop-blur-sm border border-gray-200 hover:border-purple-400 hover:bg-purple-50 text-gray-700 hover:scale-105"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview Questions
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Main Content */}
      <div className="relative z-10 mx-auto max-w-5xl p-6">
        {/* Question Card with Background */}
        <div className="relative mb-8">
          {/* Background blur effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-purple-50/50 to-blue-50/50 rounded-3xl blur-3xl -z-10"></div>
          
          <div className="relative">
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
          </div>
        </div>

        {/* Enhanced Error Display */}
        {error && (
          <div className="mb-8 transform rounded-3xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-6 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-bold text-red-800 mb-1">Error Occurred</h4>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Navigation Bar */}
        <div className="relative">
          {/* Background blur effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 via-white/50 to-gray-50/50 rounded-3xl blur-3xl -z-10"></div>
          
          <div className="relative rounded-3xl border-2 border-white/20 shadow-2xl bg-white/80 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between">
              {/* Restart Button */}
              <Button 
                onClick={handleRestart}
                className="h-12 px-6 rounded-2xl font-semibold shadow-lg transition-all duration-300 bg-white/70 backdrop-blur-sm border-2 border-gray-200 hover:border-red-400 hover:bg-red-50 text-gray-700 hover:scale-105"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Start Over
              </Button>

              {/* Navigation Buttons */}
              <div className="flex gap-4">
                {!isLastQuestionInSet() ? (
                  <Button
                    onClick={moveToNextQuestion}
                    disabled={!responses.find(r => r.questionIndex === currentData.questionIndex)}
                    className={`h-12 px-8 rounded-2xl font-bold shadow-lg transition-all duration-300 ${
                      responses.find(r => r.questionIndex === currentData.questionIndex)
                        ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 hover:from-indigo-600 hover:via-purple-600 hover:to-blue-600 text-white hover:scale-105 shadow-indigo-200'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Next Question
                  </Button>
                ) : (
                  <Button
                    onClick={submitCurrentSet}
                    disabled={!allQuestionsInSetAnswered() || submitting}
                    className={`h-12 px-8 rounded-2xl font-bold shadow-lg transition-all duration-300 ${
                      allQuestionsInSetAnswered() && !submitting
                        ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white hover:scale-105 shadow-green-200'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </div>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete Set
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
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
