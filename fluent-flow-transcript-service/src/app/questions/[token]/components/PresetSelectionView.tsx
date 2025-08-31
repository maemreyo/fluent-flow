'use client'

import { PresetSelector, QuestionPreset } from '../../../../components/questions/PresetSelector'
import { Question } from '../../../../components/questions/QuestionCard'
import { QuestionSet } from '../../../../components/questions/QuestionSetInfo'
import { VideoHeader } from './VideoHeader'
import { Smile, Meh, Frown, BrainCircuit, Zap } from 'lucide-react'

interface PresetSelectionViewProps {
  questionSet: QuestionSet | null
  isFavorited: boolean
  favoriteLoading: boolean
  onFavoriteToggle: () => void
  onPresetSelect: (preset: QuestionPreset) => void
  getAvailableQuestionCounts: (questions: Question[]) => {
    easy: number
    medium: number
    hard: number
  }
}

const QUESTION_PRESETS: QuestionPreset[] = [
  {
    name: 'Entry Level',
    description: 'Perfect for beginners - mostly easy questions with some challenge.',
    distribution: { easy: 4, medium: 3, hard: 2 },
    icon: Smile
  },
  {
    name: 'Intermediate',
    description: 'A balanced mix of question difficulties for steady improvement.',
    distribution: { easy: 3, medium: 3, hard: 3 },
    icon: Meh
  },
  {
    name: 'Advanced',
    description: 'Challenge yourself with a focus on harder questions.',
    distribution: { easy: 2, medium: 3, hard: 4 },
    icon: Frown
  },
  {
    name: 'Quick Practice',
    description: 'A short, mixed-difficulty session to keep your skills sharp.',
    distribution: { easy: 2, medium: 2, hard: 1 },
    icon: Zap
  }
]

export function PresetSelectionView({
  questionSet,
  isFavorited,
  favoriteLoading,
  onFavoriteToggle,
  onPresetSelect,
  getAvailableQuestionCounts
}: PresetSelectionViewProps) {
  if (!questionSet) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <VideoHeader
          questionSet={questionSet}
          isFavorited={isFavorited}
          favoriteLoading={favoriteLoading}
          onFavoriteToggle={onFavoriteToggle}
        />
        <div className="mt-10">
          <PresetSelector
            presets={QUESTION_PRESETS}
            onPresetSelect={onPresetSelect}
            availableCounts={getAvailableQuestionCounts(questionSet.questions)}
          />
        </div>
      </div>
    </div>
  )
}
