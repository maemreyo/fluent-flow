import { Frown, LucideIcon, Meh, Smile, XCircle } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Card, CardContent } from '../ui/card'

interface QuestionPreset {
  name: string
  description: string
  distribution: {
    easy: number
    medium: number
    hard: number
  }
  icon: LucideIcon
}

interface PresetSelectorProps {
  presets: QuestionPreset[]
  onPresetSelect: (preset: QuestionPreset) => void
  availableCounts: {
    easy: number
    medium: number
    hard: number
  }
}

export function PresetSelector({ presets, onPresetSelect, availableCounts }: PresetSelectorProps) {
  const isPresetAvailable = (preset: QuestionPreset): boolean => {
    return (
      availableCounts.easy >= preset.distribution.easy &&
      availableCounts.medium >= preset.distribution.medium &&
      availableCounts.hard >= preset.distribution.hard
    )
  }

  const getTotalQuestions = (preset: QuestionPreset): number => {
    return preset.distribution.easy + preset.distribution.medium + preset.distribution.hard
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Choose Your Quiz
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-gray-600 sm:mt-4">
          Select a preset that matches your learning goals.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {presets.map(preset => {
          const available = isPresetAvailable(preset)
          const totalQuestions = getTotalQuestions(preset)
          const Icon = preset.icon

          return (
            <Card
              key={preset.name}
              className={`flex flex-col rounded-2xl border-2 transition-all duration-300 ${
                available
                  ? 'cursor-pointer border-gray-200 bg-white shadow-sm hover:border-blue-500 hover:shadow-lg'
                  : 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-70'
              }`}
              onClick={() => available && onPresetSelect(preset)}
            >
              <CardContent className="flex flex-1 flex-col p-6">
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div
                      className={`rounded-full p-2 ${available ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}
                    >
                      <Icon className="h-7 w-7" />
                    </div>
                    <Badge
                      className={`${available ? 'bg-blue-50 text-blue-700' : 'bg-gray-200 text-gray-600'} px-3 py-1 text-sm font-semibold`}
                    >
                      {totalQuestions} Qs
                    </Badge>
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-gray-900">{preset.name}</h3>
                  <p className="mt-2 text-sm text-gray-600">{preset.description}</p>
                </div>

                <div className="mt-6 space-y-3 border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center font-medium text-green-600">
                      <Smile className="mr-2 h-5 w-5" />
                      Easy
                    </span>
                    <span className="font-bold text-gray-800">{preset.distribution.easy}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center font-medium text-amber-600">
                      <Meh className="mr-2 h-5 w-5" />
                      Medium
                    </span>
                    <span className="font-bold text-gray-800">{preset.distribution.medium}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center font-medium text-red-600">
                      <Frown className="mr-2 h-5 w-5" />
                      Hard
                    </span>
                    <span className="font-bold text-gray-800">{preset.distribution.hard}</span>
                  </div>
                </div>

                {!available && (
                  <div className="mt-4 flex items-center text-xs text-red-600">
                    <XCircle className="mr-1.5 h-4 w-4" />
                    Not enough questions available.
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* <div className="mt-12 text-center">
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-center">
            <CheckCircle2 className="mr-3 h-6 w-6 text-green-500" />
            <p className="font-medium text-gray-700">
              Available Questions: 
              <span className="font-bold text-green-600"> {availableCounts.easy} Easy</span> • 
              <span className="font-bold text-amber-600"> {availableCounts.medium} Medium</span> • 
              <span className="font-bold text-red-600"> {availableCounts.hard} Hard</span>
            </p>
          </div>
        </div>
      </div> */}
    </div>
  )
}

export type { QuestionPreset }
