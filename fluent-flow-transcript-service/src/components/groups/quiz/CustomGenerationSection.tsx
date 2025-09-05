'use client'

import { LoaderCircle, LucideIcon } from 'lucide-react'
import { Card, CardContent } from '../../ui/card'
import { Button } from '../../ui/button'

interface CustomGenerationLevel {
  id: string
  name: string
  description: string
  icon: LucideIcon
  textColor: string
  borderColor: string
  bgColor: string
  hoverColor: string
}

interface CustomGenerationSectionProps {
  customLevels: CustomGenerationLevel[]
  generatedCounts: { easy: number; medium: number; hard: number }
  isGenerating: boolean
  generatingState: { easy: boolean; medium: boolean; hard: boolean; all: boolean }
  onGenerateQuestions: (difficulty: 'easy' | 'medium' | 'hard') => void
}

export function CustomGenerationSection({
  customLevels,
  generatedCounts,
  isGenerating,
  generatingState,
  onGenerateQuestions
}: CustomGenerationSectionProps) {
  return (
    <>
      {/* Custom Generation Header */}
      <div className="pt-8 border-t border-gray-200">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-gray-900">Custom Generation</h2>
          <p className="text-sm text-gray-600">Generate questions by individual difficulty levels</p>
        </div>
      </div>

      {/* Custom Generation Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {customLevels.map(level => {
          const IconComponent = level.icon
          const questionCount = generatedCounts[level.id as keyof typeof generatedCounts] || 0

          return (
            <Card
              key={level.id}
              className={`border-2 transition-all duration-200 ${level.borderColor} ${level.bgColor} ${level.hoverColor}`}
            >
              <CardContent className="p-6">
                <div className="space-y-4 text-center">
                  <div className="flex flex-col items-center space-y-2">
                    <div
                      className={`rounded-full p-3 ${level.bgColor} border ${level.borderColor}`}
                    >
                      <IconComponent className={`h-6 w-6 ${level.textColor}`} />
                    </div>
                    <h3 className={`text-xl font-bold ${level.textColor}`}>{level.name}</h3>
                    <p className="text-sm text-gray-600">{level.description}</p>
                  </div>

                  <div className="py-3">
                    <div className={`text-2xl font-bold ${level.textColor}`}>{questionCount}</div>
                    <div className="text-xs text-gray-500">questions generated</div>
                  </div>

                  <Button
                    onClick={() => onGenerateQuestions(level.id as 'easy' | 'medium' | 'hard')}
                    disabled={isGenerating || generatingState.all}
                    variant="outline"
                    className={`w-full ${level.borderColor} ${level.textColor} ${level.hoverColor} disabled:opacity-50`}
                  >
                    {isGenerating ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>Generate {level.name}</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}