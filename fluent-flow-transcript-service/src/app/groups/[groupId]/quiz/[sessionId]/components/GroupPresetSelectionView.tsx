'use client'

import { useState } from 'react'
import { Button } from '../../../../../../components/ui/button'
import { Card, CardContent } from '../../../../../../components/ui/card'
import { Badge } from '../../../../../../components/ui/badge'
import { Zap, Target, Brain, Trophy } from 'lucide-react'
import type { QuestionPreset } from '../../../../../../components/questions/PresetSelector'

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
      <div className="flex items-center justify-center h-64">
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
    return preset.distribution.easy <= availableCounts.easy &&
           preset.distribution.medium <= availableCounts.medium &&
           preset.distribution.hard <= availableCounts.hard
  }

  const handlePresetClick = (preset: QuestionPreset) => {
    setSelectedPreset(preset)
  }

  const handleStartQuiz = () => {
    if (selectedPreset) {
      onPresetSelect(selectedPreset)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Choose Quiz Settings for Your Group
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Select a preset that works best for your {participants.length} participants
        </p>
        
        {/* Available Questions Summary */}
        <div className="bg-white/60 rounded-xl p-6 border border-white/40 max-w-2xl mx-auto">
          <h3 className="font-semibold text-gray-800 mb-4">Available Questions</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{availableCounts.easy}</div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">Easy</Badge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{availableCounts.medium}</div>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Medium</Badge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{availableCounts.hard}</div>
              <Badge variant="secondary" className="bg-red-100 text-red-700">Hard</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Group Status */}
      <div className="bg-white/60 rounded-xl p-6 border border-white/40">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Group Ready Status</h3>
          <div className="text-sm text-gray-600">
            {onlineParticipants.length} of {participants.length} online
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {onlineParticipants.map((participant) => (
            <div key={participant.user_id} className="flex items-center gap-2 bg-white/60 rounded-full px-4 py-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {(participant.user_email || 'U')[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {participant.user_email?.split('@')[0] || 'User'}
              </span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Preset Selection - Large Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groupPresets.map((preset) => {
          const available = isPresetAvailable(preset)
          const isSelected = selectedPreset?.id === preset.id

          return (
            <Card 
              key={preset.id}
              className={`cursor-pointer transition-all duration-200 ${
                available 
                  ? isSelected
                    ? 'border-indigo-500 bg-indigo-50 shadow-lg scale-105'
                    : 'border-white/40 bg-white/80 hover:border-indigo-300 hover:shadow-md hover:scale-102'
                  : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
              }`}
              onClick={() => available && handlePresetClick(preset)}
            >
              <CardContent className="p-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{preset.name}</h3>
                    <p className="text-gray-600 text-lg">{preset.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-indigo-600">{preset.totalQuestions}</div>
                    <div className="text-sm text-gray-500">questions</div>
                  </div>
                </div>

                {/* Question Distribution */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-700">Easy</Badge>
                      <span className="font-medium">{preset.distribution.easy} questions</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {available ? '✓' : `Need ${preset.distribution.easy - availableCounts.easy} more`}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Medium</Badge>
                      <span className="font-medium">{preset.distribution.medium} questions</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {available ? '✓' : `Need ${preset.distribution.medium - availableCounts.medium} more`}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-red-100 text-red-700">Hard</Badge>
                      <span className="font-medium">{preset.distribution.hard} questions</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {available ? '✓' : `Need ${preset.distribution.hard - availableCounts.hard} more`}
                    </div>
                  </div>
                </div>

                {/* Estimated Time */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Estimated time:</span>
                    <span className="font-medium text-gray-800">
                      {Math.ceil(preset.totalQuestions * 1.5)} - {preset.totalQuestions * 2} minutes
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-4 text-center">
                    <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      Selected for group
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Start Button */}
      <div className="text-center">
        <Button
          onClick={handleStartQuiz}
          disabled={!selectedPreset}
          className="px-12 py-4 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
        >
          {selectedPreset 
            ? `Start ${selectedPreset.name} for Group` 
            : 'Select a preset to continue'
          }
        </Button>
        
        {selectedPreset && (
          <p className="mt-4 text-sm text-gray-600">
            Starting quiz with {selectedPreset.totalQuestions} questions for {onlineParticipants.length} online participants
          </p>
        )}
      </div>
    </div>
  )
}