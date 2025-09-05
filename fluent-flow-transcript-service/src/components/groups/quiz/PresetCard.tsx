'use client'

import { LoaderCircle, LucideIcon } from 'lucide-react'
import { Card, CardContent } from '../../ui/card'
import { Button } from '../../ui/button'

interface PresetCardProps {
  preset: {
    id: string
    name: string
    description: string
    badge: string
    icon: LucideIcon
    distribution: { easy: number; medium: number; hard: number }
    totalQuestions: number
    estimatedTime: string
    textColor: string
    borderColor: string
    bgGradient: string
    hoverBg: string
  }
  isSelected: boolean
  isGenerating: boolean
  onClick: () => void
}

export function PresetCard({ preset, isSelected, isGenerating, onClick }: PresetCardProps) {
  const IconComponent = preset.icon

  return (
    <Card
      className={`transform cursor-pointer border-2 transition-all duration-300 hover:scale-105 ${
        isSelected
          ? `${preset.borderColor} bg-gradient-to-br ${preset.bgGradient} scale-105 shadow-lg`
          : `border-gray-200 bg-white ${preset.hoverBg} hover:shadow-md`
      }`}
      onClick={() => !isGenerating && onClick()}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header with badge */}
          <div className="flex items-center justify-between">
            <div
              className={`rounded-full bg-gradient-to-r px-3 py-1 text-xs font-medium ${preset.bgGradient} ${preset.textColor}`}
            >
              {preset.badge}
            </div>
            <div className={`rounded-full bg-gradient-to-r p-2 ${preset.bgGradient}`}>
              <IconComponent className={`h-5 w-5 ${preset.textColor}`} />
            </div>
          </div>

          {/* Title and Description */}
          <div className="text-center">
            <h3 className={`text-lg font-bold ${preset.textColor}`}>{preset.name}</h3>
            <p className="mt-1 text-sm text-gray-600">{preset.description}</p>
          </div>

          {/* Distribution Preview */}
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Question Mix
            </div>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="text-sm font-bold text-green-600">
                  {preset.distribution.easy}
                </div>
                <div className="text-xs text-gray-500">Easy</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-yellow-600">
                  {preset.distribution.medium}
                </div>
                <div className="text-xs text-gray-500">Medium</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-red-600">
                  {preset.distribution.hard}
                </div>
                <div className="text-xs text-gray-500">Hard</div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between border-t border-gray-200 pt-2">
            <div className="text-center">
              <div className={`text-lg font-bold ${preset.textColor}`}>
                {preset.totalQuestions}
              </div>
              <div className="text-xs text-gray-500">questions</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${preset.textColor}`}>
                {preset.estimatedTime}
              </div>
              <div className="text-xs text-gray-500">estimated</div>
            </div>
          </div>

          {/* Action Button */}
          <Button
            className={`w-full ${
              isSelected
                ? `bg-gradient-to-r ${preset.bgGradient} text-white`
                : `${preset.textColor} bg-white border ${preset.borderColor}`
            } transition-all duration-200 hover:scale-105`}
            disabled={isGenerating}
            variant={isSelected ? 'default' : 'outline'}
          >
            {isGenerating ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : isSelected ? (
              <>Current Preset</>
            ) : (
              <>Select & Generate</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}