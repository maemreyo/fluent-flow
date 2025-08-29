// Learning Goals Service - Data Layer
// Following SoC: Handles data persistence and retrieval

import { getCurrentUser, supabase } from '../supabase/client'
import type { PracticeSession } from '../types/fluent-flow-types'
import type { GoalSuggestion, LearningGoal } from '../utils/goals-analysis'
import { SocialService } from './social-service'

class LearningGoalsService {
  private cache = new Map<string, { goals: LearningGoal[]; timestamp: number }>()

  /**
   * Get all learning goals for the current user
   */
  async getGoals(): Promise<LearningGoal[]> {
    try {
      const { data, error } = await supabase
        .from('learning_goals')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Error fetching goals from Supabase:', error)
        return this.getGoalsFromChromeStorage()
      }

      if (data && data.length > 0) {
        return data.map(goal => ({
          id: goal.id,
          type: goal.type as LearningGoal['type'],
          title: goal.title,
          description: goal.description,
          target: goal.target,
          current: goal.current,
          unit: goal.unit as LearningGoal['unit'],
          deadline: goal.deadline ? new Date(goal.deadline) : undefined,
          isCompleted: goal.is_completed,
          createdAt: new Date(goal.created_at),
          completedAt: goal.completed_at ? new Date(goal.completed_at) : undefined
        }))
      }

      return this.getGoalsFromChromeStorage()
    } catch (error) {
      console.warn('Failed to fetch goals from Supabase:', error)
      return this.getGoalsFromChromeStorage()
    }
  }

  /**
   * Create a new learning goal
   */
  async createGoal(
    goalData: Omit<LearningGoal, 'id' | 'current' | 'createdAt' | 'isCompleted' | 'completedAt'>
  ): Promise<LearningGoal> {
    const newGoal: LearningGoal = {
      id: crypto.randomUUID(),
      current: 0,
      isCompleted: false,
      createdAt: new Date(),
      ...goalData
    }

    try {
      const user = await getCurrentUser()

      if (user) {
        const { error } = await supabase.from('learning_goals').insert({
          id: newGoal.id,
          user_id: user.id,
          type: newGoal.type,
          title: newGoal.title,
          description: newGoal.description,
          target: newGoal.target,
          current: newGoal.current,
          unit: newGoal.unit,
          deadline: newGoal.deadline?.toISOString(),
          is_completed: newGoal.isCompleted,
          created_at: newGoal.createdAt.toISOString()
        })

        if (error) {
          console.warn('Error saving goal to Supabase:', error)
        }
      }
    } catch (error) {
      console.warn('Failed to save goal to Supabase:', error)
    }

    // Also save to Chrome storage as backup
    const goals = await this.getGoalsFromChromeStorage()
    goals.push(newGoal)
    await chrome.storage.sync.set({ learningGoals: goals })

    return newGoal
  }

  /**
   * Update an existing goal
   */
  async updateGoal(
    goalId: string,
    updates: Partial<
      Pick<
        LearningGoal,
        'title' | 'description' | 'target' | 'current' | 'deadline' | 'isCompleted'
      >
    >
  ): Promise<void> {
    try {
      const user = await getCurrentUser()
      if (!user) {
        console.warn('No user authenticated, updating in Chrome storage')
        return this.updateGoalInChromeStorage(goalId, updates)
      }

      const updateData: any = {}
      if (updates.title !== undefined) updateData.title = updates.title
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.target !== undefined) updateData.target = updates.target
      if (updates.current !== undefined) updateData.current = updates.current
      if (updates.deadline !== undefined)
        updateData.deadline = updates.deadline ? updates.deadline.toISOString() : null
      if (updates.isCompleted !== undefined) {
        updateData.is_completed = updates.isCompleted
        updateData.completed_at = updates.isCompleted ? new Date().toISOString() : null
      }

      const { error } = await supabase
        .from('learning_goals')
        .update(updateData)
        .eq('id', goalId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error updating goal in Supabase:', error)
        return this.updateGoalInChromeStorage(goalId, updates)
      }

      // Clear cache
      this.cache.delete(`goals_${user.id}`)
    } catch (error) {
      console.error('Error in updateGoal:', error)
      return this.updateGoalInChromeStorage(goalId, updates)
    }
  }

  /**
   * Delete a goal
   */
  async deleteGoal(goalId: string): Promise<void> {
    try {
      const user = await getCurrentUser()
      if (!user) {
        console.warn('No user authenticated, deleting from Chrome storage')
        return this.deleteGoalFromChromeStorage(goalId)
      }

      const { error } = await supabase
        .from('learning_goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error deleting goal from Supabase:', error)
        return this.deleteGoalFromChromeStorage(goalId)
      }

      // Clear cache
      this.cache.delete(`goals_${user.id}`)
    } catch (error) {
      console.error('Error in deleteGoal:', error)
      return this.deleteGoalFromChromeStorage(goalId)
    }
  }

  /**
   * Update progress based on practice session data
   */
  async updateProgress(practiceSession: PracticeSession): Promise<void> {
    const goals = await this.getGoals()
    let hasUpdates = false

    for (const goal of goals) {
      const oldCurrent = goal.current

      switch (goal.type) {
        case 'daily':
        case 'weekly':
        case 'monthly':
          if (goal.unit === 'minutes') {
            goal.current += practiceSession.totalPracticeTime
          } else if (goal.unit === 'sessions') {
            goal.current += 1
          } else if (goal.unit === 'videos') {
            goal.current += 1
          }
          break
        case 'streak':
          // Streak is handled by separate streak calculation
          goal.current = await this.getCurrentStreakFromSupabase()
          break
        case 'session_count':
          goal.current += 1
          break
        case 'video_count':
          goal.current += 1
          break
      }

      if (goal.current >= goal.target && !goal.isCompleted) {
        goal.isCompleted = true
        goal.completedAt = new Date()
      }

      if (oldCurrent !== goal.current || goal.isCompleted) {
        hasUpdates = true
        await this.updateGoal(goal.id, {
          current: goal.current,
          isCompleted: goal.isCompleted
        })
      }
    }

    if (hasUpdates) {
      // Update social service with achievements
      try {
        const socialService = new SocialService()

        // Calculate current streak for social service
        const currentStreak = await this.getCurrentStreakFromSupabase()

        await socialService.updateUserStats({
          duration: practiceSession.totalPracticeTime,
          recordingsMade: practiceSession.recordings?.length || 0,
          loopsCompleted: practiceSession.segments?.length || 0,
          vocabularyLearned: practiceSession.vocabularyCount || 0,
          streakDay: currentStreak
        })
      } catch (error) {
        console.warn('Failed to update social stats:', error)
      }
    }
  }

  /**
   * Update progress for all goals based on practice session data
   */
  async updateAllGoalsProgress(sessionData: PracticeSession): Promise<void> {
    return this.updateProgress(sessionData)
  }

  /**
   * Get current streak from Supabase
   */
  async getCurrentStreakFromSupabase(): Promise<number> {
    try {
      const user = await getCurrentUser()
      if (!user) return 0

      // Use the database function to calculate streak
      const { data, error } = await supabase.rpc('calculate_user_streak', {
        user_uuid: user.id
      })

      if (error) {
        console.error('Error calculating streak:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      console.error('Error getting streak from Supabase:', error)
      return 0
    }
  }

  /**
   * Get goal suggestions based on user data
   */
  async getGoalSuggestions(): Promise<GoalSuggestion[]> {
    try {
      // For now, return default suggestions
      // In the future, this could be enhanced with suggestions
      const suggestions = this.getDefaultGoalSuggestions()

      if (suggestions.length === 0) {
        return this.generateGoalSuggestions()
      }

      return this.getDefaultGoalSuggestions()
    } catch (error) {
      console.error('Error getting goal suggestions:', error)
      return []
    }
  }

  /**
   * Create goal from suggestion
   */
  async createGoalFromSuggestion(suggestion: GoalSuggestion): Promise<LearningGoal> {
    // Determine unit based on goal type
    let unit: LearningGoal['unit']
    let deadline: Date | undefined

    switch (suggestion.type) {
      case 'daily':
      case 'weekly':
      case 'monthly':
        unit = 'minutes' // Default to minutes for time-based goals
        break
      case 'streak':
        unit = 'days'
        break
      case 'session_count':
        unit = 'sessions'
        break
      case 'video_count':
        unit = 'videos'
        break
      default:
        unit = 'minutes'
    }

    // Set deadline based on goal type
    if (suggestion.type === 'daily') {
      deadline = new Date()
      deadline.setHours(23, 59, 59, 999) // End of today
    } else if (suggestion.type === 'weekly') {
      deadline = new Date()
      deadline.setDate(deadline.getDate() + (7 - deadline.getDay())) // End of this week
      deadline.setHours(23, 59, 59, 999)
    } else if (suggestion.type === 'monthly') {
      deadline = new Date()
      deadline.setMonth(deadline.getMonth() + 1, 0) // End of this month
      deadline.setHours(23, 59, 59, 999)
    }

    return this.createGoal({
      type: suggestion.type,
      title: suggestion.title,
      description: suggestion.description,
      target: suggestion.target,
      unit,
      deadline
    })
  }

  // Chrome Storage fallback methods
  private async getGoalsFromChromeStorage(): Promise<LearningGoal[]> {
    try {
      const result = await chrome.storage.local.get(['learning_goals'])
      return result.learning_goals || []
    } catch (error) {
      console.error('Error getting goals from Chrome storage:', error)
      return []
    }
  }

  private async createGoalInChromeStorage(
    goal: Omit<LearningGoal, 'id' | 'current' | 'isCompleted' | 'createdAt' | 'completedAt'>
  ): Promise<LearningGoal> {
    const goals = await this.getGoalsFromChromeStorage()
    const newGoal: LearningGoal = {
      ...goal,
      id: `goal_${Date.now()}`,
      current: 0,
      isCompleted: false,
      createdAt: new Date()
    }

    goals.push(newGoal)
    await chrome.storage.local.set({ learning_goals: goals })
    return newGoal
  }

  private async updateGoalInChromeStorage(
    goalId: string,
    updates: Partial<
      Pick<
        LearningGoal,
        'title' | 'description' | 'target' | 'current' | 'deadline' | 'isCompleted'
      >
    >
  ): Promise<void> {
    const goals = await this.getGoalsFromChromeStorage()
    const goalIndex = goals.findIndex(g => g.id === goalId)

    if (goalIndex !== -1) {
      goals[goalIndex] = {
        ...goals[goalIndex],
        ...updates,
        completedAt: updates.isCompleted ? new Date() : goals[goalIndex].completedAt
      }
      await chrome.storage.local.set({ learning_goals: goals })
    }
  }

  private async deleteGoalFromChromeStorage(goalId: string): Promise<void> {
    const goals = await this.getGoalsFromChromeStorage()
    const filteredGoals = goals.filter(g => g.id !== goalId)
    await chrome.storage.local.set({ learning_goals: filteredGoals })
  }

  private getDefaultGoalSuggestions(): GoalSuggestion[] {
    return [
      {
        type: 'daily',
        title: 'Daily Practice Goal',
        description: 'Practice for 30 minutes every day',
        target: 30,
        reasoning: 'Daily practice builds consistent learning habits',
        priority: 'high'
      },
      {
        type: 'streak',
        title: 'Weekly Streak',
        description: 'Maintain a 7-day practice streak',
        target: 7,
        reasoning: 'Streaks create positive momentum and motivation',
        priority: 'medium'
      },
      {
        type: 'session_count',
        title: 'Monthly Sessions',
        description: 'Complete 20 practice sessions this month',
        target: 20,
        reasoning: 'Regular sessions improve long-term retention',
        priority: 'medium'
      }
    ]
  }

  private generateGoalSuggestions(): GoalSuggestion[] {
    return this.getDefaultGoalSuggestions()
  }
}

// Singleton instance
export const learningGoalsService = new LearningGoalsService()
