'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Brain, Target, Trophy, Zap } from 'lucide-react'
import type { QuestionPreset } from '../../../../../../components/questions/PresetSelector'
import { Badge } from '../../../../../../components/ui/badge'
import { Button } from '../../../../../../components/ui/button'
import { Card, CardContent } from '../../../../../../components/ui/card'

interface GroupPresetSelectionViewProps {
  questionSet: any
  onPresetSelect: (preset: QuestionPreset) => void
  getAvailableQuestionCounts: (questions: any[]) => { easy: number; medium: number; hard: number }
  participants: Array<{ user_id: string; user_email: string; is_online: boolean }>
  onlineParticipants: Array<{ user_id: string; user_email: string; is_online: boolean }>
}

export function GroupPresetSelectionView({
  questionSet,
  onPresetSelect,
  getAvailableQuestionCounts,
  participants,
  onlineParticipants
}: GroupPresetSelectionViewProps) {
  const [selectedPreset, setSelectedPreset] = useState<QuestionPreset | null>(null)

  if (!questionSet) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-800">Loading question set...</h3>
        </div>
      </div>
    )
  }

  const availableCounts = getAvailableQuestionCounts(questionSet.questions || [])

  // Predefined presets optimized for group learning
  const groupPresets: QuestionPreset[] = [
    {
      id: 'quick-start',
      name: 'Quick Start',
      description: 'Perfect for getting everyone warmed up',
      icon: Zap,
      distribution: { easy: 3, medium: 2, hard: 0 },
      totalQuestions: 5
    },
    {
      id: 'balanced',
      name: 'Balanced Challenge',
      description: 'Good mix for group learning',
      icon: Target,
      distribution: { easy: 3, medium: 4, hard: 3 },
      totalQuestions: 10
    },
    {
      id: 'comprehensive',
      name: 'Comprehensive Practice',
      description: 'Thorough practice session',
      icon: Brain,
      distribution: { easy: 5, medium: 7, hard: 5 },
      totalQuestions: 17
    },
    {
      id: 'intensive',
      name: 'Intensive Training',
      description: 'Challenge the whole group',
      icon: Trophy,
      distribution: { easy: 5, medium: 10, hard: 10 },
      totalQuestions: 25
    }
  ]

  const isPresetAvailable = (preset: QuestionPreset) => {
    return (
      preset.distribution.easy <= availableCounts.easy &&
      preset.distribution.medium <= availableCounts.medium &&
      preset.distribution.hard <= availableCounts.hard
    )
  }

  const handlePresetClick = (preset: QuestionPreset) => {
    setSelectedPreset(preset)
  }

  const handleStartQuiz = () => {
    if (selectedPreset) {
      onPresetSelect(selectedPreset)
    }
  }

  const handleGoBack = () => {
    if (window.confirm('Are you sure you want to leave this quiz session?')) {
      window.history.back()
    }
  }

  return (
    <div className="space-y-8">
      {/* Back Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Group
        </button>

        {/* Start Button */}
        <div className="text-center">
          <Button
            onClick={handleStartQuiz}
            disabled={!selectedPreset}
            className="rounded-lg bg-indigo-600 px-12 py-4 font-semibold text-white hover:bg-indigo-700"
          >
            {selectedPreset
              ? `Start ${selectedPreset.name} for Group`
              : 'Select a preset to continue'}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Header Section */}

      {selectedPreset && (
        <p className="mt-4 text-sm text-gray-600">
          Starting quiz with {selectedPreset.totalQuestions} questions for{' '}
          {onlineParticipants.length} online participants
        </p>
      )}

      {/* Preset Selection - Large Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {groupPresets.map(preset => {
          const available = isPresetAvailable(preset)
          const isSelected = selectedPreset?.id === preset.id

          return (
            <Card
              key={preset.id}
              className={`cursor-pointer transition-all duration-200 ${
                available
                  ? isSelected
                    ? 'scale-105 border-indigo-500 bg-indigo-50 shadow-lg'
                    : 'hover:scale-102 border-white/40 bg-white/80 hover:border-indigo-300 hover:shadow-md'
                  : 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-50'
              }`}
              onClick={() => available && handlePresetClick(preset)}
            >
              <CardContent>
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className="flex items-center">
                      <h3 className="mb-2 mr-4 text-2xl font-bold text-gray-800">{preset.name}</h3>
                      <span className="text-xs text-gray-800">
                        ≈ {Math.ceil(preset.totalQuestions * 1.5)} - {preset.totalQuestions * 2}{' '}
                        minutes
                      </span>
                    </div>
                    <p className="text-lg text-gray-600">{preset.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-indigo-600">
                      {preset.totalQuestions}
                    </div>
                    <div className="text-sm text-gray-500">questions</div>
                  </div>
                </div>

                {/* Question Distribution */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        Easy
                      </Badge>
                      <span className="font-medium">{preset.distribution.easy} questions</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {available
                        ? '✓'
                        : `Need ${preset.distribution.easy - availableCounts.easy} more`}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                        Medium
                      </Badge>
                      <span className="font-medium">{preset.distribution.medium} questions</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {available
                        ? '✓'
                        : `Need ${preset.distribution.medium - availableCounts.medium} more`}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-red-100 text-red-700">
                        Hard
                      </Badge>
                      <span className="font-medium">{preset.distribution.hard} questions</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {available
                        ? '✓'
                        : `Need ${preset.distribution.hard - availableCounts.hard} more`}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-4 text-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700">
                      <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                      Selected for group
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
