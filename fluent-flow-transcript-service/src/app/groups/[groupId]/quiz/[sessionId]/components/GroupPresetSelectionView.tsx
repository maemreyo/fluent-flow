'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Brain,
  Lightbulb,
  Sparkles,
  Target,
  Trophy,
  Zap,
  Headphones,
  Search,
  Music,
  BookOpen,
  MessageSquare
} from 'lucide-react'
import { toast } from 'sonner'
import { useCustomPromptPresets } from '@/hooks/use-custom-prompts'
import { PresetConfirmationDialog } from '../../../../../../components/groups/quiz/PresetConfirmationDialog'
import { PresetSelectionHeader } from '../../../../../../components/groups/quiz/PresetSelectionHeader'
import { PresetCard } from '../../../../../../components/groups/quiz/PresetCard'
import { CustomGenerationSection } from '../../../../../../components/groups/quiz/CustomGenerationSection'
import { StartQuizSection } from '../../../../../../components/groups/quiz/StartQuizSection'
import type { QuestionPreset } from '../../../../../../components/questions/PresetSelector'

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
  const router = useRouter()
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)
  const [pendingPreset, setPendingPreset] = useState<{
    id: string
    name: string
    distribution: { easy: number; medium: number; hard: number }
  } | null>(null)

  // Load custom prompts
  const { customPresets, isLoading: customPromptsLoading } = useCustomPromptPresets()

  // Intelligent presets configuration
  const intelligentPresets = [
    {
      id: 'beginner-friendly',
      name: 'Beginner Friendly',
      description: 'Perfect for newcomers to the subject',
      badge: 'Beginner',
      icon: Lightbulb,
      distribution: { easy: 8, medium: 3, hard: 1 },
      totalQuestions: 12,
      estimatedTime: '6 min',
      textColor: 'text-green-700',
      borderColor: 'border-green-300',
      bgGradient: 'from-green-100 to-emerald-100',
      hoverBg: 'hover:bg-green-50'
    },
    {
      id: 'balanced-learning',
      name: 'Balanced Learning',
      description: 'Equal mix for comprehensive understanding',
      badge: 'Balanced',
      icon: Target,
      distribution: { easy: 5, medium: 6, hard: 5 },
      totalQuestions: 16,
      estimatedTime: '8 min',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-300',
      bgGradient: 'from-blue-100 to-cyan-100',
      hoverBg: 'hover:bg-blue-50'
    },
    {
      id: 'challenge-mode',
      name: 'Challenge Mode',
      description: 'Intensive practice for advanced learners',
      badge: 'Advanced',
      icon: Trophy,
      distribution: { easy: 2, medium: 5, hard: 7 },
      totalQuestions: 14,
      estimatedTime: '8 min',
      textColor: 'text-purple-700',
      borderColor: 'border-purple-300',
      bgGradient: 'from-purple-100 to-violet-100',
      hoverBg: 'hover:bg-purple-50'
    },
    {
      id: 'quick-review',
      name: 'Quick Review',
      description: 'Short focused session for busy schedules',
      badge: 'Quick',
      icon: Zap,
      distribution: { easy: 3, medium: 4, hard: 2 },
      totalQuestions: 9,
      estimatedTime: '4 min',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-300',
      bgGradient: 'from-orange-100 to-amber-100',
      hoverBg: 'hover:bg-orange-50'
    },
    {
      id: 'comprehensive',
      name: 'Comprehensive',
      description: 'Thorough coverage of all difficulty levels',
      badge: 'Complete',
      icon: Brain,
      distribution: { easy: 6, medium: 8, hard: 6 },
      totalQuestions: 20,
      estimatedTime: '10 min',
      textColor: 'text-indigo-700',
      borderColor: 'border-indigo-300',
      bgGradient: 'from-indigo-100 to-blue-100',
      hoverBg: 'hover:bg-indigo-50'
    },
    {
      id: 'custom',
      name: 'Custom Generation',
      description: 'Generate questions manually by difficulty',
      badge: 'Custom',
      icon: Sparkles,
      distribution: { easy: 0, medium: 0, hard: 0 },
      totalQuestions: 24,
      estimatedTime: '12 min',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-300',
      bgGradient: 'from-gray-100 to-slate-100',
      hoverBg: 'hover:bg-gray-50'
    }
  ]

  // Custom generation levels
  const customLevels = [
    {
      id: 'easy',
      name: 'Easy Questions',
      description: 'Basic comprehension and recall',
      icon: Lightbulb,
      textColor: 'text-green-700',
      borderColor: 'border-green-300',
      bgColor: 'bg-green-50',
      hoverColor: 'hover:bg-green-100'
    },
    {
      id: 'medium',
      name: 'Medium Questions',
      description: 'Application and analysis',
      icon: Target,
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-300',
      bgColor: 'bg-yellow-50',
      hoverColor: 'hover:bg-yellow-100'
    },
    {
      id: 'hard',
      name: 'Hard Questions',
      description: 'Critical thinking and synthesis',
      icon: Trophy,
      textColor: 'text-red-700',
      borderColor: 'border-red-300',
      bgColor: 'bg-red-50',
      hoverColor: 'hover:bg-red-100'
    }
  ]

  // Combine standard and custom presets
  const allPresets = [...intelligentPresets, ...customPresets]
  
  const totalGenerated = Object.values(generatedCounts).reduce((sum, count) => sum + count, 0)
  const isGenerating = generatingState.easy || generatingState.medium || generatingState.hard || generatingState.all

  const handleGoBack = () => {
    router.back()
  }

  const handlePresetSelection = async (preset: any) => {
    if (preset.id === 'custom') {
      setSelectedPreset(preset.id)
      return
    }

    if (needsPresetReplacement && needsPresetReplacement(preset.id)) {
      setPendingPreset(preset)
      setShowConfirmationDialog(true)
      return
    }

    await generateFromPreset(preset)
  }

  const generateFromPreset = async (preset: any) => {
    if (!onGenerateFromPreset) {
      toast.error('Generation not available')
      return
    }

    try {
      setSelectedPreset(preset.id)
      
      // Pass additional info for custom prompts
      const presetInfo = { 
        id: preset.id, 
        name: preset.name,
        isCustom: preset.isCustom || false,
        systemPrompt: preset.system_prompt,
        userTemplate: preset.user_template,
        config: preset.config
      }
      
      await onGenerateFromPreset(preset.distribution, presetInfo)
      toast.success(`Generated ${preset.totalQuestions} questions from ${preset.name}!`)
    } catch (error) {
      console.error('Failed to generate from preset:', error)
      toast.error('Failed to generate questions from preset')
      setSelectedPreset(null)
    }
  }

  const handleConfirmPresetReplacement = async () => {
    if (pendingPreset) {
      await generateFromPreset(pendingPreset)
      setPendingPreset(null)
    }
    setShowConfirmationDialog(false)
  }

  const handleCancelPresetReplacement = () => {
    setPendingPreset(null)
    setShowConfirmationDialog(false)
  }

  const handleCustomGenerateQuestions = async (difficulty: 'easy' | 'medium' | 'hard') => {
    if (!onGenerateQuestions) {
      toast.error('Generation not available')
      return
    }

    try {
      await onGenerateQuestions(difficulty)
    } catch (error) {
      console.error(`Failed to generate ${difficulty} questions:`, error)
      toast.error(`Failed to generate ${difficulty} questions`)
    }
  }

  return (
    <div className="space-y-8">
      {/* Confirmation Dialog */}
      {showConfirmationDialog && currentPreset && pendingPreset && (
        <PresetConfirmationDialog
          isOpen={showConfirmationDialog}
          currentPreset={currentPreset}
          newPreset={pendingPreset}
          onConfirm={handleConfirmPresetReplacement}
          onCancel={handleCancelPresetReplacement}
        />
      )}

      {/* Header */}
      <PresetSelectionHeader onGoBack={handleGoBack} currentPreset={currentPreset} />

      {/* Presets Grid */}
      {customPromptsLoading ? (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">Loading custom presets...</div>
        </div>
      ) : (
        <>
          {/* Standard Presets */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Standard Question Types</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {intelligentPresets.map(preset => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  isSelected={selectedPreset === preset.id || currentPreset?.id === preset.id}
                  isGenerating={isGenerating}
                  onClick={() => handlePresetSelection(preset)}
                />
              ))}
            </div>
          </div>

          {/* Custom Presets */}
          {customPresets.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Specialized Vietnamese Learning
                <span className="ml-2 text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  Custom Prompts
                </span>
              </h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {customPresets.map(preset => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    isSelected={selectedPreset === preset.id || currentPreset?.id === preset.id}
                    isGenerating={isGenerating}
                    onClick={() => handlePresetSelection(preset)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Custom Generation Section */}
      {selectedPreset === 'custom' && (
        <CustomGenerationSection
          customLevels={customLevels}
          generatedCounts={generatedCounts}
          isGenerating={isGenerating}
          generatingState={generatingState}
          onGenerateQuestions={handleCustomGenerateQuestions}
        />
      )}

      {/* Start Quiz Section */}
      <StartQuizSection
        totalGenerated={totalGenerated}
        shareTokens={shareTokens}
        onStartQuiz={onStartQuiz}
      />
    </div>
  )
}