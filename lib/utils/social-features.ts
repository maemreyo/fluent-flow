// Social Features - Business Logic Layer
// Following SoC: Pure functions for social interactions and community features

export interface FluentFlowUser {
  id: string
  username: string
  displayName: string
  email: string
  avatar?: string
  languagePreferences: {
    learning: string[]
    native: string[]
  }
  joinedAt: Date
  lastSeen: Date
  isOnline: boolean
  preferences: {
    publicProfile: boolean
    shareProgress: boolean
    acceptChallenges: boolean
    showOnLeaderboard: boolean
  }
  stats: UserStats
  level: UserLevel
  achievements: Achievement[]
}

export interface UserStats {
  totalPracticeTime: number
  totalSessions: number
  currentStreak: number
  longestStreak: number
  videosCompleted: number
  averageSessionTime: number
  vocabularyLearned: number
  recordingsMade: number
  challengesCompleted: number
  friendsHelped: number
}

export interface UserLevel {
  current: number
  name: string
  xp: number
  xpToNext: number
  totalXp: number
  icon: string
  color: string
}

export interface Achievement {
  id: string
  type: 'milestone' | 'streak' | 'social' | 'challenge' | 'helping'
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlockedAt: Date
  xpReward: number
}

export interface StudyGroup {
  id: string
  name: string
  description: string
  language: string
  level: 'beginner' | 'intermediate' | 'advanced'
  createdBy: string
  createdAt: Date
  members: StudyGroupMember[]
  maxMembers: number
  isPrivate: boolean
  tags: string[]
  currentChallenge?: GroupChallenge
  stats: {
    totalSessions: number
    avgProgress: number
    mostActiveDay: string
  }
}

export interface StudyGroupMember {
  userId: string
  username: string
  avatar?: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: Date
  contribution: number
  lastActive: Date
}

export interface GroupChallenge {
  id: string
  title: string
  description: string
  type: 'practice_time' | 'streak' | 'vocabulary' | 'sessions' | 'videos'
  target: number
  duration: number // in days
  startDate: Date
  endDate: Date
  participants: ChallengeParticipant[]
  rewards: {
    xp: number
    achievement?: string
    badge?: string
  }
  status: 'upcoming' | 'active' | 'completed' | 'cancelled'
}

export interface ChallengeParticipant {
  userId: string
  username: string
  avatar?: string
  progress: number
  rank: number
  joinedAt: Date
  completedAt?: Date
}

export interface ChatMessage {
  id: string
  groupId?: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  type: 'text' | 'achievement' | 'challenge_update' | 'video_share' | 'system'
  timestamp: Date
  reactions?: MessageReaction[]
  replyTo?: string
  metadata?: {
    videoId?: string
    videoTitle?: string
    achievementId?: string
    challengeId?: string
  }
}

export interface MessageReaction {
  emoji: string
  users: string[]
  count: number
}

export interface Leaderboard {
  id: string
  type: 'global' | 'friends' | 'group' | 'language'
  timeframe: 'daily' | 'weekly' | 'monthly' | 'all_time'
  metric: 'practice_time' | 'streak' | 'xp' | 'sessions' | 'vocabulary'
  entries: LeaderboardEntry[]
  lastUpdated: Date
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  avatar?: string
  value: number
  change: number // position change from previous period
  badge?: string
  level: number
}

export interface SocialNotification {
  id: string
  userId: string
  type: 'friend_request' | 'challenge_invite' | 'group_invite' | 'achievement' | 'message' | 'leaderboard'
  title: string
  message: string
  data?: any
  read: boolean
  createdAt: Date
  expiresAt?: Date
}

/**
 * Calculates user level based on total XP
 */
export function calculateUserLevel(totalXp: number): UserLevel {
  const levels = [
    { level: 1, name: "Newbie Explorer", xpRequired: 0, icon: "🌱", color: "#10b981" },
    { level: 2, name: "Eager Learner", xpRequired: 100, icon: "📚", color: "#3b82f6" },
    { level: 3, name: "Dedicated Student", xpRequired: 300, icon: "🎯", color: "#6366f1" },
    { level: 4, name: "Language Enthusiast", xpRequired: 600, icon: "🔥", color: "#f59e0b" },
    { level: 5, name: "Fluency Seeker", xpRequired: 1000, icon: "⭐", color: "#ec4899" },
    { level: 6, name: "Master Communicator", xpRequired: 1500, icon: "💎", color: "#8b5cf6" },
    { level: 7, name: "Language Guru", xpRequired: 2200, icon: "👑", color: "#ef4444" },
    { level: 8, name: "Polyglot Pro", xpRequired: 3000, icon: "🏆", color: "#14b8a6" },
    { level: 9, name: "Global Citizen", xpRequired: 4000, icon: "🌍", color: "#f97316" },
    { level: 10, name: "Language Legend", xpRequired: 5500, icon: "🚀", color: "#dc2626" }
  ]

  let currentLevel = levels[0]
  let nextLevel = levels[1]

  for (let i = 0; i < levels.length; i++) {
    if (totalXp >= levels[i].xpRequired) {
      currentLevel = levels[i]
      nextLevel = levels[i + 1] || levels[i]
    } else {
      break
    }
  }

  const xpToNext = nextLevel ? nextLevel.xpRequired - totalXp : 0

  return {
    current: currentLevel.level,
    name: currentLevel.name,
    xp: totalXp - currentLevel.xpRequired,
    xpToNext: Math.max(xpToNext, 0),
    totalXp,
    icon: currentLevel.icon,
    color: currentLevel.color
  }
}

/**
 * Calculates XP earned from practice session
 */
export function calculateSessionXP(sessionData: {
  duration: number
  recordingsMade: number
  loopsCompleted: number
  vocabularyLearned: number
  streakDay: number
}): number {
  let xp = 0

  // Base XP from practice time (1 XP per minute)
  xp += Math.floor(sessionData.duration / 60)

  // Bonus for recordings (5 XP per recording)
  xp += sessionData.recordingsMade * 5

  // Bonus for completed loops (3 XP per loop)
  xp += sessionData.loopsCompleted * 3

  // Bonus for vocabulary (2 XP per word)
  xp += sessionData.vocabularyLearned * 2

  // Streak multiplier
  if (sessionData.streakDay > 1) {
    const multiplier = Math.min(1 + (sessionData.streakDay - 1) * 0.1, 2.0) // Max 2x
    xp = Math.floor(xp * multiplier)
  }

  return xp
}

/**
 * Generates achievements based on user activity
 */
export function checkForNewAchievements(
  user: FluentFlowUser,
  recentActivity: {
    sessionCompleted: boolean
    streakExtended: boolean
    newStreakRecord: boolean
    challengeCompleted: boolean
    friendHelped: boolean
    milestoneReached: boolean
  }
): Achievement[] {
  const newAchievements: Achievement[] = []
  const now = new Date()

  // Streak achievements
  if (recentActivity.streakExtended) {
    const streakMilestones = [7, 14, 30, 60, 100, 365]
    for (const milestone of streakMilestones) {
      if (user.stats.currentStreak === milestone) {
        newAchievements.push({
          id: `streak_${milestone}`,
          type: 'streak',
          name: `${milestone}-Day Streak!`,
          description: `Practiced for ${milestone} consecutive days`,
          icon: milestone >= 100 ? '🔥' : milestone >= 30 ? '⚡' : '🌟',
          rarity: milestone >= 100 ? 'legendary' : milestone >= 30 ? 'epic' : 'rare',
          unlockedAt: now,
          xpReward: milestone * 2
        })
      }
    }
  }

  // Practice time milestones
  if (recentActivity.milestoneReached) {
    const timeMilestones = [3600, 18000, 36000, 108000] // 1h, 5h, 10h, 30h
    for (const milestone of timeMilestones) {
      if (user.stats.totalPracticeTime >= milestone && 
          user.stats.totalPracticeTime - milestone < 1800) { // Within last 30 min
        const hours = Math.floor(milestone / 3600)
        newAchievements.push({
          id: `practice_time_${hours}h`,
          type: 'milestone',
          name: `${hours} Hour${hours > 1 ? 's' : ''} Practiced!`,
          description: `Completed ${hours} total hours of practice`,
          icon: hours >= 30 ? '💎' : hours >= 10 ? '🏆' : '⭐',
          rarity: hours >= 30 ? 'legendary' : hours >= 10 ? 'epic' : 'rare',
          unlockedAt: now,
          xpReward: hours * 50
        })
      }
    }
  }

  // Social achievements
  if (recentActivity.friendHelped) {
    const helpMilestones = [5, 10, 25, 50]
    for (const milestone of helpMilestones) {
      if (user.stats.friendsHelped === milestone) {
        newAchievements.push({
          id: `helper_${milestone}`,
          type: 'social',
          name: `Helpful Friend`,
          description: `Helped ${milestone} fellow learners`,
          icon: '🤝',
          rarity: milestone >= 50 ? 'legendary' : milestone >= 25 ? 'epic' : 'rare',
          unlockedAt: now,
          xpReward: milestone * 10
        })
      }
    }
  }

  return newAchievements
}

/**
 * Calculates compatibility score between users for study group matching
 */
export function calculateUserCompatibility(user1: FluentFlowUser, user2: FluentFlowUser): number {
  let score = 0

  // Language compatibility (40 points)
  const sharedLearningLanguages = user1.languagePreferences.learning.filter(lang =>
    user2.languagePreferences.learning.includes(lang)
  )
  const languageHelp = user1.languagePreferences.native.some(lang =>
    user2.languagePreferences.learning.includes(lang)
  ) || user2.languagePreferences.native.some(lang =>
    user1.languagePreferences.learning.includes(lang)
  )

  score += sharedLearningLanguages.length * 20
  if (languageHelp) score += 20

  // Level similarity (30 points)
  const levelDiff = Math.abs(user1.level.current - user2.level.current)
  if (levelDiff === 0) score += 30
  else if (levelDiff === 1) score += 20
  else if (levelDiff === 2) score += 10

  // Activity level similarity (20 points)
  const avgSession1 = user1.stats.averageSessionTime
  const avgSession2 = user2.stats.averageSessionTime
  const sessionDiff = Math.abs(avgSession1 - avgSession2) / Math.max(avgSession1, avgSession2)
  score += Math.max(0, 20 - Math.floor(sessionDiff * 20))

  // Timezone compatibility (10 points) - simplified
  // In a real implementation, you'd use actual timezone data
  score += 10 // Assume compatible for now

  return Math.min(score, 100)
}

/**
 * Generates leaderboard entries for different metrics
 */
export function generateLeaderboard(
  users: FluentFlowUser[],
  metric: Leaderboard['metric'],
  timeframe: Leaderboard['timeframe']
): LeaderboardEntry[] {
  const getValue = (user: FluentFlowUser): number => {
    switch (metric) {
      case 'practice_time': return user.stats.totalPracticeTime
      case 'streak': return user.stats.currentStreak
      case 'xp': return user.level.totalXp
      case 'sessions': return user.stats.totalSessions
      case 'vocabulary': return user.stats.vocabularyLearned
      default: return 0
    }
  }

  return users
    .filter(user => user.preferences.showOnLeaderboard)
    .map(user => ({
      rank: 0, // Will be set after sorting
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      value: getValue(user),
      change: 0, // Would need historical data
      level: user.level.current
    }))
    .sort((a, b) => b.value - a.value)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))
    .slice(0, 100) // Top 100
}

/**
 * Validates challenge parameters
 */
export function validateChallenge(challenge: Omit<GroupChallenge, 'id' | 'participants' | 'status'>): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!challenge.title.trim()) {
    errors.push('Challenge title is required')
  }

  if (challenge.target <= 0) {
    errors.push('Challenge target must be positive')
  }

  if (challenge.duration <= 0) {
    errors.push('Challenge duration must be positive')
  }

  if (challenge.startDate >= challenge.endDate) {
    errors.push('End date must be after start date')
  }

  const now = new Date()
  if (challenge.startDate <= now) {
    errors.push('Start date must be in the future')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Formats display values for different metrics
 */
export function formatMetricValue(value: number, metric: string): string {
  switch (metric) {
    case 'practice_time':
      const hours = Math.floor(value / 3600)
      const minutes = Math.floor((value % 3600) / 60)
      if (hours > 0) return `${hours}h ${minutes}m`
      return `${minutes}m`
    
    case 'streak':
      return `${value} day${value !== 1 ? 's' : ''}`
    
    case 'xp':
      return `${value.toLocaleString()} XP`
    
    case 'sessions':
      return `${value} session${value !== 1 ? 's' : ''}`
    
    case 'vocabulary':
      return `${value} word${value !== 1 ? 's' : ''}`
    
    default:
      return value.toString()
  }
}