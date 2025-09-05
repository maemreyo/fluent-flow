'use client'

import { Target, Clock, CheckCircle } from 'lucide-react'
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

  const totalQuestions = currentPreset.distribution.easy + 
                        currentPreset.distribution.medium + 
                        currentPreset.distribution.hard
  const minutesAgo = Math.floor((Date.now() - currentPreset.createdAt.getTime()) / (1000 * 60))
  
  return (
    <Alert className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CheckCircle className="h-4 w-4 text-blue-600" />
      <AlertDescription className="space-y-3">
        <div className="flex items-center justify-between">
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
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Distribution:</span>
          <div className="flex items-center gap-3">
            <Badge 
              variant="outline" 
              className="bg-green-50 border-green-200 text-green-700 text-xs"
            >
              Easy: {currentPreset.distribution.easy}
            </Badge>
            <Badge 
              variant="outline" 
              className="bg-yellow-50 border-yellow-200 text-yellow-700 text-xs"
            >
              Medium: {currentPreset.distribution.medium}
            </Badge>
            <Badge 
              variant="outline" 
              className="bg-red-50 border-red-200 text-red-700 text-xs"
            >
              Hard: {currentPreset.distribution.hard}
            </Badge>
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-3 w-3" />
            <span>Generated {minutesAgo}m ago</span>
          </div>
          <Badge className="bg-blue-600 hover:bg-blue-700">
            {totalQuestions} questions total
          </Badge>
        </div>
      </AlertDescription>
    </Alert>
  )
}