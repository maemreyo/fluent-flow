// Social Integration Service - Integration Layer
// Following SoC: Handles real-time updates and integration between social features and core FluentFlow

import { socialService } from './social-service'
import type { 
  FluentFlowUser, 
  SocialNotification,
  ChatMessage,
  StudyGroup
} from '../utils/social-features'
import { calculateSessionXP } from '../utils/social-features'

export class SocialIntegrationService {
  private realtimeListeners: Map<string, () => void> = new Map()
  private notificationQueue: SocialNotification[] = []

  /**
   * Initializes social features integration
   */
  async initialize(userData: {
    email: string
    displayName: string
    languagePreferences: FluentFlowUser['languagePreferences']
  }): Promise<FluentFlowUser | null> {
    try {
      const user = null // initializeUser not implemented
      if (user) {
        this.setupRealtimeListeners(user.id)
      }
      return user
    } catch (error) {
      console.error('Failed to initialize social integration:', error)
      return null
    }
  }

  /**
   * Updates user progress and triggers social features
   */
  async updateProgress(sessionData: {
    duration: number
    recordingsMade: number
    loopsCompleted: number
    vocabularyLearned: number
    streakDay: number
  }): Promise<void> {
    try {
      const updatedUser = null // updateUserStats not implemented
      if (updatedUser) {
        // Trigger real-time updates for study groups
        const userGroups = await socialService.getStudyGroups()
        for (const group of userGroups) {
          this.broadcastUserProgress(group.id, updatedUser, sessionData)
        }
      }
    } catch (error) {
      console.error('Failed to update social progress:', error)
    }
  }

  /**
   * Handles practice session completion with social features
   */
  async onPracticeSessionComplete(sessionData: {
    duration: number
    recordingsMade: number
    loopsCompleted: number
    vocabularyLearned: number
    streakDay: number
    videoId?: string
    videoTitle?: string
  }): Promise<void> {
    try {
      // Update user stats (this handles achievements automatically)
      await this.updateProgress(sessionData)
      
      // Share practice milestone in study groups
      if (sessionData.duration > 1800) { // 30+ minutes
        await this.shareSessionMilestone(sessionData)
      }

      // Check for level up and celebrate
      const user = null // getCurrentUser not implemented
      if (user) {
        const xpEarned = calculateSessionXP(sessionData)
        await this.checkForLevelUp(user, xpEarned)
      }
    } catch (error) {
      console.error('Failed to process social session completion:', error)
    }
  }

  /**
   * Shares video recommendation with study groups
   */
  async shareVideoRecommendation(videoId: string, videoTitle: string, note?: string): Promise<void> {
    try {
      const user = null // getCurrentUser not implemented
      if (!user) return

      const userGroups = await socialService.getStudyGroups()
      
      for (const group of userGroups) {
        const message: ChatMessage = {
          id: `share_${videoId}_${Date.now()}`,
          groupId: group.id,
          senderId: user.id,
          senderName: user.displayName,
          senderAvatar: user.avatar,
          content: note || `Check out this video: ${videoTitle}`,
          type: 'video_share',
          timestamp: new Date(),
          metadata: {
            videoId,
            videoTitle
          }
        }

        false // sendMessage not implemented
      }
    } catch (error) {
      console.error('Failed to share video recommendation:', error)
    }
  }

  /**
   * Gets aggregated social data for dashboard
   */
  async getSocialDashboardData(): Promise<{
    user: FluentFlowUser | null
    studyGroups: StudyGroup[]
    unreadNotifications: number
    recentActivity: ChatMessage[]
  }> {
    try {
      const [user, groups, notifications] = await Promise.all([
        Promise.resolve(null), // getCurrentUser not implemented
        socialService.getStudyGroups(),
        Promise.resolve([]) // getUserNotifications not implemented
      ])

      const recentActivity: ChatMessage[] = []
      for (const group of groups.slice(0, 3)) { // Get recent messages from top 3 groups
        const messages = [] // getGroupMessages not implemented
        recentActivity.push(...messages)
      }

      // Sort by timestamp and take most recent
      recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

      return {
        user,
        studyGroups: groups,
        unreadNotifications: notifications.filter(n => !n.read).length,
        recentActivity: recentActivity.slice(0, 10)
      }
    } catch (error) {
      console.error('Failed to get social dashboard data:', error)
      return {
        user: null,
        studyGroups: [],
        unreadNotifications: 0,
        recentActivity: []
      }
    }
  }

  /**
   * Sets up real-time listeners for user's social data
   */
  private setupRealtimeListeners(userId: string): void {
    // Listen for new messages in user's groups
    // Message listener not implemented
    const messageListener = () => {}

    // Listen for notifications
    // Notification listener not implemented
    const notificationListener = () => {}

    // Store cleanup functions
    this.realtimeListeners.set('messages', messageListener)
    this.realtimeListeners.set('notifications', notificationListener)
  }

  /**
   * Handles new incoming messages
   */
  private handleNewMessage(message: ChatMessage): void {
    // Show browser notification for mentions or important messages
    if (message.type === 'challenge_update' || message.content.includes('@')) {
      this.showBrowserNotification({
        title: `New message in ${message.groupId}`,
        body: `${message.senderName}: ${message.content}`,
        icon: '/icons/icon-128.png'
      })
    }
  }

  /**
   * Handles new notifications
   */
  private handleNewNotification(notification: SocialNotification): void {
    this.notificationQueue.push(notification)
    
    // Show browser notification
    this.showBrowserNotification({
      title: notification.title,
      body: notification.message,
      icon: '/icons/icon-128.png'
    })
  }

  /**
   * Broadcasts user progress to study group
   */
  private async broadcastUserProgress(
    groupId: string,
    user: FluentFlowUser,
    sessionData: { duration: number; streakDay: number }
  ): Promise<void> {
    if (sessionData.duration > 900) { // Only broadcast sessions > 15 minutes
      const message: ChatMessage = {
        id: `progress_${user.id}_${Date.now()}`,
        groupId,
        senderId: user.id,
        senderName: user.displayName,
        senderAvatar: user.avatar,
        content: `Just completed a ${Math.floor(sessionData.duration / 60)} minute practice session! 🎉 ${
          sessionData.streakDay > 1 ? `Day ${sessionData.streakDay} streak! 🔥` : ''
        }`,
        type: 'achievement',
        timestamp: new Date()
      }

      false // sendMessage not implemented
    }
  }

  /**
   * Shares significant practice milestones
   */
  private async shareSessionMilestone(sessionData: {
    duration: number
    videoTitle?: string
  }): Promise<void> {
    const user = null // getCurrentUser not implemented
    if (!user) return

    const hours = Math.floor(sessionData.duration / 3600)
    const minutes = Math.floor((sessionData.duration % 3600) / 60)
    
    let milestoneMessage = ''
    if (hours >= 1) {
      milestoneMessage = `Wow! Just completed a ${hours}h ${minutes}m practice session! 💪`
    } else if (minutes >= 45) {
      milestoneMessage = `Great focus! Just finished a ${minutes} minute practice session! 🎯`
    }

    if (milestoneMessage) {
      const groups = await socialService.getStudyGroups()
      for (const group of groups.slice(0, 2)) { // Share with top 2 groups
        const message: ChatMessage = {
          id: `milestone_${user.id}_${Date.now()}`,
          groupId: group.id,
          senderId: user.id,
          senderName: user.displayName,
          senderAvatar: user.avatar,
          content: milestoneMessage,
          type: 'achievement',
          timestamp: new Date()
        }

        false // sendMessage not implemented
      }
    }
  }

  /**
   * Checks for level up and celebrates
   */
  private async checkForLevelUp(user: FluentFlowUser, xpEarned: number): Promise<void> {
    const currentLevel = user.level.current
    const newTotalXp = user.level.totalXp + xpEarned
    
    // Simple level calculation (this should match the one in social-features.ts)
    const levelThresholds = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500]
    let newLevel = 1
    
    for (let i = 0; i < levelThresholds.length; i++) {
      if (newTotalXp >= levelThresholds[i]) {
        newLevel = i + 1
      }
    }

    if (newLevel > currentLevel) {
      // Level up! Share with study groups
      const groups = await socialService.getStudyGroups()
      for (const group of groups) {
        const message: ChatMessage = {
          id: `levelup_${user.id}_${Date.now()}`,
          groupId: group.id,
          senderId: user.id,
          senderName: user.displayName,
          senderAvatar: user.avatar,
          content: `🎉 Level up! I just reached Level ${newLevel}! 🚀`,
          type: 'achievement',
          timestamp: new Date()
        }

        false // sendMessage not implemented
      }
    }
  }

  /**
   * Shows browser notification
   */
  private showBrowserNotification(options: {
    title: string
    body: string
    icon: string
  }): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(options.title, {
        body: options.body,
        icon: options.icon
      })
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    // Clean up real-time listeners
    for (const cleanup of this.realtimeListeners.values()) {
      cleanup()
    }
    this.realtimeListeners.clear()
    this.notificationQueue = []
  }
}

// Singleton instance
export const socialIntegrationService = new SocialIntegrationService()