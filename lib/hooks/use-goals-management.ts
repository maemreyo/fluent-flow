import { useState, useEffect } from 'react'
import { learningGoalsService } from '../services/learning-goals-service'
import { calculateGoalProgress } from '../utils/goals-analysis'
import type { LearningGoal, GoalProgress, GoalSuggestion } from '../utils/goals-analysis'
import type { PracticeSession } from '../types/fluent-flow-types'

/**
 * Custom hook for managing learning goals and progress tracking
 */
export function useGoalsManagement(allSessions: any[], analytics: any) {
  const [goals, setGoals] = useState<LearningGoal[]>([])
  const [goalSuggestions, setGoalSuggestions] = useState<GoalSuggestion[]>([])
  const [goalsProgress, setGoalsProgress] = useState<{ [goalId: string]: GoalProgress }>({})

  const loadGoals = async () => {
    try {
      const userGoals = await learningGoalsService.getGoals()
      setGoals(userGoals)

      // Get goal suggestions
      if (allSessions && allSessions.length > 0) {
        const suggestions = await learningGoalsService.getGoalSuggestions()
        setGoalSuggestions(suggestions)
      }
    } catch (error) {
      console.error('Failed to load goals:', error)
    }
  }

  const updateGoalsProgress = async () => {
    if (!goals.length || !allSessions || allSessions.length === 0) return

    try {
      // Create a mock practice session from the most recent session for progress update
      const latestSession = allSessions[allSessions.length - 1]
      const mockSession: PracticeSession = {
        id: latestSession.id || `session_${Date.now()}`,
        videoId: latestSession.videoId,
        videoTitle: latestSession.videoTitle || 'Practice Session',
        videoUrl: latestSession.videoUrl || '',
        segments: [],
        recordings: [],
        totalPracticeTime: latestSession.totalPracticeTime,
        vocabularyCount: latestSession.vocabularyCount || 0,
        createdAt: latestSession.createdAt,
        updatedAt: new Date()
      }

      await learningGoalsService.updateAllGoalsProgress(mockSession)
      const updatedGoals = await learningGoalsService.getGoals()
      setGoals(updatedGoals)

      // Calculate progress for display
      const progressData: { [goalId: string]: GoalProgress } = {}
      const uniqueVideos = [...new Set(allSessions.map(s => s.videoId))].length
      const recentTrend = analytics.weeklyTrend.map((day: { practiceTime: number }) => day.practiceTime)

      updatedGoals.forEach(goal => {
        progressData[goal.id] = calculateGoalProgress(goal, {
          totalSessions: allSessions.length,
          totalPracticeTime: allSessions.reduce((acc, s) => acc + s.totalPracticeTime, 0),
          practiceStreak: analytics.practiceStreak,
          uniqueVideos,
          recentTrend
        })
      })

      setGoalsProgress(progressData)
    } catch (error) {
      console.error('Failed to update goals progress:', error)
    }
  }

  const handleCreateGoal = async (suggestion: GoalSuggestion) => {
    try {
      await learningGoalsService.createGoalFromSuggestion(suggestion)
      await loadGoals() // Reload goals
    } catch (error) {
      console.error('Failed to create goal:', error)
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await learningGoalsService.deleteGoal(goalId)
      await loadGoals() // Reload goals
    } catch (error) {
      console.error('Failed to delete goal:', error)
    }
  }

  // Load goals on mount
  useEffect(() => {
    loadGoals()
  }, [])

  // Update goals progress when session data changes
  useEffect(() => {
    updateGoalsProgress()
  }, [allSessions, goals])

  return {
    goals,
    goalSuggestions,
    goalsProgress,
    handleCreateGoal,
    handleDeleteGoal,
    loadGoals
  }
}