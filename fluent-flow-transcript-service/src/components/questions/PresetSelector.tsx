import { Frown, LucideIcon, Meh, Smile, Star, Clock, Sparkles } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Card, CardContent } from '../ui/card'

interface QuestionPreset {
  id: string
  name: string
  description: string
  distribution: {
    easy: number
    medium: number
    hard: number
  }
  totalQuestions: number
  icon: LucideIcon
  color?: string
  estimatedTime?: string
  difficulty?: string
  badge?: string
}

interface PresetSelectorProps {
  presets: QuestionPreset[]
  onPresetSelect: (preset: QuestionPreset) => void
}

export function PresetSelector({ presets, onPresetSelect }: PresetSelectorProps) {

  const getColorClasses = (color: string) => {
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
          const totalQuestions = preset.totalQuestions
          const Icon = preset.icon
          const colorClasses = getColorClasses(preset.color || 'blue')

          return (
            <div
              key={preset.name}
              className="group relative transform transition-all duration-500 hover:scale-105 cursor-pointer"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => onPresetSelect(preset)}
            >
              {/* Glow effect on hover */}
              <div className="absolute -inset-0.5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 blur-sm"></div>
              
              <Card className={`relative rounded-3xl border-2 transition-all duration-300 ${colorClasses.bg} ${colorClasses.border} shadow-xl hover:shadow-2xl transform hover:-translate-y-1`}>
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
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className={`inline-flex items-center gap-2 text-sm font-medium ${colorClasses.text} group-hover:animate-pulse`}>
                        <Sparkles className="h-4 w-4" />
                        Click to start!
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export type { QuestionPreset }
