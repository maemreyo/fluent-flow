'use client'

import { Target } from 'lucide-react'

interface CurrentPresetStatusProps {
  currentPreset: {
    id: string
    name: string
    distribution: { easy: number; medium: number; hard: number }
    createdAt: Date
  } | null
}

export function CurrentPresetStatus({ currentPreset }: CurrentPresetStatusProps) {
  if (!currentPreset) return null

  return (
    <div className="mt-4">
      <div className="inline-flex flex-col items-center gap-2 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 text-sm">
        <div className="flex items-center gap-2 font-medium text-blue-700">
          <Target className="h-4 w-4" />
          Current Preset: {currentPreset.name}
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            Easy: {currentPreset.distribution.easy}
          </span>
          <span className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
            Medium: {currentPreset.distribution.medium}
          </span>
          <span className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-red-500"></div>
            Hard: {currentPreset.distribution.hard}
          </span>
          <span className="font-medium text-blue-600">
            Total:{' '}
            {currentPreset.distribution.easy +
              currentPreset.distribution.medium +
              currentPreset.distribution.hard}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          Generated{' '}
          {Math.floor((Date.now() - currentPreset.createdAt.getTime()) / (1000 * 60))}m ago
        </div>
      </div>
    </div>
  )
}