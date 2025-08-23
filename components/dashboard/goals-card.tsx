import React, { useState } from 'react'
import { Target, Plus, TrendingUp, TrendingDown, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import type { LearningGoal, GoalProgress, GoalSuggestion } from '../../lib/utils/goals-analysis'

interface GoalsCardProps {
  goals: LearningGoal[]
  goalsProgress: { [goalId: string]: GoalProgress }
  suggestions: GoalSuggestion[]
  formatTime: (seconds: number) => string
  onCreateGoal?: (suggestion: GoalSuggestion) => void
  onDeleteGoal?: (goalId: string) => void
}

export function GoalsCard({
  goals,
  goalsProgress,
  suggestions,
  formatTime,
  onCreateGoal,
  onDeleteGoal
}: GoalsCardProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const activeGoals = goals.filter(goal => !goal.isCompleted)
  const completedGoals = goals.filter(goal => goal.isCompleted)

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500'
    if (percentage >= 80) return 'bg-blue-500' 
    if (percentage >= 60) return 'bg-yellow-500'
    return 'bg-gray-300'
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-3 w-3 text-green-600" />
      case 'declining': return <TrendingDown className="h-3 w-3 text-red-600" />
      default: return <div className="h-3 w-3 rounded-full bg-gray-400" />
    }
  }

  const formatGoalValue = (value: number, unit: string) => {
    switch (unit) {
      case 'minutes':
        return formatTime(value)
      case 'sessions':
        return `${value} sessions`
      case 'days':
        return `${value} days`
      case 'videos':
        return `${value} videos`
      default:
        return value.toString()
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50'
      case 'medium': return 'border-yellow-200 bg-yellow-50'
      case 'low': return 'border-blue-200 bg-blue-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Learning Goals
            {activeGoals.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeGoals.length} active
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSuggestions(!showSuggestions)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <div className="space-y-3">
            {activeGoals.map(goal => {
              const progress = goalsProgress[goal.id]
              if (!progress) return null

              return (
                <div key={goal.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{goal.title}</p>
                      {getTrendIcon(progress.trend)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteGoal?.(goal.id)}
                      className="h-6 w-6 p-0"
                    >
                      ×
                    </Button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{formatGoalValue(goal.current, goal.unit)}</span>
                      <span>{formatGoalValue(goal.target, goal.unit)}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getProgressColor(progress.percentage)}`}
                        style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Progress Info */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {Math.round(progress.percentage)}% complete
                    </span>
                    <Badge 
                      variant={progress.isOnTrack ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {progress.isOnTrack ? 'On Track' : 'Needs Attention'}
                    </Badge>
                  </div>

                  {/* Encouragement Message */}
                  {progress.encouragementMessage && (
                    <p className="mt-2 text-xs text-muted-foreground italic">
                      {progress.encouragementMessage}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <p className="text-sm font-medium">Recent Achievements</p>
            </div>
            {completedGoals.slice(0, 2).map(goal => (
              <div key={goal.id} className="flex items-center justify-between rounded border p-2">
                <div>
                  <p className="text-sm">{goal.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Completed {goal.completedAt?.toLocaleDateString()}
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-800 text-xs">
                  ✓ Done
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* No Goals State */}
        {activeGoals.length === 0 && completedGoals.length === 0 && (
          <div className="py-4 text-center">
            <Target className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">No learning goals set</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSuggestions(true)}
            >
              Get Suggestions
            </Button>
          </div>
        )}

        {/* Goal Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Suggested Goals</p>
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <div key={index} className={`rounded-lg border p-3 ${getPriorityColor(suggestion.priority)}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">{suggestion.title}</p>
                  <Badge variant="outline" className="text-xs">
                    {suggestion.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {suggestion.description}
                </p>
                <p className="text-xs italic text-muted-foreground mb-3">
                  {suggestion.reasoning}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Target: {formatGoalValue(suggestion.target, 
                      suggestion.type.includes('time') ? 'minutes' : 
                      suggestion.type === 'streak' ? 'days' :
                      suggestion.type === 'session_count' ? 'sessions' : 'videos'
                    )}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCreateGoal?.(suggestion)}
                  >
                    Set Goal
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}