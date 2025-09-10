'use client'

import { useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle,
  Eye,
  EyeOff,
  FileQuestion,
  HelpCircle,
  ListTodo
} from 'lucide-react'
import { Badge } from '../../../../../../components/ui/badge'
import { Button } from '../../../../../../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../../../components/ui/tabs'

interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  difficulty: 'easy' | 'medium' | 'hard'
  explanation?: string
}

interface DifficultyGroup {
  difficulty: 'easy' | 'medium' | 'hard'
  questions: Question[]
  completed: boolean
}

interface GroupQuizPreviewProps {
  difficultyGroups: DifficultyGroup[]
  onStartQuiz: () => void
  onGoBack: () => void
  canShowAnswers?: boolean // For admin/owner
  sessionTitle?: string
  quizSettings?: {
    shuffleQuestions?: boolean
    shuffleAnswers?: boolean
    showCorrectAnswers?: boolean
    defaultQuizTimeLimit?: number
    enforceQuizTimeLimit?: boolean
    allowSkippingQuestions?: boolean
  }
}

const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-red-100 text-red-800'
}

const TAB_TRIGGER_CLASSES = {
  easy: 'data-[state=active]:bg-green-100 data-[state=active]:text-green-800 data-[state=active]:shadow-inner',
  medium:
    'data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-800 data-[state=active]:shadow-inner',
  hard: 'data-[state=active]:bg-red-100 data-[state=active]:text-red-800 data-[state=active]:shadow-inner'
}

export function GroupQuizPreview({
  difficultyGroups,
  onStartQuiz,
  onGoBack,
  canShowAnswers = false,
  sessionTitle,
  quizSettings = {}
}: GroupQuizPreviewProps) {
  const [showAnswers, setShowAnswers] = useState(false)

  const totalQuestions = difficultyGroups.reduce((sum, group) => sum + group.questions.length, 0)
  const easyQuestions = difficultyGroups
    .filter(g => g.difficulty === 'easy')
    .reduce((sum, g) => sum + g.questions.length, 0)
  const mediumQuestions = difficultyGroups
    .filter(g => g.difficulty === 'medium')
    .reduce((sum, g) => sum + g.questions.length, 0)
  const hardQuestions = difficultyGroups
    .filter(g => g.difficulty === 'hard')
    .reduce((sum, g) => sum + g.questions.length, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-8xl container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Button onClick={onGoBack} variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Question Preview</h1>
              {sessionTitle && <p className="mt-1 text-gray-500">{sessionTitle}</p>}
            </div>
          </div>

          <div className="flex w-full flex-shrink-0 items-center justify-end gap-3 sm:w-auto">
            {canShowAnswers && (
              <Button
                onClick={() => setShowAnswers(!showAnswers)}
                variant="outline"
                className="flex items-center gap-2"
              >
                {showAnswers ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    <span>Hide Answers</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    <span>Show Answers</span>
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={onStartQuiz}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 sm:flex-none"
            >
              Start Quiz
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div>
          {/* Compact Stats */}
          <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-around gap-x-6 gap-y-4">
              <div className="flex items-center gap-3 text-gray-700">
                <FileQuestion className="h-5 w-5 text-gray-400" />
                <div>
                  <span className="text-lg font-bold text-gray-900">{totalQuestions}</span>
                  <span className="ml-2 text-sm">Total Questions</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <ListTodo className="h-5 w-5 text-gray-400" />
                <div>
                  <span className="text-lg font-bold text-gray-900">{difficultyGroups.length}</span>
                  <span className="ml-2 text-sm">Sets</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <div>
                  <span className="text-lg font-bold">{easyQuestions}</span>
                  <span className="ml-2 text-sm">Easy</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-yellow-600">
                <HelpCircle className="h-5 w-5" />
                <div>
                  <span className="text-lg font-bold">{mediumQuestions}</span>
                  <span className="ml-2 text-sm">Medium</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <span className="text-lg font-bold">{hardQuestions}</span>
                  <span className="ml-2 text-sm">Hard</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quiz Settings Panel */}
          {/* <div className="mb-8">
            <QuizSettingsPanel settings={quizSettings} />
          </div> */}

          {/* Question Sets in Tabs */}
          <Tabs defaultValue="set-0" className="w-full">
            <TabsList
              className={`mb-4 grid h-auto w-full rounded-lg bg-gray-200/75 p-1 ${
                difficultyGroups.length === 1
                  ? 'grid-cols-1'
                  : difficultyGroups.length === 2
                    ? 'grid-cols-2'
                    : 'grid-cols-3'
              }`}
            >
              {difficultyGroups.map((group, setIndex) => (
                <TabsTrigger
                  key={setIndex}
                  value={`set-${setIndex}`}
                  className={`h-11 text-sm font-semibold capitalize transition-colors duration-300 ${TAB_TRIGGER_CLASSES[group.difficulty]}`}
                >
                  {group.difficulty}
                </TabsTrigger>
              ))}
            </TabsList>
            {difficultyGroups.map((group, setIndex) => (
              <TabsContent key={setIndex} value={`set-${setIndex}`}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
                  {group.questions.map((question, questionIndex) => (
                    <div
                      key={question.id || questionIndex}
                      className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
                        <p className="font-semibold text-indigo-700">
                          Question {questionIndex + 1}
                        </p>
                        <Badge
                          className={`border-none text-xs font-bold capitalize ${
                            DIFFICULTY_COLORS[question.difficulty]
                          }`}
                        >
                          {question.difficulty}
                        </Badge>
                      </div>

                      <div className="p-4">
                        <p className="mb-4 text-base text-gray-800">{question.question}</p>

                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => {
                            const optionLetter = String.fromCharCode(65 + optionIndex)
                            const isCorrect = showAnswers && optionLetter === question.correctAnswer

                            return (
                              <div
                                key={optionIndex}
                                className={`flex items-center justify-between rounded-md border p-3 transition-colors ${
                                  isCorrect
                                    ? 'border-green-300 bg-green-50/70'
                                    : 'border-gray-200 bg-white'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <span
                                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                                      isCorrect
                                        ? 'border-green-500 bg-green-100 text-green-700'
                                        : 'border-gray-300 text-gray-600'
                                    }`}
                                  >
                                    {optionLetter}
                                  </span>
                                  <span
                                    className={`flex-1 text-sm ${
                                      isCorrect ? 'font-semibold text-green-900' : 'text-gray-700'
                                    }`}
                                  >
                                    {option}
                                  </span>
                                </div>
                                {isCorrect && <Check className="h-5 w-5 text-green-600" />}
                              </div>
                            )
                          })}
                        </div>

                        {showAnswers && question.explanation && (
                          <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3">
                            <p className="text-sm font-semibold text-blue-800">Explanation</p>
                            <p className="mt-1 text-sm text-blue-700">{question.explanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  )
}
