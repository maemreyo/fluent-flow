'use client'

import { PresetSelector, QuestionPreset } from '../../../../components/questions/PresetSelector'
import { Question } from '../../../../components/questions/QuestionCard'
import { QuestionSet } from '../../../../components/questions/QuestionSetInfo'
import { VideoHeader } from './VideoHeader'

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
    description: 'Perfect for beginners - mostly easy questions with some challenge',
    distribution: { easy: 4, medium: 3, hard: 2 }
  },
  {
    name: 'Intermediate',
    description: 'Balanced difficulty - equal mix of all levels',
    distribution: { easy: 3, medium: 3, hard: 3 }
  },
  {
    name: 'Advanced',
    description: 'For confident learners - emphasis on harder questions',
    distribution: { easy: 2, medium: 3, hard: 4 }
  },
  {
    name: 'Quick Practice',
    description: 'Short session with mixed difficulty',
    distribution: { easy: 2, medium: 2, hard: 1 }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="mx-auto max-w-5xl p-6">
        <VideoHeader
          questionSet={questionSet}
          isFavorited={isFavorited}
          favoriteLoading={favoriteLoading}
          onFavoriteToggle={onFavoriteToggle}
        />
        <div className="mt-8">
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
