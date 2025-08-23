// Learning Goals Analysis - Business Logic Layer
// Following SoC: Pure functions for goal calculations and progress tracking

export interface LearningGoal {
  id: string
  type: 'daily' | 'weekly' | 'monthly' | 'streak' | 'session_count' | 'video_count'
  target: number
  current: number
  unit: 'minutes' | 'sessions' | 'days' | 'videos'
  title: string
  description: string
  deadline?: Date
  createdAt: Date
  isCompleted: boolean
  completedAt?: Date
}

export interface GoalProgress {
  percentage: number
  isOnTrack: boolean
  remainingTime: number
  estimatedCompletion: Date | null
  encouragementMessage: string
  trend: 'improving' | 'declining' | 'stable'
}

export interface GoalSuggestion {
  type: LearningGoal['type']
  target: number
  title: string
  description: string
  reasoning: string
  priority: 'high' | 'medium' | 'low'
}

/**
 * Calculates progress for a specific goal
 */
export function calculateGoalProgress(
  goal: LearningGoal,
  practiceData: {
    totalSessions: number
    totalPracticeTime: number
    practiceStreak: number
    uniqueVideos: number
    recentTrend: number[]
  }
): GoalProgress {
  // Get current value based on goal type
  let currentValue = 0
  switch (goal.type) {
    case 'daily':
    case 'weekly':
    case 'monthly':
      currentValue = goal.current // Will be updated by time-based calculations
      break
    case 'streak':
      currentValue = practiceData.practiceStreak
      break
    case 'session_count':
      currentValue = practiceData.totalSessions
      break
    case 'video_count':
      currentValue = practiceData.uniqueVideos
      break
  }

  const percentage = Math.min((currentValue / goal.target) * 100, 100)
  const isCompleted = currentValue >= goal.target

  // Calculate if on track (for time-based goals)
  let isOnTrack = true
  let remainingTime = 0
  let estimatedCompletion: Date | null = null

  if (goal.deadline && !isCompleted) {
    const now = new Date()
    const timeRemaining = goal.deadline.getTime() - now.getTime()
    const progressRemaining = goal.target - currentValue
    
    remainingTime = timeRemaining
    
    // Calculate required daily rate
    const daysRemaining = Math.max(timeRemaining / (24 * 60 * 60 * 1000), 1)
    const requiredDailyRate = progressRemaining / daysRemaining
    
    // Check trend
    const recentDailyAverage = practiceData.recentTrend.length > 0 
      ? practiceData.recentTrend.reduce((a, b) => a + b, 0) / practiceData.recentTrend.length
      : 0

    isOnTrack = recentDailyAverage >= requiredDailyRate * 0.8 // 80% of required rate
    
    // Estimate completion
    if (recentDailyAverage > 0) {
      const daysToComplete = progressRemaining / recentDailyAverage
      estimatedCompletion = new Date(now.getTime() + daysToComplete * 24 * 60 * 60 * 1000)
    }
  }

  // Determine trend
  let trend: 'improving' | 'declining' | 'stable' = 'stable'
  if (practiceData.recentTrend.length >= 3) {
    const recent = practiceData.recentTrend.slice(-3)
    const older = practiceData.recentTrend.slice(0, 3)
    
    if (recent.length > 0 && older.length > 0) {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
      
      if (recentAvg > olderAvg * 1.1) trend = 'improving'
      else if (recentAvg < olderAvg * 0.9) trend = 'declining'
    }
  }

  // Generate encouragement message
  const encouragementMessage = generateEncouragementMessage(percentage, isOnTrack, trend)

  return {
    percentage,
    isOnTrack,
    remainingTime,
    estimatedCompletion,
    encouragementMessage,
    trend
  }
}

/**
 * Suggests realistic goals based on user's practice history
 */
export function suggestGoals(practiceData: {
  totalSessions: number
  totalPracticeTime: number
  practiceStreak: number
  dailyAverages: { thisWeek: number; lastWeek: number; thisMonth: number }
  uniqueVideos: number
}): GoalSuggestion[] {
  const suggestions: GoalSuggestion[] = []
  
  // Daily practice time goal
  const currentDailyAvg = practiceData.dailyAverages.thisWeek
  if (currentDailyAvg < 60 * 15) { // Less than 15 minutes
    suggestions.push({
      type: 'daily',
      target: Math.max(currentDailyAvg * 1.5, 10 * 60), // 50% increase or minimum 10 minutes
      title: 'Daily Practice',
      description: 'Practice every day for consistent improvement',
      reasoning: 'Based on your current average, a small increase will build consistency',
      priority: 'high'
    })
  }

  // Practice streak goal
  if (practiceData.practiceStreak < 7) {
    suggestions.push({
      type: 'streak',
      target: Math.max(practiceData.practiceStreak + 3, 7),
      title: 'Practice Streak',
      description: 'Build a consistent learning habit',
      reasoning: 'Consecutive days of practice improve retention significantly',
      priority: 'high'
    })
  }

  // Weekly session goal
  const currentWeeklySessions = Math.ceil(practiceData.totalSessions / 4) // Estimate weekly
  if (currentWeeklySessions < 5) {
    suggestions.push({
      type: 'session_count',
      target: currentWeeklySessions + 2,
      title: 'Weekly Sessions',
      description: 'Increase practice frequency',
      reasoning: 'More frequent practice sessions improve skill retention',
      priority: 'medium'
    })
  }

  // Video diversity goal
  if (practiceData.uniqueVideos < 10) {
    suggestions.push({
      type: 'video_count',
      target: Math.max(practiceData.uniqueVideos + 3, 10),
      title: 'Content Variety',
      description: 'Practice with diverse video content',
      reasoning: 'Different content exposes you to varied vocabulary and accents',
      priority: 'medium'
    })
  }

  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  })
}

/**
 * Updates goal progress based on current practice data
 */
export function updateGoalProgress(
  goals: LearningGoal[],
  currentPracticeData: {
    todayTime: number
    weekTime: number
    monthTime: number
    sessionsToday: number
    sessionsWeek: number
    sessionsMonth: number
    practiceStreak: number
    uniqueVideos: number
  }
): LearningGoal[] {
  return goals.map(goal => {
    let currentValue = goal.current

    switch (goal.type) {
      case 'daily':
        currentValue = currentPracticeData.todayTime
        break
      case 'weekly':
        currentValue = currentPracticeData.weekTime
        break
      case 'monthly':
        currentValue = currentPracticeData.monthTime
        break
      case 'streak':
        currentValue = currentPracticeData.practiceStreak
        break
      case 'session_count':
        // Use appropriate session count based on goal timeline
        currentValue = goal.deadline 
          ? currentPracticeData.sessionsMonth 
          : currentPracticeData.sessionsToday
        break
      case 'video_count':
        currentValue = currentPracticeData.uniqueVideos
        break
    }

    const isCompleted = currentValue >= goal.target
    const completedAt = isCompleted && !goal.isCompleted ? new Date() : goal.completedAt

    return {
      ...goal,
      current: currentValue,
      isCompleted,
      completedAt
    }
  })
}

/**
 * Generates encouraging messages based on progress
 */
function generateEncouragementMessage(
  percentage: number, 
  isOnTrack: boolean, 
  trend: 'improving' | 'declining' | 'stable'
): string {
  if (percentage >= 100) {
    return "🎉 Goal completed! You're doing amazing!"
  }

  if (percentage >= 80) {
    return "🔥 Almost there! You're so close to reaching your goal!"
  }

  if (percentage >= 60) {
    if (trend === 'improving') {
      return "📈 Great progress! You're improving consistently!"
    } else if (trend === 'declining') {
      return "💪 Stay focused! Small daily efforts make big differences!"
    } else {
      return "⚡ Good momentum! Keep up the steady progress!"
    }
  }

  if (percentage >= 30) {
    if (isOnTrack) {
      return "✨ You're on track! Consistency is key to success!"
    } else {
      return "🎯 Consider increasing daily practice to reach your goal!"
    }
  }

  if (trend === 'improving') {
    return "🌱 Building momentum! Every session counts!"
  } else {
    return "🚀 Start small, dream big! Every expert was once a beginner!"
  }
}