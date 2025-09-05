'use client'

import {
  ArrowLeft,
  Brain,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  Zap
} from 'lucide-react'
import type { QuestionPreset } from '../../../../../../components/questions/PresetSelector'
import { Button } from '../../../../../../components/ui/button'
import { Card, CardContent } from '../../../../../../components/ui/card'

interface GroupPresetSelectionViewProps {
  onPresetSelect: (preset: QuestionPreset) => void
  onlineParticipants: Array<{ user_id: string; user_email: string; is_online: boolean }>
  onGenerateQuestions?: (difficulty: 'easy' | 'medium' | 'hard') => Promise<void>
  onGenerateAllQuestions?: () => Promise<void>
  generatingState?: {
    easy: boolean
    medium: boolean
    hard: boolean
    all: boolean
  }
  generatedCounts?: {
    easy: number
    medium: number
    hard: number
  }
}

export function GroupPresetSelectionView({
  onPresetSelect,
  onlineParticipants,
  onGenerateQuestions,
  onGenerateAllQuestions,
  generatingState = { easy: false, medium: false, hard: false, all: false },
  generatedCounts = { easy: 0, medium: 0, hard: 0 }
}: GroupPresetSelectionViewProps) {
  // Predefined difficulty levels for question generation
  const difficultyLevels = [
    {
      id: 'easy',
      name: 'Easy',
      description: 'Basic comprehension questions',
      icon: Zap,
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-300',
      hoverColor: 'hover:bg-green-50'
    },
    {
      id: 'medium',
      name: 'Medium',
      description: 'Intermediate analysis questions',
      icon: Target,
      color: 'yellow',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-300',
      hoverColor: 'hover:bg-yellow-50'
    },
    {
      id: 'hard',
      name: 'Hard',
      description: 'Advanced critical thinking questions',
      icon: Brain,
      color: 'red',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      borderColor: 'border-red-300',
      hoverColor: 'hover:bg-red-50'
    }
  ] as const

  const handleGenerateQuestions = async (difficulty: 'easy' | 'medium' | 'hard') => {
    if (onGenerateQuestions) {
      await onGenerateQuestions(difficulty)
    }
  }

  const handleGenerateAllQuestions = async () => {
    if (onGenerateAllQuestions) {
      await onGenerateAllQuestions()
    }
  }

  const totalGenerated = generatedCounts.easy + generatedCounts.medium + generatedCounts.hard

  const handleGoBack = () => {
    if (window.confirm('Are you sure you want to leave this quiz session?')) {
      window.history.back()
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={handleGoBack}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Group
          </button>
        </div>

        <div className="flex items-center gap-3">
          {totalGenerated > 0 && (
            <div className="text-center">
              <div className="text-lg font-bold text-indigo-600">{totalGenerated}</div>
              <div className="text-xs text-gray-500">generated</div>
            </div>
          )}
        </div>

        {/* Generate All Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleGenerateAllQuestions}
            disabled={generatingState.all}
            className="rounded-lg bg-indigo-600 px-8 py-4 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {generatingState.all ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Generating All Questions...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate All Questions
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Difficulty Level Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {difficultyLevels.map(level => {
          const IconComponent = level.icon
          const isGenerating = generatingState[level.id as keyof typeof generatingState]
          const questionCount = generatedCounts[level.id as keyof typeof generatedCounts]

          return (
            <Card
              key={level.id}
              className={`border-2 transition-all duration-200 ${level.borderColor} ${level.bgColor} ${level.hoverColor}`}
            >
              <CardContent className="p-6">
                <div className="space-y-4 text-center">
                  {/* Icon and Title */}
                  <div className="flex flex-col items-center space-y-2">
                    <div
                      className={`rounded-full p-3 ${level.bgColor} border ${level.borderColor}`}
                    >
                      <IconComponent className={`h-6 w-6 ${level.textColor}`} />
                    </div>
                    <h3 className={`text-xl font-bold ${level.textColor}`}>{level.name}</h3>
                    <p className="text-sm text-gray-600">{level.description}</p>
                  </div>

                  {/* Question Count */}
                  <div className="py-3">
                    <div className={`text-2xl font-bold ${level.textColor}`}>{questionCount}</div>
                    <div className="text-xs text-gray-500">questions generated</div>
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={() => handleGenerateQuestions(level.id as 'easy' | 'medium' | 'hard')}
                    disabled={isGenerating || generatingState.all}
                    variant="outline"
                    className={`w-full ${level.borderColor} ${level.textColor} ${level.hoverColor} disabled:opacity-50`}
                  >
                    {isGenerating ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Generate {level.name}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Start Quiz Section */}
      {totalGenerated > 0 && (
        <div className="border-t border-gray-200 pt-8">
          <div className="space-y-4 text-center">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center justify-center gap-2 text-green-700">
                <Trophy className="h-5 w-5" />
                <span className="font-medium">
                  Ready to start! You have {totalGenerated} questions generated.
                </span>
              </div>
            </div>

            <Button
              onClick={() => {
                // Start quiz with generated questions
                const mockPreset: QuestionPreset = {
                  id: 'generated',
                  name: 'Generated Questions',
                  description: 'AI Generated Questions',
                  icon: Sparkles,
                  distribution: generatedCounts,
                  totalQuestions: totalGenerated
                }
                onPresetSelect(mockPreset)
              }}
              className="rounded-lg bg-green-600 px-12 py-4 font-semibold text-white hover:bg-green-700"
            >
              Start Quiz with Generated Questions
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
