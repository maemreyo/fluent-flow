'use client'

import { LoaderCircle, LucideIcon, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Progress } from '../../ui/progress'
import { Alert, AlertDescription } from '../../ui/alert'
import { Separator } from '../../ui/separator'

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
  const totalGenerated = Object.values(generatedCounts).reduce((sum, count) => sum + count, 0)
  const maxQuestions = 24 // Maximum expected questions
  const progressPercentage = Math.min((totalGenerated / maxQuestions) * 100, 100)

  return (
    <>
      <Separator className="my-8" />
      
      {/* Custom Generation Header */}
      <Alert className="mb-6">
        <Sparkles className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <span className="font-medium">Custom Generation Mode</span>
            <p className="text-sm text-muted-foreground mt-1">Generate questions by individual difficulty levels</p>
          </div>
          <Badge variant="secondary" className="ml-4">
            {totalGenerated} questions
          </Badge>
        </AlertDescription>
      </Alert>

      {/* Progress Overview */}
      {totalGenerated > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Generation Progress</span>
                <span>{totalGenerated}/{maxQuestions} questions</span>
              </div>
              <Progress value={progressPercentage} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Generation Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {customLevels.map(level => {
          const IconComponent = level.icon
          const questionCount = generatedCounts[level.id as keyof typeof generatedCounts] || 0
          const isGeneratingThis = generatingState[level.id as keyof typeof generatingState]

          return (
            <Card
              key={level.id}
              className={`border-2 transition-all duration-200 hover:scale-105 ${level.borderColor} ${level.bgColor} ${level.hoverColor}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="secondary" 
                    className={`${level.textColor} text-xs`}
                  >
                    {level.id.toUpperCase()}
                  </Badge>
                  <div className={`rounded-full p-2 ${level.bgColor} border ${level.borderColor}`}>
                    <IconComponent className={`h-4 w-4 ${level.textColor}`} />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Title and Description */}
                <div className="text-center">
                  <h3 className={`text-lg font-bold ${level.textColor}`}>{level.name}</h3>
                  <p className="mt-1 text-sm text-gray-600">{level.description}</p>
                </div>

                <Separator />

                {/* Question Count Display */}
                <div className="text-center py-2">
                  <div className={`text-2xl font-bold ${level.textColor}`}>{questionCount}</div>
                  <div className="text-xs text-gray-500">questions generated</div>
                  {questionCount > 0 && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      Active
                    </Badge>
                  )}
                </div>

                {/* Action Button */}
                <Button
                  onClick={() => onGenerateQuestions(level.id as 'easy' | 'medium' | 'hard')}
                  disabled={isGenerating || generatingState.all}
                  variant="outline"
                  className={`w-full ${level.borderColor} ${level.textColor} ${level.hoverColor} transition-all duration-200 hover:scale-105 disabled:opacity-50`}
                >
                  {isGeneratingThis ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>Generate {level.name}</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}