import { Frown, LucideIcon, Meh, Smile, XCircle, Star, Clock, Sparkles } from 'lucide-react'
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
  color?: string
  estimatedTime?: string
  difficulty?: string
  badge?: string
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

  const getColorClasses = (color: string, available: boolean) => {
    if (!available) return {
      bg: 'bg-gray-100',
      border: 'border-gray-200',
      text: 'text-gray-500',
      icon: 'bg-gray-200 text-gray-500',
      badge: 'bg-gray-200 text-gray-600'
    }

    const colors = {
      emerald: {
        bg: 'bg-white/80 backdrop-blur-sm',
        border: 'border-emerald-200 hover:border-emerald-400',
        text: 'text-emerald-600',
        icon: 'bg-emerald-100 text-emerald-600',
        badge: 'bg-emerald-50 text-emerald-700'
      },
      blue: {
        bg: 'bg-white/80 backdrop-blur-sm', 
        border: 'border-blue-200 hover:border-blue-400',
        text: 'text-blue-600',
        icon: 'bg-blue-100 text-blue-600',
        badge: 'bg-blue-50 text-blue-700'
      },
      purple: {
        bg: 'bg-white/80 backdrop-blur-sm',
        border: 'border-purple-200 hover:border-purple-400', 
        text: 'text-purple-600',
        icon: 'bg-purple-100 text-purple-600',
        badge: 'bg-purple-50 text-purple-700'
      },
      orange: {
        bg: 'bg-white/80 backdrop-blur-sm',
        border: 'border-orange-200 hover:border-orange-400',
        text: 'text-orange-600', 
        icon: 'bg-orange-100 text-orange-600',
        badge: 'bg-orange-50 text-orange-700'
      }
    }
    
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {presets.map((preset, index) => {
          const available = isPresetAvailable(preset)
          const totalQuestions = getTotalQuestions(preset)
          const Icon = preset.icon
          const colorClasses = getColorClasses(preset.color || 'blue', available)

          return (
            <div
              key={preset.name}
              className={`group relative transform transition-all duration-500 hover:scale-105 ${available ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => available && onPresetSelect(preset)}
            >
              {/* Glow effect on hover */}
              <div className={`absolute -inset-0.5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                available ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 blur-sm' : ''
              }`}></div>
              
              <Card className={`relative rounded-3xl border-2 transition-all duration-300 ${colorClasses.bg} ${colorClasses.border} ${
                available 
                  ? 'shadow-xl hover:shadow-2xl transform hover:-translate-y-1' 
                  : 'opacity-60 shadow-sm'
              }`}>
                <CardContent className="p-8">
                  {/* Badge */}
                  {preset.badge && (
                    <div className="absolute -top-3 -right-3 animate-bounce">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${colorClasses.badge} shadow-lg border border-white/50`}>
                        {preset.badge}
                      </div>
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className={`p-4 rounded-2xl ${colorClasses.icon} shadow-inner`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="text-right">
                      <Badge className={`${colorClasses.badge} px-3 py-1.5 text-sm font-bold shadow-sm`}>
                        {totalQuestions} Questions
                      </Badge>
                      {preset.estimatedTime && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {preset.estimatedTime}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{preset.name}</h3>
                      {preset.difficulty && (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-700 mb-3">
                          <Star className="h-3 w-3" />
                          {preset.difficulty}
                        </div>
                      )}
                      <p className="text-sm text-gray-600 leading-relaxed">{preset.description}</p>
                    </div>

                    {/* Progress bars for difficulty distribution */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center text-sm font-medium text-emerald-600">
                          <Smile className="mr-2 h-4 w-4" />
                          Easy
                        </span>
                        <span className="font-bold text-gray-800">{preset.distribution.easy}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-700 delay-300"
                          style={{ width: `${(preset.distribution.easy / totalQuestions) * 100}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center text-sm font-medium text-amber-600">
                          <Meh className="mr-2 h-4 w-4" />
                          Medium
                        </span>
                        <span className="font-bold text-gray-800">{preset.distribution.medium}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-amber-500 h-2 rounded-full transition-all duration-700 delay-500"
                          style={{ width: `${(preset.distribution.medium / totalQuestions) * 100}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center text-sm font-medium text-red-600">
                          <Frown className="mr-2 h-4 w-4" />
                          Hard
                        </span>
                        <span className="font-bold text-gray-800">{preset.distribution.hard}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full transition-all duration-700 delay-700"
                          style={{ width: `${(preset.distribution.hard / totalQuestions) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Call to action */}
                    {available ? (
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className={`inline-flex items-center gap-2 text-sm font-medium ${colorClasses.text} group-hover:animate-pulse`}>
                          <Sparkles className="h-4 w-4" />
                          Click to start!
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex items-center text-xs text-red-600 bg-red-50 p-3 rounded-lg">
                          <XCircle className="mr-2 h-4 w-4" />
                          Not enough questions available for this preset
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>

      {/* Stats summary */}
      <div className="mt-16 text-center">
        <div className="inline-flex items-center gap-4 px-6 py-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
            <Smile className="h-4 w-4" />
            <span className="font-bold">{availableCounts.easy}</span> Easy
          </div>
          <div className="w-px h-4 bg-gray-300"></div>
          <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
            <Meh className="h-4 w-4" />
            <span className="font-bold">{availableCounts.medium}</span> Medium  
          </div>
          <div className="w-px h-4 bg-gray-300"></div>
          <div className="flex items-center gap-2 text-sm font-medium text-red-600">
            <Frown className="h-4 w-4" />
            <span className="font-bold">{availableCounts.hard}</span> Hard
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-3">Available questions in this topic</p>
      </div>
    </div>
  )
}

export type { QuestionPreset }
