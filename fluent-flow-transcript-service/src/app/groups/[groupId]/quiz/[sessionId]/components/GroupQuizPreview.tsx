'use client'

import { useState } from 'react'
import { Separator } from '@radix-ui/react-separator'
import { ArrowLeft, BookOpen, Eye, EyeOff } from 'lucide-react'
import { Badge } from '../../../../../../components/ui/badge'
import { Button } from '../../../../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../../components/ui/card'

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
}

const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  hard: 'bg-red-100 text-red-800 border-red-200'
}

export function GroupQuizPreview({
  difficultyGroups,
  onStartQuiz,
  onGoBack,
  canShowAnswers = false,
  sessionTitle
}: GroupQuizPreviewProps) {
  const [showAnswers, setShowAnswers] = useState(false)
  const [expandedSets, setExpandedSets] = useState<Set<number>>(new Set([0])) // First set expanded by default

  const toggleSetExpansion = (setIndex: number) => {
    const newExpanded = new Set(expandedSets)
    if (newExpanded.has(setIndex)) {
      newExpanded.delete(setIndex)
    } else {
      newExpanded.add(setIndex)
    }
    setExpandedSets(newExpanded)
  }

  const totalQuestions = difficultyGroups.reduce((sum, group) => sum + group.questions.length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={onGoBack} variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Question Preview</h1>
            {sessionTitle && <p className="mt-1 text-gray-600">{sessionTitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canShowAnswers && (
            <Button
              onClick={() => setShowAnswers(!showAnswers)}
              variant="outline"
              className="flex items-center gap-2"
            >
              {showAnswers ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Hide Answers
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Show Answers
                </>
              )}
            </Button>
          )}

          <Button
            onClick={onStartQuiz}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            Start Quiz
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{totalQuestions}</div>
            <div className="text-sm text-gray-600">Total Questions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{difficultyGroups.length}</div>
            <div className="text-sm text-gray-600">Sets</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {difficultyGroups
                .filter(g => g.difficulty === 'easy')
                .reduce((sum, g) => sum + g.questions.length, 0)}
            </div>
            <div className="text-sm text-gray-600">Easy</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {difficultyGroups
                .filter(g => g.difficulty === 'hard')
                .reduce((sum, g) => sum + g.questions.length, 0)}
            </div>
            <div className="text-sm text-gray-600">Hard</div>
          </CardContent>
        </Card>
      </div>

      {/* Question Sets */}
      <div className="space-y-4">
        {difficultyGroups.map((group, setIndex) => {
          const isExpanded = expandedSets.has(setIndex)

          return (
            <Card key={setIndex} className="overflow-hidden">
              <CardHeader
                className="cursor-pointer transition-colors hover:bg-gray-50"
                onClick={() => toggleSetExpansion(setIndex)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">Set {setIndex + 1}</CardTitle>
                    <Badge className={DIFFICULTY_COLORS[group.difficulty]}>
                      {group.difficulty.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {group.questions.length} questions
                    </span>
                  </div>
                  <BookOpen
                    className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  <div className="space-y-4">
                    {group.questions.map((question, questionIndex) => (
                      <div
                        key={question.id || questionIndex}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                      >
                        {/* Question Header */}
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                              {questionIndex + 1}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {question.difficulty}
                            </Badge>
                          </div>
                        </div>

                        {/* Question Text */}
                        <h3 className="mb-3 font-medium leading-relaxed text-gray-900">
                          {question.question}
                        </h3>

                        {/* Options */}
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => {
                            const optionLetter = String.fromCharCode(65 + optionIndex)
                            const isCorrect = showAnswers && optionLetter === question.correctAnswer

                            return (
                              <div
                                key={optionIndex}
                                className={`rounded-lg border p-3 transition-colors ${
                                  isCorrect
                                    ? 'border-green-300 bg-green-50'
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
                                    className={`text-sm ${isCorrect ? 'font-medium text-green-800' : 'text-gray-700'}`}
                                  >
                                    {option}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Explanation (only show if answers are visible) */}
                        {showAnswers && question.explanation && (
                          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                            <div className="mb-1 text-xs font-medium text-blue-700">
                              Explanation:
                            </div>
                            <p className="text-sm text-blue-800">{question.explanation}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-center border-t pt-6">
        <Button
          onClick={onStartQuiz}
          size="lg"
          className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3 hover:from-indigo-700 hover:to-purple-700"
        >
          Start Quiz ({totalQuestions} Questions)
        </Button>
      </div>
    </div>
  )
}
