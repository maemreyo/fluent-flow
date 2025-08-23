// Social Service - Data Layer
// Following SoC: Handles real-time communication and social data persistence

import {
  calculateUserLevel,
  calculateSessionXP,
  checkForNewAchievements,
  generateLeaderboard,
  type FluentFlowUser,
  type StudyGroup,
  type GroupChallenge,
  type ChatMessage,
  type Leaderboard,
  type SocialNotification,
  type UserStats
} from '../utils/social-features'

// Mock Firebase implementation - In production, use actual Firebase SDK
interface FirebaseConfig {
  apiKey: string
  authDomain: string
  databaseURL: string
  projectId: string
}

export class SocialService {
  private readonly userKey = 'fluent_flow_social_user'
  private readonly usersCollection = 'users'
  private readonly groupsCollection = 'study_groups'
  private readonly messagesCollection = 'messages'
  private readonly leaderboardsCollection = 'leaderboards'
  private readonly notificationsCollection = 'notifications'
  
  // Real-time listeners
  private realtimeListeners: Map<string, (data: any) => void> = new Map()
  private simulatedFirebase: Map<string, any> = new Map()

  constructor(private config?: FirebaseConfig) {
    // Initialize with mock data for development
    this.initializeMockData()
  }

  /**
   * Initializes current user profile
   */
  async initializeUser(userData: {
    email: string
    displayName: string
    languagePreferences: FluentFlowUser['languagePreferences']
  }): Promise<FluentFlowUser> {
    try {
      const existingUser = await this.getCurrentUser()
      if (existingUser) return existingUser

      const newUser: FluentFlowUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        username: userData.displayName.toLowerCase().replace(/\s+/g, '_'),
        displayName: userData.displayName,
        email: userData.email,
        languagePreferences: userData.languagePreferences,
        joinedAt: new Date(),
        lastSeen: new Date(),
        isOnline: true,
        preferences: {
          publicProfile: true,
          shareProgress: true,
          acceptChallenges: true,
          showOnLeaderboard: true
        },
        stats: {
          totalPracticeTime: 0,
          totalSessions: 0,
          currentStreak: 0,
          longestStreak: 0,
          videosCompleted: 0,
          averageSessionTime: 0,
          vocabularyLearned: 0,
          recordingsMade: 0,
          challengesCompleted: 0,
          friendsHelped: 0
        },
        level: calculateUserLevel(0),
        achievements: []
      }

      await this.saveUser(newUser)
      await chrome.storage.local.set({ [this.userKey]: newUser })
      
      return newUser
    } catch (error) {
      console.error('Failed to initialize user:', error)
      throw new Error('Failed to initialize user profile')
    }
  }

  /**
   * Gets current user from local storage
   */
  async getCurrentUser(): Promise<FluentFlowUser | null> {
    try {
      const result = await chrome.storage.local.get([this.userKey])
      const userData = result[this.userKey]
      
      if (!userData) return null
      
      // Parse dates back from JSON
      return {
        ...userData,
        joinedAt: new Date(userData.joinedAt),
        lastSeen: new Date(userData.lastSeen),
        achievements: userData.achievements.map((ach: any) => ({
          ...ach,
          unlockedAt: new Date(ach.unlockedAt)
        }))
      }
    } catch (error) {
      console.error('Failed to get current user:', error)
      return null
    }
  }

  /**
   * Updates user stats after practice session
   */
  async updateUserStats(sessionData: {
    duration: number
    recordingsMade: number
    loopsCompleted: number
    vocabularyLearned: number
    streakDay: number
  }): Promise<FluentFlowUser | null> {
    try {
      const user = await this.getCurrentUser()
      if (!user) return null

      // Calculate XP earned
      const xpEarned = calculateSessionXP(sessionData)
      
      // Update stats
      const updatedStats: UserStats = {
        ...user.stats,
        totalPracticeTime: user.stats.totalPracticeTime + sessionData.duration,
        totalSessions: user.stats.totalSessions + 1,
        currentStreak: sessionData.streakDay,
        longestStreak: Math.max(user.stats.longestStreak, sessionData.streakDay),
        vocabularyLearned: user.stats.vocabularyLearned + sessionData.vocabularyLearned,
        recordingsMade: user.stats.recordingsMade + sessionData.recordingsMade,
        averageSessionTime: Math.floor(
          (user.stats.totalPracticeTime + sessionData.duration) / (user.stats.totalSessions + 1)
        )
      }

      // Check for new achievements
      const newAchievements = checkForNewAchievements(user, {
        sessionCompleted: true,
        streakExtended: sessionData.streakDay > user.stats.currentStreak,
        newStreakRecord: sessionData.streakDay > user.stats.longestStreak,
        challengeCompleted: false, // Would be determined elsewhere
        friendHelped: false,
        milestoneReached: true
      })

      // Calculate new level
      const newTotalXp = user.level.totalXp + xpEarned + newAchievements.reduce((acc, ach) => acc + ach.xpReward, 0)
      const newLevel = calculateUserLevel(newTotalXp)

      const updatedUser: FluentFlowUser = {
        ...user,
        stats: updatedStats,
        level: newLevel,
        achievements: [...user.achievements, ...newAchievements],
        lastSeen: new Date()
      }

      await this.saveUser(updatedUser)
      await chrome.storage.local.set({ [this.userKey]: updatedUser })

      // Send notifications for achievements
      if (newAchievements.length > 0) {
        await this.createNotifications(newAchievements.map(ach => ({
          id: `ach_${ach.id}_${Date.now()}`,
          userId: user.id,
          type: 'achievement' as const,
          title: 'Achievement Unlocked!',
          message: `${ach.name}: ${ach.description}`,
          data: { achievement: ach },
          read: false,
          createdAt: new Date()
        })))
      }

      return updatedUser
    } catch (error) {
      console.error('Failed to update user stats:', error)
      return null
    }
  }

  /**
   * Gets study groups user is member of
   */
  async getUserStudyGroups(): Promise<StudyGroup[]> {
    try {
      const user = await this.getCurrentUser()
      if (!user) return []

      // In production, this would query Firebase
      const allGroups = Array.from(this.simulatedFirebase.values())
        .filter(item => item.type === 'study_group') as StudyGroup[]

      return allGroups.filter(group => 
        group.members.some(member => member.userId === user.id)
      )
    } catch (error) {
      console.error('Failed to get user study groups:', error)
      return []
    }
  }

  /**
   * Creates a new study group
   */
  async createStudyGroup(groupData: {
    name: string
    description: string
    language: string
    level: StudyGroup['level']
    isPrivate: boolean
    tags: string[]
  }): Promise<string> {
    try {
      const user = await this.getCurrentUser()
      if (!user) throw new Error('User not authenticated')

      const newGroup: StudyGroup = {
        id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        name: groupData.name,
        description: groupData.description,
        language: groupData.language,
        level: groupData.level,
        createdBy: user.id,
        createdAt: new Date(),
        members: [{
          userId: user.id,
          username: user.username,
          avatar: user.avatar,
          role: 'owner',
          joinedAt: new Date(),
          contribution: 0,
          lastActive: new Date()
        }],
        maxMembers: 20,
        isPrivate: groupData.isPrivate,
        tags: groupData.tags,
        stats: {
          totalSessions: 0,
          avgProgress: 0,
          mostActiveDay: 'Monday'
        }
      }

      await this.saveStudyGroup(newGroup)
      return newGroup.id
    } catch (error) {
      console.error('Failed to create study group:', error)
      throw new Error('Failed to create study group')
    }
  }

  /**
   * Joins a study group
   */
  async joinStudyGroup(groupId: string): Promise<boolean> {
    try {
      const user = await this.getCurrentUser()
      if (!user) return false

      const group = await this.getStudyGroup(groupId)
      if (!group || group.members.length >= group.maxMembers) return false

      // Check if already member
      if (group.members.some(member => member.userId === user.id)) return true

      group.members.push({
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        role: 'member',
        joinedAt: new Date(),
        contribution: 0,
        lastActive: new Date()
      })

      await this.saveStudyGroup(group)
      
      // Notify group members
      const welcomeMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        groupId: groupId,
        senderId: 'system',
        senderName: 'FluentFlow',
        content: `${user.displayName} joined the group! 👋`,
        type: 'system',
        timestamp: new Date()
      }

      await this.sendMessage(welcomeMessage)
      return true
    } catch (error) {
      console.error('Failed to join study group:', error)
      return false
    }
  }

  /**
   * Sends a chat message to a group
   */
  async sendMessage(message: ChatMessage): Promise<boolean> {
    try {
      // Save message (in production, use Firebase)
      this.simulatedFirebase.set(`message_${message.id}`, {
        type: 'message',
        ...message
      })

      // Trigger real-time listeners
      this.triggerRealtimeUpdate(`group_${message.groupId}_messages`, message)
      
      return true
    } catch (error) {
      console.error('Failed to send message:', error)
      return false
    }
  }

  /**
   * Gets chat messages for a group
   */
  async getGroupMessages(groupId: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      // In production, query Firebase with pagination
      const allMessages = Array.from(this.simulatedFirebase.values())
        .filter(item => item.type === 'message' && item.groupId === groupId)
        .map(item => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit)
        .reverse()

      return allMessages
    } catch (error) {
      console.error('Failed to get group messages:', error)
      return []
    }
  }

  /**
   * Gets current leaderboard
   */
  async getLeaderboard(
    type: Leaderboard['type'], 
    metric: Leaderboard['metric'],
    timeframe: Leaderboard['timeframe']
  ): Promise<Leaderboard> {
    try {
      // In production, this would be calculated server-side
      const users = await this.getAllUsers()
      const entries = generateLeaderboard(users, metric, timeframe)

      return {
        id: `leaderboard_${type}_${metric}_${timeframe}`,
        type,
        timeframe,
        metric,
        entries,
        lastUpdated: new Date()
      }
    } catch (error) {
      console.error('Failed to get leaderboard:', error)
      return {
        id: 'empty',
        type,
        timeframe,
        metric,
        entries: [],
        lastUpdated: new Date()
      }
    }
  }

  /**
   * Gets user notifications
   */
  async getUserNotifications(): Promise<SocialNotification[]> {
    try {
      const user = await this.getCurrentUser()
      if (!user) return []

      const allNotifications = Array.from(this.simulatedFirebase.values())
        .filter(item => item.type === 'notification' && item.userId === user.id)
        .map(item => ({
          ...item,
          createdAt: new Date(item.createdAt),
          expiresAt: item.expiresAt ? new Date(item.expiresAt) : undefined
        }))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 20)

      return allNotifications
    } catch (error) {
      console.error('Failed to get notifications:', error)
      return []
    }
  }

  /**
   * Sets up real-time listener for data changes
   */
  onRealtimeUpdate(path: string, callback: (data: any) => void): () => void {
    this.realtimeListeners.set(path, callback)
    
    // Return cleanup function
    return () => {
      this.realtimeListeners.delete(path)
    }
  }

  /**
   * Private helper methods
   */
  private async saveUser(user: FluentFlowUser): Promise<void> {
    this.simulatedFirebase.set(`user_${user.id}`, { type: 'user', ...user })
  }

  private async saveStudyGroup(group: StudyGroup): Promise<void> {
    this.simulatedFirebase.set(`group_${group.id}`, { type: 'study_group', ...group })
  }

  private async getStudyGroup(groupId: string): Promise<StudyGroup | null> {
    const groupData = this.simulatedFirebase.get(`group_${groupId}`)
    if (!groupData || groupData.type !== 'study_group') return null

    return {
      ...groupData,
      createdAt: new Date(groupData.createdAt),
      members: groupData.members.map((member: any) => ({
        ...member,
        joinedAt: new Date(member.joinedAt),
        lastActive: new Date(member.lastActive)
      }))
    }
  }

  private async getAllUsers(): Promise<FluentFlowUser[]> {
    return Array.from(this.simulatedFirebase.values())
      .filter(item => item.type === 'user')
      .map(user => ({
        ...user,
        joinedAt: new Date(user.joinedAt),
        lastSeen: new Date(user.lastSeen)
      }))
  }

  private async createNotifications(notifications: SocialNotification[]): Promise<void> {
    notifications.forEach(notification => {
      this.simulatedFirebase.set(`notification_${notification.id}`, {
        type: 'notification',
        ...notification
      })
    })
  }

  private triggerRealtimeUpdate(path: string, data: any): void {
    const listener = this.realtimeListeners.get(path)
    if (listener) {
      // Simulate real-time delay
      setTimeout(() => listener(data), 100)
    }
  }

  private initializeMockData(): void {
    // Initialize with some sample data for development
    const sampleUsers: FluentFlowUser[] = [
      {
        id: 'user_sample_1',
        username: 'language_lover',
        displayName: 'Language Lover',
        email: 'lover@example.com',
        avatar: '🌟',
        languagePreferences: { learning: ['English'], native: ['Spanish'] },
        joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        isOnline: false,
        preferences: { publicProfile: true, shareProgress: true, acceptChallenges: true, showOnLeaderboard: true },
        stats: { totalPracticeTime: 7200, totalSessions: 15, currentStreak: 5, longestStreak: 12, videosCompleted: 8, averageSessionTime: 480, vocabularyLearned: 45, recordingsMade: 12, challengesCompleted: 2, friendsHelped: 3 },
        level: calculateUserLevel(1250),
        achievements: []
      }
    ]

    sampleUsers.forEach(user => {
      this.simulatedFirebase.set(`user_${user.id}`, { type: 'user', ...user })
    })
  }
}

// Singleton instance
export const socialService = new SocialService()