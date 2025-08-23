// NewTab Analytics - Business Logic Layer
// Following SoC: Pure functions for newtab data processing and calculations

import type { PracticeSession } from '../types/fluent-flow-types'
import type { LearningGoal } from './goals-analysis'
import type { SessionPlan } from './session-templates'

export interface NewTabData {
  todayStats: DailyStats
  practiceStreak: number
  weeklyProgress: WeeklyProgressPoint[]
  recentAchievements: Achievement[]
  savedContent: SavedContent
  motivationalData: MotivationalData
  quickActions: QuickAction[]
}

export interface DailyStats {
  sessionsToday: number
  practiceTimeToday: number // in seconds
  goalProgress: number // percentage of daily goal completed
  vocabularyLearned: number
  recordingsToday: number
}

export interface WeeklyProgressPoint {
  date: Date
  practiceTime: number
  sessions: number
  goalAchieved: boolean
}

export interface Achievement {
  id: string
  type: 'goal_completed' | 'streak_milestone' | 'session_milestone' | 'vocabulary_milestone'
  title: string
  description: string
  icon: string
  achievedAt: Date
  value?: number
}

export interface SavedContent {
  recentLoops: Array<{
    id: string
    title: string
    videoTitle: string
    duration: number
    createdAt: Date
  }>
  bookmarkedVideos: Array<{
    videoId: string
    title: string
    thumbnail: string
    bookmarkedAt: Date
  }>
  practiceNotes: Array<{
    id: string
    content: string
    videoId?: string
    createdAt: Date
  }>
}

export interface MotivationalData {
  quote: string
  author: string
  progress: {
    level: string
    nextMilestone: string
    progressToNext: number
  }
}

export interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  action: 'resume_video' | 'random_video' | 'start_template' | 'focus_timer' | 'vocabulary_review'
  data?: any
}

/**
 * Calculates today's practice statistics
 */
export function calculateTodayStats(
  allSessions: PracticeSession[],
  goals: LearningGoal[]
): DailyStats {
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  const todaySessions = allSessions.filter(session => 
    session.createdAt >= todayStart && session.createdAt < todayEnd
  )

  const practiceTimeToday = todaySessions.reduce((acc, session) => 
    acc + session.totalPracticeTime, 0
  )

  const recordingsToday = todaySessions.reduce((acc, session) => 
    acc + session.recordings.length, 0
  )

  // Calculate daily goal progress
  const dailyGoal = goals.find(g => g.type === 'daily' && !g.isCompleted)
  const goalProgress = dailyGoal 
    ? Math.min((practiceTimeToday / dailyGoal.target) * 100, 100)
    : 0

  // Estimate vocabulary learned (rough calculation)
  const vocabularyLearned = Math.floor(practiceTimeToday / 300) // ~1 word per 5 minutes

  return {
    sessionsToday: todaySessions.length,
    practiceTimeToday,
    goalProgress,
    vocabularyLearned,
    recordingsToday
  }
}

/**
 * Calculates practice streak (consecutive days with sessions)
 */
export function calculatePracticeStreak(allSessions: PracticeSession[]): number {
  if (allSessions.length === 0) return 0

  let streak = 0
  const now = new Date()

  for (let i = 0; i < 365; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    
    const hasSession = allSessions.some(session => 
      session.createdAt >= dayStart && session.createdAt < dayEnd
    )
    
    if (hasSession) {
      streak++
    } else {
      break
    }
  }

  return streak
}

/**
 * Generates weekly progress data for mini chart
 */
export function calculateWeeklyProgress(
  allSessions: PracticeSession[],
  goals: LearningGoal[]
): WeeklyProgressPoint[] {
  const weeklyProgress: WeeklyProgressPoint[] = []
  const now = new Date()
  
  // Get daily goal target
  const dailyGoal = goals.find(g => g.type === 'daily')
  const dailyTarget = dailyGoal?.target || 900 // Default 15 minutes

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    
    const daySessions = allSessions.filter(session => 
      session.createdAt >= dayStart && session.createdAt < dayEnd
    )
    
    const practiceTime = daySessions.reduce((acc, session) => 
      acc + session.totalPracticeTime, 0
    )
    
    weeklyProgress.push({
      date: dayStart,
      practiceTime,
      sessions: daySessions.length,
      goalAchieved: practiceTime >= dailyTarget
    })
  }

  return weeklyProgress
}

/**
 * Generates recent achievements based on goals and milestones
 */
export function generateRecentAchievements(
  goals: LearningGoal[],
  practiceStreak: number,
  totalSessions: number,
  totalVocabulary: number
): Achievement[] {
  const achievements: Achievement[] = []
  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

  // Recent completed goals
  goals.filter(goal => goal.isCompleted && goal.completedAt && goal.completedAt >= threeDaysAgo)
    .forEach(goal => {
      achievements.push({
        id: `goal_${goal.id}`,
        type: 'goal_completed',
        title: `Goal Achieved: ${goal.title}`,
        description: `Completed ${goal.target} ${goal.unit}`,
        icon: '🎯',
        achievedAt: goal.completedAt!
      })
    })

  // Streak milestones
  if (practiceStreak > 0 && [7, 14, 30, 60, 100].includes(practiceStreak)) {
    achievements.push({
      id: `streak_${practiceStreak}`,
      type: 'streak_milestone',
      title: `${practiceStreak}-Day Streak!`,
      description: 'Consistent practice pays off',
      icon: '🔥',
      achievedAt: now,
      value: practiceStreak
    })
  }

  // Session milestones
  if ([10, 25, 50, 100, 250, 500].includes(totalSessions)) {
    achievements.push({
      id: `sessions_${totalSessions}`,
      type: 'session_milestone',
      title: `${totalSessions} Sessions Completed`,
      description: 'Practice makes perfect',
      icon: '📚',
      achievedAt: now,
      value: totalSessions
    })
  }

  // Vocabulary milestones (use the parameter)
  if (totalVocabulary > 0 && [50, 100, 250, 500, 1000].includes(totalVocabulary)) {
    achievements.push({
      id: `vocab_${totalVocabulary}`,
      type: 'vocabulary_milestone',
      title: `${totalVocabulary} Words Learned`,
      description: 'Vocabulary is growing!',
      icon: '📖',
      achievedAt: now,
      value: totalVocabulary
    })
  }

  return achievements.sort((a, b) => b.achievedAt.getTime() - a.achievedAt.getTime()).slice(0, 3)
}

/**
 * Gets motivational quote and progress data
 */
export function getMotivationalData(
  totalSessions: number,
  totalPracticeTime: number,
  practiceStreak: number
): MotivationalData {
  // Consider sessions and streak for future enhancements
  console.log(`User stats: ${totalSessions} sessions, ${practiceStreak}-day streak`)
  const quotes = [
    { quote: "The limits of my language mean the limits of my world.", author: "Ludwig Wittgenstein" },
    { quote: "To have another language is to possess a second soul.", author: "Charlemagne" },
    { quote: "One language sets you in a corridor for life. Two languages open every door along the way.", author: "Frank Smith" },
    { quote: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
    { quote: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss" },
    { quote: "Language is the road map of a culture.", author: "Rita Mae Brown" },
    { quote: "Those who know nothing of foreign languages know nothing of their own.", author: "Johann Wolfgang von Goethe" },
    { quote: "Every new language is like an open window that shows a new view of the world.", author: "Frank Harris" }
  ]

  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]

  // Determine level based on practice time (hours)
  const practiceHours = totalPracticeTime / 3600
  let level: string
  let nextMilestone: string
  let progressToNext: number

  if (practiceHours < 10) {
    level = "Beginner Explorer"
    nextMilestone = "Dedicated Learner (10 hours)"
    progressToNext = (practiceHours / 10) * 100
  } else if (practiceHours < 50) {
    level = "Dedicated Learner"
    nextMilestone = "Language Enthusiast (50 hours)"
    progressToNext = ((practiceHours - 10) / 40) * 100
  } else if (practiceHours < 100) {
    level = "Language Enthusiast"
    nextMilestone = "Fluency Seeker (100 hours)"
    progressToNext = ((practiceHours - 50) / 50) * 100
  } else {
    level = "Fluency Seeker"
    nextMilestone = "Master Communicator"
    progressToNext = 100
  }

  return {
    quote: randomQuote.quote,
    author: randomQuote.author,
    progress: {
      level,
      nextMilestone,
      progressToNext: Math.min(progressToNext, 100)
    }
  }
}

/**
 * Generates quick action items based on user state
 */
export function generateQuickActions(
  lastVideo: string | null,
  activePlans: SessionPlan[],
  practiceStreak: number
): QuickAction[] {
  const actions: QuickAction[] = []

  // Resume last video
  if (lastVideo) {
    actions.push({
      id: 'resume_video',
      title: 'Resume Last Video',
      description: 'Continue where you left off',
      icon: '▶️',
      action: 'resume_video',
      data: { videoId: lastVideo }
    })
  }

  // Continue active session
  if (activePlans.length > 0) {
    actions.push({
      id: 'continue_session',
      title: 'Continue Session',
      description: `${activePlans.length} active session${activePlans.length > 1 ? 's' : ''}`,
      icon: '📋',
      action: 'start_template',
      data: { planId: activePlans[0].templateId }
    })
  }

  // Random video suggestion
  actions.push({
    id: 'random_video',
    title: 'Discover New Content',
    description: 'Get personalized video suggestions',
    icon: '🎲',
    action: 'random_video'
  })

  // Focus timer
  actions.push({
    id: 'focus_timer',
    title: 'Focus Timer',
    description: 'Start a practice session with timer',
    icon: '⏰',
    action: 'focus_timer'
  })

  // Vocabulary review (if user has been practicing)
  if (practiceStreak > 0) {
    actions.push({
      id: 'vocabulary_review',
      title: 'Vocabulary Review',
      description: 'Review your learned words',
      icon: '📖',
      action: 'vocabulary_review'
    })
  }

  return actions.slice(0, 4) // Limit to 4 actions
}

/**
 * Formats time duration for display
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
}

/**
 * Gets time-based greeting message
 */
export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours()
  
  if (hour < 6) return "Good night! Late practice session?"
  if (hour < 12) return "Good morning! Ready to learn?"
  if (hour < 18) return "Good afternoon! Time for practice?"
  if (hour < 22) return "Good evening! Let's improve together!"
  return "Good night! One more session before bed?"
}