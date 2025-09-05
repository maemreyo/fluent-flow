'use client'

import { useState } from 'react'
import { toast } from 'sonner'
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
import { PresetConfirmationDialog } from '../../../../../../components/groups/quiz/PresetConfirmationDialog'

interface GroupPresetSelectionViewProps {
  onPresetSelect: (preset: QuestionPreset) => void
  onlineParticipants: Array<{ user_id: string; user_email: string; is_online: boolean }>
  onGenerateQuestions?: (difficulty: 'easy' | 'medium' | 'hard') => Promise<void>
  onGenerateAllQuestions?: () => Promise<void>
  onGenerateFromPreset?: (
    distribution: { easy: number; medium: number; hard: number },
    presetInfo: { id: string; name: string }
  ) => Promise<void>
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
  shareTokens?: Record<string, string>
  onStartQuiz?: (shareTokens: Record<string, string>) => void
  currentPreset?: {
    id: string
    name: string
    distribution: { easy: number; medium: number; hard: number }
    createdAt: Date
  } | null
  needsPresetReplacement?: (presetId: string) => boolean
}

export function GroupPresetSelectionView({
  onPresetSelect,
  onlineParticipants,
  onGenerateQuestions,
  onGenerateAllQuestions,
  onGenerateFromPreset,
  generatingState = { easy: false, medium: false, hard: false, all: false },
  generatedCounts = { easy: 0, medium: 0, hard: 0 },
  shareTokens = {},
  onStartQuiz,
  currentPreset,
  needsPresetReplacement
}: GroupPresetSelectionViewProps) {
  // Intelligent presets for group quiz sessions (5-8 questions per difficulty for quality)
  const intelligentPresets = [
    {
      id: 'beginner-friendly',
      name: 'Beginner Friendly',
      description: 'Perfect for newcomers to the subject',
      distribution: { easy: 8, medium: 3, hard: 1 },
      totalQuestions: 12,
      icon: Zap,
      color: 'emerald',
      bgGradient: 'from-emerald-50 to-green-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-700',
      hoverBg: 'hover:bg-emerald-50',
      badge: 'Beginner',
      estimatedTime: '6 min',
      difficulty: 'Easy Focus'
    },
    {
      id: 'balanced-learning',
      name: 'Balanced Learning',
      description: 'Equal mix for comprehensive understanding',
      distribution: { easy: 5, medium: 6, hard: 5 },
      totalQuestions: 16,
      icon: Target,
      color: 'blue',
      bgGradient: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      hoverBg: 'hover:bg-blue-50',
      badge: 'Balanced',
      estimatedTime: '8 min',
      difficulty: 'Mixed Level'
    },
    {
      id: 'challenge-mode',
      name: 'Challenge Mode',
      description: 'Intensive practice for advanced learners',
      distribution: { easy: 2, medium: 5, hard: 7 },
      totalQuestions: 14,
      icon: Brain,
      color: 'purple',
      bgGradient: 'from-purple-50 to-indigo-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700',
      hoverBg: 'hover:bg-purple-50',
      badge: 'Advanced',
      estimatedTime: '8 min',
      difficulty: 'Hard Focus'
    },
    {
      id: 'quick-review',
      name: 'Quick Review',
      description: 'Short focused session for busy schedules',
      distribution: { easy: 3, medium: 4, hard: 2 },
      totalQuestions: 9,
      icon: Zap,
      color: 'amber',
      bgGradient: 'from-amber-50 to-yellow-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-700',
      hoverBg: 'hover:bg-amber-50',
      badge: 'Quick',
      estimatedTime: '4 min',
      difficulty: 'Rapid'
    },
    {
      id: 'comprehensive',
      name: 'Comprehensive',
      description: 'Thorough coverage of all difficulty levels',
      distribution: { easy: 6, medium: 8, hard: 6 },
      totalQuestions: 20,
      icon: Trophy,
      color: 'rose',
      bgGradient: 'from-rose-50 to-pink-50',
      borderColor: 'border-rose-200',
      textColor: 'text-rose-700',
      hoverBg: 'hover:bg-rose-50',
      badge: 'Complete',
      estimatedTime: '10 min',
      difficulty: 'Full Coverage'
    },
    {
      id: 'custom',
      name: 'Custom Generation',
      description: 'Generate questions manually by difficulty',
      distribution: generatedCounts,
      totalQuestions: generatedCounts.easy + generatedCounts.medium + generatedCounts.hard,
      icon: RefreshCw,
      color: 'gray',
      bgGradient: 'from-gray-50 to-slate-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-700',
      hoverBg: 'hover:bg-gray-50',
      badge: 'Custom',
      estimatedTime: `${Math.ceil((generatedCounts.easy + generatedCounts.medium + generatedCounts.hard) * 0.5)} min`,
      difficulty: 'Custom Mix'
    }
  ]

  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [showCustomGeneration, setShowCustomGeneration] = useState(false)
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)
  const [pendingPreset, setPendingPreset] = useState<any>(null)

  // Predefined difficulty levels for custom generation
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

  const handlePresetSelection = async (preset: any) => {
    setSelectedPreset(preset.id)

    if (preset.id === 'custom') {
      setShowCustomGeneration(true)
      return
    }

    // Check if we need to replace existing preset
    if (needsPresetReplacement && needsPresetReplacement(preset.id)) {
      setPendingPreset(preset)
      setShowConfirmationDialog(true)
      return
    }

    // Proceed with generation
    await executePresetGeneration(preset)
  }

  const executePresetGeneration = async (preset: any) => {
    try {
      // Use the preset-based generation method
      if (onGenerateFromPreset) {
        await onGenerateFromPreset(preset.distribution, { id: preset.id, name: preset.name })
        console.log('Questions generated successfully for preset:', preset.name)
      } else {
        console.error('onGenerateFromPreset not available')
        toast.error('Unable to generate questions. Please try refreshing the page.')
      }
    } catch (error) {
      console.error('Failed to generate questions for preset:', error)
    }
  }

  const handleConfirmReplacement = async () => {
    setShowConfirmationDialog(false)
    if (pendingPreset) {
      await executePresetGeneration(pendingPreset)
      setPendingPreset(null)
    }
  }

  const handleCancelReplacement = () => {
    setShowConfirmationDialog(false)
    setPendingPreset(null)
    setSelectedPreset(null)
  }

  const handleCustomGenerateQuestions = async (difficulty: 'easy' | 'medium' | 'hard') => {
    if (onGenerateQuestions) {
      await onGenerateQuestions(difficulty)
    }
  }

  const handleCustomGenerateAll = async () => {
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

  const handleStartWithCustom = () => {
    if (onStartQuiz && totalGenerated > 0) {
      onStartQuiz(shareTokens)
    } else if (totalGenerated > 0) {
      const customPreset: QuestionPreset = {
        id: 'custom-generated',
        name: 'Custom Generated Questions',
        description: 'Manually generated questions',
        icon: RefreshCw,
        distribution: generatedCounts,
        totalQuestions: totalGenerated
      }
      onPresetSelect(customPreset)
    }
  }

  if (showCustomGeneration) {
    return (
      <div className="space-y-8">
        {/* Custom Generation Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setShowCustomGeneration(false)
              setSelectedPreset(null)
            }}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Presets
          </button>

          <div className="flex items-center gap-3">
            {totalGenerated > 0 && (
              <div className="text-center">
                <div className="text-lg font-bold text-indigo-600">{totalGenerated}</div>
                <div className="text-xs text-gray-500">generated</div>
              </div>
            )}
          </div>

          <Button
            onClick={handleCustomGenerateAll}
            disabled={generatingState.all}
            className="rounded-lg bg-indigo-600 px-8 py-4 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {generatingState.all ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Generating All...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate All Questions
              </>
            )}
          </Button>
        </div>

        {/* Difficulty Level Cards for Custom Generation */}
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
                    <div className="flex flex-col items-center space-y-2">
                      <div className={`rounded-full p-3 ${level.bgColor} border ${level.borderColor}`}>
                        <IconComponent className={`h-6 w-6 ${level.textColor}`} />
                      </div>
                      <h3 className={`text-xl font-bold ${level.textColor}`}>{level.name}</h3>
                      <p className="text-sm text-gray-600">{level.description}</p>
                    </div>

                    <div className="py-3">
                      <div className={`text-2xl font-bold ${level.textColor}`}>{questionCount}</div>
                      <div className="text-xs text-gray-500">questions generated</div>
                    </div>

                    <Button
                      onClick={() => handleCustomGenerateQuestions(level.id as 'easy' | 'medium' | 'hard')}
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
                          Generate {level.name} (5-8 questions)
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Start Quiz Section for Custom */}
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
                onClick={handleStartWithCustom}
                className="rounded-lg bg-green-600 px-12 py-4 font-semibold text-white hover:bg-green-700"
              >
                Start Quiz with Custom Questions
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Confirmation Dialog */}
      {showConfirmationDialog && currentPreset && pendingPreset && (
        <PresetConfirmationDialog
          isOpen={showConfirmationDialog}
          currentPreset={currentPreset}
          newPreset={pendingPreset}
          onConfirm={handleConfirmReplacement}
          onCancel={handleCancelReplacement}
        />
      )}

      {/* Header Section */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Group
        </button>

        <div className="text-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Choose Quiz Preset
          </h1>
          <p className="text-sm text-gray-600 mt-1">Select an intelligent preset for your group session</p>
          {/* Show current preset status */}
          {currentPreset && (
            <div className="mt-4">
              <div className="inline-flex flex-col items-center gap-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-4 py-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-blue-700">
                  <Target className="h-4 w-4" />
                  Current Preset: {currentPreset.name}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Easy: {currentPreset.distribution.easy}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    Medium: {currentPreset.distribution.medium}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    Hard: {currentPreset.distribution.hard}
                  </span>
                  <span className="font-medium text-blue-600">
                    Total: {currentPreset.distribution.easy + currentPreset.distribution.medium + currentPreset.distribution.hard}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Generated {Math.floor((Date.now() - currentPreset.createdAt.getTime()) / (1000 * 60))}m ago
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-24" /> {/* Spacer for alignment */}
      </div>

      {/* Intelligent Presets Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {intelligentPresets.map((preset) => {
          const IconComponent = preset.icon
          const isSelected = selectedPreset === preset.id || currentPreset?.id === preset.id
          const isGenerating = generatingState.all || generatingState.easy || generatingState.medium || generatingState.hard

          return (
            <Card
              key={preset.id}
              className={`border-2 transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                isSelected
                  ? `${preset.borderColor} bg-gradient-to-br ${preset.bgGradient} shadow-lg scale-105`
                  : `border-gray-200 bg-white ${preset.hoverBg} hover:shadow-md`
              }`}
              onClick={() => !isGenerating && handlePresetSelection(preset)}
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header with badge */}
                  <div className="flex items-center justify-between">
                    <div className={`rounded-full px-3 py-1 text-xs font-medium bg-gradient-to-r ${preset.bgGradient} ${preset.textColor}`}>
                      {preset.badge}
                    </div>
                    <div className={`rounded-full p-2 bg-gradient-to-r ${preset.bgGradient}`}>
                      <IconComponent className={`h-5 w-5 ${preset.textColor}`} />
                    </div>
                  </div>

                  {/* Title and Description */}
                  <div className="text-center">
                    <h3 className={`text-lg font-bold ${preset.textColor}`}>{preset.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
                  </div>

                  {/* Distribution Preview */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Question Mix</div>
                    <div className="flex justify-between items-center">
                      <div className="text-center">
                        <div className="text-sm font-bold text-green-600">{preset.distribution.easy}</div>
                        <div className="text-xs text-gray-500">Easy</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-yellow-600">{preset.distribution.medium}</div>
                        <div className="text-xs text-gray-500">Medium</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-red-600">{preset.distribution.hard}</div>
                        <div className="text-xs text-gray-500">Hard</div>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <div className="text-center">
                      <div className={`text-lg font-bold ${preset.textColor}`}>{preset.totalQuestions}</div>
                      <div className="text-xs text-gray-500">questions</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${preset.textColor}`}>{preset.estimatedTime}</div>
                      <div className="text-xs text-gray-500">estimated</div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    className={`w-full ${
                      isSelected
                        ? `bg-gradient-to-r from-indigo-600 to-purple-600 text-white`
                        : `bg-gradient-to-r ${preset.bgGradient} ${preset.textColor} border ${preset.borderColor}`
                    } disabled:opacity-50`}
                    disabled={isGenerating}
                    variant={isSelected ? 'default' : 'outline'}
                  >
                    {isGenerating ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        {preset.id === 'custom' ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Custom Generate
                          </>
                        ) : currentPreset?.id === preset.id ? (
                          <>
                            <Target className="mr-2 h-4 w-4" />
                            Current Preset
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Select & Generate
                          </>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Start Quiz Section - Show after generation */}
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
                if (onStartQuiz) {
                  onStartQuiz(shareTokens)
                } else {
                  console.error('onStartQuiz not available')
                  toast.error('Unable to start quiz. Please try refreshing the page.')
                }
              }}
              className="rounded-lg bg-green-600 px-12 py-4 font-semibold text-white hover:bg-green-700"
            >
              Start Quiz with Generated Questions
            </Button>
          </div>
        </div>
      )}

      {/* Preset Info Footer */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-blue-700">
            <Trophy className="h-5 w-5" />
            <span className="font-medium">Intelligent Preset System</span>
          </div>
          <p className="text-sm text-blue-600">
            Each preset generates 5-8 questions per difficulty level to ensure quality and optimal
            learning experience. Choose based on your group's skill level and available time.
          </p>
        </div>
      </div>
    </div>
  )
}
