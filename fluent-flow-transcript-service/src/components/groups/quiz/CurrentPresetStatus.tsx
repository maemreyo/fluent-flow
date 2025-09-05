'use client'

import { CheckCircle, Target } from 'lucide-react'
import { Alert, AlertDescription } from '../../ui/alert'
import { Badge } from '../../ui/badge'
import { Separator } from '../../ui/separator'

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

  const totalQuestions =
    currentPreset.distribution.easy +
    currentPreset.distribution.medium +
    currentPreset.distribution.hard
  const minutesAgo = Math.floor((Date.now() - currentPreset.createdAt.getTime()) / (1000 * 60))

  return (
    <Alert className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CheckCircle className="h-4 w-4 text-blue-600" />
      <AlertDescription className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-700">Current Active Preset</span>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            {currentPreset.name}
          </Badge>
        </div>

        <Separator className="bg-blue-200" />

        {/* Question Distribution */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-700">Distribution:</span>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="border-green-200 bg-green-50 text-xs text-green-700"
            >
              Easy: {currentPreset.distribution.easy}
            </Badge>
            <Badge
              variant="outline"
              className="border-yellow-200 bg-yellow-50 text-xs text-yellow-700"
            >
              Medium: {currentPreset.distribution.medium}
            </Badge>
            <Badge variant="outline" className="border-red-200 bg-red-50 text-xs text-red-700">
              Hard: {currentPreset.distribution.hard}
            </Badge>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}
