import React, { useState } from 'react'
import { BookOpen, Play, Clock, Users, Target, ChevronRight, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import type { SessionTemplate, SessionPlan, SessionStep } from '../../lib/utils/session-templates'

interface SessionTemplatesCardProps {
  templates: SessionTemplate[]
  activePlans: (SessionPlan & { id: string })[]
  completedPlans: (SessionPlan & { id: string })[]
  formatTime: (seconds: number) => string
  onStartSession?: (templateId: string) => void
  onContinueSession?: (planId: string) => void
  onCreateTemplate?: () => void
  onViewPlan?: (planId: string) => void
}

export function SessionTemplatesCard({
  templates,
  activePlans,
  completedPlans,
  formatTime,
  onStartSession,
  onContinueSession,
  onCreateTemplate,
  onViewPlan
}: SessionTemplatesCardProps) {
  const [showAllTemplates, setShowAllTemplates] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('all')

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pronunciation': return <Target className="h-3 w-3" />
      case 'listening': return <Users className="h-3 w-3" />
      case 'vocabulary': return <BookOpen className="h-3 w-3" />
      case 'conversation': return <Users className="h-3 w-3" />
      case 'mixed': return <Play className="h-3 w-3" />
      default: return <BookOpen className="h-3 w-3" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pronunciation': return 'bg-blue-100 text-blue-800'
      case 'listening': return 'bg-green-100 text-green-800'
      case 'vocabulary': return 'bg-purple-100 text-purple-800'
      case 'conversation': return 'bg-orange-100 text-orange-800'
      case 'mixed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'border-green-200 bg-green-50'
      case 'intermediate': return 'border-yellow-200 bg-yellow-50'
      case 'advanced': return 'border-red-200 bg-red-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const filteredTemplates = selectedType === 'all' 
    ? templates 
    : templates.filter(t => t.type === selectedType)

  const displayTemplates = showAllTemplates 
    ? filteredTemplates 
    : filteredTemplates.slice(0, 3)

  const getStepIcon = (stepType: string) => {
    switch (stepType) {
      case 'loop_practice': return '🔄'
      case 'recording': return '🎤'
      case 'comparison': return '🔍'
      case 'note_taking': return '📝'
      case 'vocabulary': return '📚'
      default: return '📋'
    }
  }

  const calculatePlanProgress = (plan: SessionPlan & { id: string }) => {
    const template = templates.find(t => t.id === plan.templateId)
    if (!template) return 0
    return (plan.completedSteps.length / template.steps.length) * 100
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" />
            Session Templates
            {activePlans.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activePlans.length} active
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCreateTemplate?.()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Active Session Plans */}
        {activePlans.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Active Sessions</p>
              <Badge variant="outline" className="text-xs">
                {activePlans.length} in progress
              </Badge>
            </div>
            {activePlans.slice(0, 2).map(plan => {
              const template = templates.find(t => t.id === plan.templateId)
              const progress = calculatePlanProgress(plan)
              
              return (
                <div key={plan.id} className="rounded-lg border p-3 bg-blue-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">{template?.name || 'Unknown Template'}</p>
                      <p className="text-xs text-muted-foreground">{plan.videoTitle}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onContinueSession?.(plan.id)}
                    >
                      Continue
                    </Button>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Step {plan.currentStep + 1} of {template?.steps.length || 0}</span>
                      <span>{Math.round(progress)}% complete</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Template Type Filter */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'pronunciation', 'listening', 'vocabulary', 'conversation'].map(type => (
            <Button
              key={type}
              variant={selectedType === type ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setSelectedType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>

        {/* Available Templates */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Available Templates</p>
            {filteredTemplates.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllTemplates(!showAllTemplates)}
                className="text-xs"
              >
                {showAllTemplates ? 'Show Less' : `Show All (${filteredTemplates.length})`}
              </Button>
            )}
          </div>

          {displayTemplates.map(template => (
            <div key={template.id} className={`rounded-lg border p-3 ${getDifficultyColor(template.difficulty)}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {getTypeIcon(template.type)}
                    <p className="text-sm font-medium">{template.name}</p>
                  </div>
                  <Badge className={`text-xs ${getTypeColor(template.type)}`}>
                    {template.type}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{template.duration}min</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-3">
                {template.description}
              </p>

              {/* Template Steps Preview */}
              <div className="mb-3">
                <p className="text-xs font-medium mb-1">Steps ({template.steps.length}):</p>
                <div className="flex gap-1">
                  {template.steps.slice(0, 4).map(step => (
                    <div key={step.id} className="flex items-center gap-1">
                      <span className="text-xs">{getStepIcon(step.type)}</span>
                      {template.steps.indexOf(step) < 3 && <ChevronRight className="h-2 w-2 text-muted-foreground" />}
                    </div>
                  ))}
                  {template.steps.length > 4 && (
                    <span className="text-xs text-muted-foreground">+{template.steps.length - 4}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {template.difficulty}
                  </Badge>
                  {template.usageCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Used {template.usageCount} times
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStartSession?.(template.id)}
                >
                  Start Session
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Completed Sessions */}
        {completedPlans.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Recent Sessions</p>
            {completedPlans.slice(0, 2).map(plan => {
              const template = templates.find(t => t.id === plan.templateId)
              
              return (
                <div key={plan.id} className="flex items-center justify-between rounded border p-2 bg-green-50">
                  <div>
                    <p className="text-sm">{template?.name || 'Unknown Template'}</p>
                    <p className="text-xs text-muted-foreground">
                      Completed {plan.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      ✓ Done
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewPlan?.(plan.id)}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* No Templates State */}
        {templates.length === 0 && (
          <div className="py-4 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">No session templates available</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onCreateTemplate?.()}
            >
              Create Template
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}