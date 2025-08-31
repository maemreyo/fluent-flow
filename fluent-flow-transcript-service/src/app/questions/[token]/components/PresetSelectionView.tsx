'use client'

import { useEffect } from 'react'
import { useWordSelection } from '../../../../lib/hooks/use-word-selection'
import { PresetSelector, QuestionPreset } from '../../../../components/questions/PresetSelector'
import { Question } from '../../../../components/questions/QuestionCard'
import { QuestionSet } from '../../../../components/questions/QuestionSetInfo'
import { VideoHeader } from './VideoHeader'
import { UserAvatar } from './UserAvatar'
import { Smile, Sparkles, Trophy, Target, Clock } from 'lucide-react'

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
  user?: any
  isAuthenticated?: boolean
  authLoading?: boolean
  onSignOut?: () => void
}

const QUESTION_PRESETS: QuestionPreset[] = [
  {
    name: 'Entry Level',
    description: 'Perfect starting point! Gentle introduction with confidence-building questions.',
    distribution: { easy: 4, medium: 3, hard: 2 },
    icon: Smile,
    color: 'emerald',
    estimatedTime: '8-12 min',
    difficulty: 'Beginner',
    badge: '🌱 Great Start'
  },
  {
    name: 'Intermediate',
    description: 'Balanced challenge for steady growth. Mix of all difficulty levels.',
    distribution: { easy: 3, medium: 3, hard: 3 },
    icon: Target,
    color: 'blue',
    estimatedTime: '12-18 min',
    difficulty: 'Intermediate',
    badge: '🎯 Balanced'
  },
  {
    name: 'Advanced',
    description: 'Push your limits! Focused on challenging questions for mastery.',
    distribution: { easy: 2, medium: 3, hard: 4 },
    icon: Trophy,
    color: 'purple',
    estimatedTime: '15-25 min',
    difficulty: 'Advanced',
    badge: '🏆 Expert'
  },
  {
    name: 'Quick Practice',
    description: 'Short but sweet! Quick session to maintain your momentum.',
    distribution: { easy: 2, medium: 2, hard: 1 },
    icon: Clock,
    color: 'orange',
    estimatedTime: '5-8 min',
    difficulty: 'Mixed',
    badge: '⚡ Quick'
  }
]

export function PresetSelectionView({
  questionSet,
  isFavorited,
  favoriteLoading,
  onFavoriteToggle,
  onPresetSelect,
  getAvailableQuestionCounts,
  user,
  isAuthenticated = false,
  authLoading = false,
  onSignOut
}: PresetSelectionViewProps) {
  const { enableSelection, disableSelection } = useWordSelection()

  // Enable word selection on mount
  useEffect(() => {
    if (questionSet) {
      enableSelection('preset-selection', 'quiz', questionSet.id)
    }
    return () => {
      disableSelection('preset-selection')
    }
  }, [questionSet?.id, enableSelection, disableSelection])

  if (!questionSet) {
    return null
  }

  return (
    <div id="preset-selection" className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-10 right-10 w-72 h-72 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-gradient-to-r from-pink-400/20 to-orange-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Standalone User Avatar */}
        <div className="flex justify-end mb-6">
          <UserAvatar 
            user={user}
            isAuthenticated={isAuthenticated}
            authLoading={authLoading}
            onSignOut={onSignOut}
          />
        </div>
        
        <VideoHeader
          questionSet={questionSet}
          isFavorited={isFavorited}
          favoriteLoading={favoriteLoading}
          onFavoriteToggle={onFavoriteToggle}
        />
        
        {/* Enhanced title section */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-full border border-white/20 shadow-lg mb-6">
            <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
            <span className="text-sm font-medium text-indigo-700">Choose Your Learning Path</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Ready for the Challenge?
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Pick your perfect quiz style and let&apos;s test your knowledge! 
            <span className="font-semibold text-indigo-600"> Each preset is crafted for different learning goals.</span>
          </p>
        </div>

        <div className="mt-16">
          <PresetSelector
            presets={QUESTION_PRESETS}
            onPresetSelect={onPresetSelect}
          />
        </div>
      </div>
    </div>
  )
}
