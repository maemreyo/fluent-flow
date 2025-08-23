// Learning Goals Service - Data Layer
// Following SoC: Handles data persistence and retrieval

import { 
  LearningGoal, 
  GoalSuggestion, 
  updateGoalProgress, 
  suggestGoals 
} from '../utils/goals-analysis'

export class LearningGoalsService {
  private readonly storageKey = 'fluent_flow_learning_goals'

  /**
   * Retrieves all user goals from storage
   */
  async getGoals(): Promise<LearningGoal[]> {
    try {
      const result = await chrome.storage.local.get([this.storageKey])
      const goalsData = result[this.storageKey]
      
      if (!goalsData) return []
      
      // Parse dates back from JSON
      return goalsData.map((goal: any) => ({
        ...goal,
        deadline: goal.deadline ? new Date(goal.deadline) : undefined,
        createdAt: new Date(goal.createdAt),
        completedAt: goal.completedAt ? new Date(goal.completedAt) : undefined
      }))
    } catch (error) {
      console.error('Failed to load goals:', error)
      return []
    }
  }

  /**
   * Saves goals to storage
   */
  async saveGoals(goals: LearningGoal[]): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.storageKey]: goals
      })
    } catch (error) {
      console.error('Failed to save goals:', error)
      throw new Error('Failed to save goals to storage')
    }
  }

  /**
   * Creates a new goal
   */
  async createGoal(goalData: Omit<LearningGoal, 'id' | 'current' | 'isCompleted' | 'createdAt'>): Promise<string> {
    const goals = await this.getGoals()
    
    const newGoal: LearningGoal = {
      ...goalData,
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      current: 0,
      isCompleted: false,
      createdAt: new Date()
    }

    goals.push(newGoal)
    await this.saveGoals(goals)
    
    return newGoal.id
  }

  /**
   * Updates an existing goal
   */
  async updateGoal(goalId: string, updates: Partial<LearningGoal>): Promise<boolean> {
    try {
      const goals = await this.getGoals()
      const goalIndex = goals.findIndex(g => g.id === goalId)
      
      if (goalIndex === -1) {
        return false
      }

      goals[goalIndex] = { ...goals[goalIndex], ...updates }
      await this.saveGoals(goals)
      return true
    } catch (error) {
      console.error('Failed to update goal:', error)
      return false
    }
  }

  /**
   * Deletes a goal
   */
  async deleteGoal(goalId: string): Promise<boolean> {
    try {
      const goals = await this.getGoals()
      const filteredGoals = goals.filter(g => g.id !== goalId)
      
      if (filteredGoals.length === goals.length) {
        return false // Goal not found
      }

      await this.saveGoals(filteredGoals)
      return true
    } catch (error) {
      console.error('Failed to delete goal:', error)
      return false
    }
  }

  /**
   * Updates all goals with current practice data
   */
  async updateAllGoalsProgress(practiceData: {
    allSessions: Array<{ 
      createdAt: Date
      totalPracticeTime: number
      videoId: string
    }>
    practiceStreak: number
  }): Promise<LearningGoal[]> {
    const goals = await this.getGoals()
    const now = new Date()
    
    // Calculate current values for different time periods
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const todaySessions = practiceData.allSessions.filter(s => s.createdAt >= today)
    const weekSessions = practiceData.allSessions.filter(s => s.createdAt >= weekStart)
    const monthSessions = practiceData.allSessions.filter(s => s.createdAt >= monthStart)

    const currentPracticeData = {
      todayTime: todaySessions.reduce((acc, s) => acc + s.totalPracticeTime, 0),
      weekTime: weekSessions.reduce((acc, s) => acc + s.totalPracticeTime, 0),
      monthTime: monthSessions.reduce((acc, s) => acc + s.totalPracticeTime, 0),
      sessionsToday: todaySessions.length,
      sessionsWeek: weekSessions.length,
      sessionsMonth: monthSessions.length,
      practiceStreak: practiceData.practiceStreak,
      uniqueVideos: [...new Set(practiceData.allSessions.map(s => s.videoId))].length
    }

    const updatedGoals = updateGoalProgress(goals, currentPracticeData)
    await this.saveGoals(updatedGoals)
    
    return updatedGoals
  }

  /**
   * Gets goal suggestions based on user's practice pattern
   */
  async getGoalSuggestions(practiceData: {
    totalSessions: number
    totalPracticeTime: number
    practiceStreak: number
    dailyAverages: { thisWeek: number; lastWeek: number; thisMonth: number }
    allSessions: Array<{ videoId: string }>
  }): Promise<GoalSuggestion[]> {
    const uniqueVideos = [...new Set(practiceData.allSessions.map(s => s.videoId))].length
    
    const analysisData = {
      totalSessions: practiceData.totalSessions,
      totalPracticeTime: practiceData.totalPracticeTime,
      practiceStreak: practiceData.practiceStreak,
      dailyAverages: practiceData.dailyAverages,
      uniqueVideos
    }

    return suggestGoals(analysisData)
  }

  /**
   * Creates a goal from suggestion
   */
  async createGoalFromSuggestion(suggestion: GoalSuggestion, customDeadline?: Date): Promise<string> {
    const deadline = customDeadline || (() => {
      const now = new Date()
      switch (suggestion.type) {
        case 'daily':
          return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 1 week
        case 'weekly':
          return new Date(now.getTime() + 4 * 7 * 24 * 60 * 60 * 1000) // 4 weeks
        case 'monthly':
          return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
        case 'streak':
          return new Date(now.getTime() + suggestion.target * 24 * 60 * 60 * 1000) // target days
        default:
          return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days default
      }
    })()

    const unit = (() => {
      switch (suggestion.type) {
        case 'daily':
        case 'weekly':
        case 'monthly':
          return 'minutes' as const
        case 'streak':
          return 'days' as const
        case 'session_count':
          return 'sessions' as const
        case 'video_count':
          return 'videos' as const
      }
    })()

    return this.createGoal({
      type: suggestion.type,
      target: suggestion.target,
      unit,
      title: suggestion.title,
      description: suggestion.description,
      deadline
    })
  }

  /**
   * Gets active (non-completed) goals
   */
  async getActiveGoals(): Promise<LearningGoal[]> {
    const allGoals = await this.getGoals()
    return allGoals.filter(goal => !goal.isCompleted)
  }

  /**
   * Gets completed goals for achievement tracking
   */
  async getCompletedGoals(): Promise<LearningGoal[]> {
    const allGoals = await this.getGoals()
    return allGoals.filter(goal => goal.isCompleted)
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))
  }
}

// Singleton instance
export const learningGoalsService = new LearningGoalsService()