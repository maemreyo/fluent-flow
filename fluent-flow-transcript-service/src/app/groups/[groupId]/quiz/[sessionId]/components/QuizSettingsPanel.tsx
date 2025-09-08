'use client'

import { useState } from 'react'
import { Settings, Clock, Shuffle, Eye, SkipForward, ChevronUp, ChevronDown } from 'lucide-react'
import { Badge } from '../../../../../../components/ui/badge'
import { Button } from '../../../../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../../components/ui/card'

interface QuizSettingsPanelProps {
  settings: {
    shuffleQuestions?: boolean
    shuffleAnswers?: boolean
    showCorrectAnswers?: boolean
    defaultQuizTimeLimit?: number
    enforceQuizTimeLimit?: boolean
    allowSkippingQuestions?: boolean
  }
  compact?: boolean
}

export function QuizSettingsPanel({ settings, compact = false }: QuizSettingsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const activeSettings = [
    {
      key: 'timeLimit',
      icon: Clock,
      label: 'Time Limit',
      active: settings.enforceQuizTimeLimit,
      value: settings.enforceQuizTimeLimit ? `${settings.defaultQuizTimeLimit} minutes` : null,
      description: settings.enforceQuizTimeLimit 
        ? `Quiz must be completed within ${settings.defaultQuizTimeLimit} minutes`
        : 'No time limit set'
    },
    {
      key: 'shuffleQuestions',
      icon: Shuffle,
      label: 'Question Order',
      active: settings.shuffleQuestions,
      value: settings.shuffleQuestions ? 'Randomized' : 'Fixed Order',
      description: settings.shuffleQuestions 
        ? 'Questions appear in random order for each participant'
        : 'Questions appear in the same order for all participants'
    },
    {
      key: 'shuffleAnswers',
      icon: Shuffle,
      label: 'Answer Options',
      active: settings.shuffleAnswers,
      value: settings.shuffleAnswers ? 'Randomized' : 'Fixed Order',
      description: settings.shuffleAnswers
        ? 'Answer choices are randomized for each question'
        : 'Answer choices appear in the same order'
    },
    {
      key: 'showCorrect',
      icon: Eye,
      label: 'Show Correct Answers',
      active: settings.showCorrectAnswers,
      value: settings.showCorrectAnswers ? 'Enabled' : 'Hidden',
      description: settings.showCorrectAnswers
        ? 'Correct answers will be shown after quiz completion'
        : 'Correct answers will not be shown'
    },
    {
      key: 'allowSkipping',
      icon: SkipForward,
      label: 'Question Skipping',
      active: settings.allowSkippingQuestions,
      value: settings.allowSkippingQuestions ? 'Allowed' : 'Not Allowed',
      description: settings.allowSkippingQuestions
        ? 'You can skip difficult questions and return later'
        : 'All questions must be answered in order'
    }
  ]

  if (compact) {
    return (
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Quiz Settings</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        
        {!isExpanded && (
          <div className="flex flex-wrap gap-1">
            {activeSettings.filter(setting => setting.active).map((setting) => {
              const Icon = setting.icon
              return (
                <Badge key={setting.key} variant="secondary" className="text-xs">
                  <Icon className="h-3 w-3 mr-1" />
                  {setting.label}
                </Badge>
              )
            })}
            {activeSettings.filter(setting => setting.active).length === 0 && (
              <span className="text-xs text-gray-500">Default settings</span>
            )}
          </div>
        )}

        {isExpanded && (
          <div className="space-y-2 mt-2">
            {activeSettings.map((setting) => {
              const Icon = setting.icon
              return (
                <div key={setting.key} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3 w-3 text-gray-400" />
                    <span className="text-xs font-medium text-gray-600">{setting.label}</span>
                  </div>
                  <Badge 
                    variant={setting.active ? "default" : "secondary"} 
                    className="text-xs"
                  >
                    {setting.value}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5 text-blue-600" />
          Quiz Settings for This Session
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {activeSettings.map((setting) => {
            const Icon = setting.icon
            return (
              <div key={setting.key} className="flex items-start gap-3">
                <div className={`mt-0.5 p-1.5 rounded-full ${
                  setting.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{setting.label}</span>
                    <Badge variant={setting.active ? "default" : "secondary"}>
                      {setting.value}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{setting.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}