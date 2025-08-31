import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'

interface QuestionPreset {
  name: string
  description: string
  distribution: {
    easy: number
    medium: number
    hard: number
  }
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
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-12 text-center">
        <div className="mb-4 inline-block rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-2 text-sm font-medium text-white">
          ✨ FluentFlow Quiz
        </div>
        <h1 className="mb-6 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-4xl font-bold text-transparent">
          Choose Your Learning Level
        </h1>
        <p className="mx-auto mb-4 max-w-2xl text-xl text-gray-600">
          Select a difficulty preset that matches your current English level
        </p>
        {/* <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 max-w-md mx-auto">
          <p className="text-sm text-blue-700 font-medium">
            📊 Available: {availableCounts.easy} Easy • {availableCounts.medium} Medium • {availableCounts.hard} Hard
          </p>
        </div> */}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {presets.map(preset => {
          const available = isPresetAvailable(preset)
          const totalQuestions = getTotalQuestions(preset)

          return (
            <Card
              key={preset.name}
              className={`relative transform cursor-pointer transition-all duration-300 hover:scale-105 ${
                available
                  ? 'border-2 border-blue-100 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-500/10'
                  : 'cursor-not-allowed border-2 border-gray-200 opacity-60 hover:scale-100'
              } ${available ? 'hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50' : ''}`}
              onClick={() => available && onPresetSelect(preset)}
            >
              <CardContent className="p-8">
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-2xl font-bold text-gray-900">{preset.name}</h3>
                <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 text-sm font-bold shadow-lg">
                  {totalQuestions} questions
                </Badge>
              </div>

              <p className="mb-6 leading-relaxed text-gray-600">{preset.description}</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-green-50 p-3 text-sm">
                  <span className="flex items-center font-medium text-green-700">
                    <span className="mr-3 h-4 w-4 rounded-full bg-gradient-to-r from-green-400 to-green-500 shadow-sm"></span>
                    Easy Questions
                  </span>
                  <span className="rounded-full bg-green-100 px-3 py-1 font-bold text-green-800">
                    {preset.distribution.easy}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-amber-50 p-3 text-sm">
                  <span className="flex items-center font-medium text-amber-700">
                    <span className="mr-3 h-4 w-4 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 shadow-sm"></span>
                    Medium Questions
                  </span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-800">
                    {preset.distribution.medium}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-red-50 p-3 text-sm">
                  <span className="flex items-center font-medium text-red-700">
                    <span className="mr-3 h-4 w-4 rounded-full bg-gradient-to-r from-red-400 to-red-500 shadow-sm"></span>
                    Hard Questions
                  </span>
                  <span className="rounded-full bg-red-100 px-3 py-1 font-bold text-red-800">
                    {preset.distribution.hard}
                  </span>
                </div>
              </div>

              {!available && (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                  ❌ Not enough questions available for this preset
                </div>
              )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-12 text-center">
        <div className="mx-auto max-w-2xl rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
          <p className="font-medium text-blue-700">
            💡 Don&apos;t worry! You can always try different presets with different question sets
          </p>
        </div>
      </div>
    </div>
  )
}

export type { QuestionPreset }
