'use client'

import { ArrowLeft } from 'lucide-react'
import { CurrentPresetStatus } from './CurrentPresetStatus'

interface PresetSelectionHeaderProps {
  onGoBack: () => void
  currentPreset?: {
    id: string
    name: string
    distribution: { easy: number; medium: number; hard: number }
    createdAt: Date
  } | null
}

export function PresetSelectionHeader({ onGoBack, currentPreset }: PresetSelectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onGoBack}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Group
      </button>
      
      <div className="text-center">
        <h1 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-2xl font-bold text-transparent">
          Choose Quiz Preset
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Select an intelligent preset for your group session
        </p>
        <CurrentPresetStatus currentPreset={currentPreset} />
      </div>
      
      <div className="w-24" /> {/* Spacer for alignment */}
    </div>
  )
}