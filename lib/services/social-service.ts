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

// Firebase config interface for future compatibility
interface FirebaseConfig {
  apiKey: string
  authDomain: string
  databaseURL: string
  projectId: string
}

export class SocialService {
  private readonly userKey = 'fluent_flow_social_user'
  
  // Collection names for Firebase (unused in Supabase implementation)
  private readonly usersCollection = 'users'
  private readonly groupsCollection = 'study_groups'
  private readonly messagesCollection = 'messages'
  private readonly leaderboardsCollection = 'leaderboards'
  private readonly notificationsCollection = 'notifications'
  
  // Real-time listeners
  private realtimeListeners: Map<string, (data: any) => void> = new Map()

  constructor(private config?: FirebaseConfig) {
    // Supabase handles initialization
  }

  /**
   * Initializes current user profile in Supabase
   */
  async initializeUser(userData: {
    email: string
    displayName: string
    languagePreferences: FluentFlowUser['languagePreferences']
  }): Promise<FluentFlowUser> {
    try {
      const existingUser = await this.getCurrentUser()
      if (existingUser) return existingUser

      const { supabase, getCurrentUser } = await import('../supabase/client')
      
      const currentUser = await getCurrentUser()
      const userId = currentUser?.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      
      const newUser: FluentFlowUser = {
        id: userId,
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

      // Save to Supabase
      const { error } = await supabase
        .from('user_social_profiles')
        .insert({
          username: newUser.username,
          display_name: newUser.displayName,
          avatar: newUser.avatar,
          language_preferences: newUser.languagePreferences,
          preferences: newUser.preferences,
          stats: newUser.stats,
          level_data: newUser.level,
          achievements: newUser.achievements
        } as any)

      if (error) throw error

      // Keep local cache for quick access
      await chrome.storage.local.set({ [this.userKey]: newUser })
      
      return newUser
    } catch (error) {
      console.error('Failed to initialize user:', error)
      throw new Error('Failed to initialize user profile')
    }
  }

  /**
   * Gets current user from Supabase
   */
  async getCurrentUser(): Promise<FluentFlowUser | null> {
    try {
      const { supabase } = await import('../supabase/client')
      
      const { data, error } = await supabase
        .from('user_social_profiles')
        .select('*')
        .single()

      if (error) {
        // Fallback to Chrome storage for first-time users
        const result = await chrome.storage.local.get([this.userKey])
        const userData = result[this.userKey]
        
        if (!userData) return null
        
        return {
          ...userData,
          joinedAt: new Date(userData.joinedAt),
          lastSeen: new Date(userData.lastSeen),
          achievements: userData.achievements.map((ach: any) => ({
            ...ach,
            unlockedAt: new Date(ach.unlockedAt)
          }))
        }
      }

      return {
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        email: data.user_id, // User email from auth system
        avatar: data.avatar,
        languagePreferences: (typeof data.language_preferences === 'object' && data.language_preferences !== null) 
          ? data.language_preferences as { learning: string[]; native: string[] }
          : { learning: [], native: [] },
        joinedAt: new Date(data.created_at),
        lastSeen: new Date(data.last_seen),
        isOnline: data.is_online,
        preferences: (typeof data.preferences === 'object' && data.preferences !== null) 
          ? data.preferences as any : {},
        stats: (typeof data.stats === 'object' && data.stats !== null) 
          ? data.stats as any : { totalXp: 0, practiceStreak: 0, sessionsCompleted: 0 },
        level: (typeof data.level_data === 'object' && data.level_data !== null) 
          ? data.level_data as any : { currentLevel: 1, totalXp: 0, xpToNextLevel: 100 },
        achievements: [] // Empty for now - will be loaded separately if needed
      }
    } catch (error) {
      console.error('Failed to get current user:', error)
      return null
    }
  }

  /**
   * Updates user stats after practice session in Supabase
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

      const { supabase } = await import('../supabase/client')

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
        challengeCompleted: false,
        friendHelped: false,
        milestoneReached: true
      })

      // Calculate new level
      const newTotalXp = user.level.totalXp + xpEarned + newAchievements.reduce((acc, ach) => acc + ach.xpReward, 0)
      const newLevel = calculateUserLevel(newTotalXp)

      // Update in Supabase
      const { error } = await supabase
        .from('user_social_profiles')
        .update({
          stats: updatedStats as any,
          level_data: newLevel as any,
          last_seen: new Date().toISOString(),
          is_online: true
        })
        .eq('user_id', user.id)

      if (error) throw error

      // Save achievements to separate table
      if (newAchievements.length > 0) {
        const achievementInserts = newAchievements.map(ach => ({
          user_id: user.id,
          achievement_id: ach.id,
          type: ach.type,
          name: ach.name,
          description: ach.description,
          icon: ach.icon,
          rarity: ach.rarity,
          xp_reward: ach.xpReward
        }))

        await supabase
          .from('user_achievements')
          .insert(achievementInserts)

        // Create notifications for achievements
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

      const updatedUser: FluentFlowUser = {
        ...user,
        stats: updatedStats,
        level: newLevel,
        achievements: [...user.achievements, ...newAchievements],
        lastSeen: new Date()
      }

      // Update local cache
      await chrome.storage.local.set({ [this.userKey]: updatedUser })

      return updatedUser
    } catch (error) {
      console.error('Failed to update user stats:', error)
      return null
    }
  }

  /**
   * Gets study groups user is member of from Supabase
   */
  async getUserStudyGroups(): Promise<StudyGroup[]> {
    try {
      const user = await this.getCurrentUser()
      if (!user) return []

      const { supabase } = await import('../supabase/client')

      // First get the group IDs for this user
      const { data: memberData, error: memberError } = await supabase
        .from('study_group_members')
        .select('group_id')
        .eq('user_id', user.id)

      if (memberError) throw memberError

      const groupIds = memberData?.map(m => m.group_id) || []
      if (groupIds.length === 0) return []

      // Then get the groups with their members
      const { data, error } = await supabase
        .from('study_groups')
        .select(`
          *,
          study_group_members(*)
        `)
        .in('id', groupIds)

      if (error) throw error

      return (data || []).map(group => ({
        id: group.id,
        name: group.name,
        description: group.description,
        language: group.language,
        level: group.level as StudyGroup['level'],
        createdBy: group.created_by,
        createdAt: new Date(group.created_at),
        members: group.study_group_members.map((member: any) => ({
          userId: member.user_id,
          username: member.username,
          avatar: member.avatar,
          role: member.role,
          joinedAt: new Date(member.joined_at),
          contribution: member.contribution,
          lastActive: new Date(member.last_active)
        })),
        maxMembers: group.max_members,
        isPrivate: group.is_private,
        tags: group.tags || [],
        stats: typeof group.stats === 'object' && group.stats !== null 
          ? group.stats as any 
          : { totalSessions: 0, avgProgress: 0, mostActiveDay: 'monday' }
      }))
    } catch (error) {
      console.error('Failed to get user study groups:', error)
      return []
    }
  }

  /**
   * Creates a new study group in Supabase
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

      const { supabase } = await import('../supabase/client')

      const { data: groupResult, error: groupError } = await supabase
        .from('study_groups')
        .insert({
          name: groupData.name,
          description: groupData.description,
          language: groupData.language,
          level: groupData.level,
          created_by: user.id,
          is_private: groupData.isPrivate,
          tags: groupData.tags
        })
        .select('id')
        .single()

      if (groupError) throw groupError

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('study_group_members')
        .insert({
          group_id: groupResult.id,
          user_id: user.id,
          username: user.username,
          avatar: user.avatar,
          role: 'owner'
        })

      if (memberError) throw memberError

      return groupResult.id
    } catch (error) {
      console.error('Failed to create study group:', error)
      throw new Error('Failed to create study group')
    }
  }

  /**
   * Joins a study group in Supabase
   */
  async joinStudyGroup(groupId: string): Promise<boolean> {
    try {
      const user = await this.getCurrentUser()
      if (!user) return false

      const { supabase } = await import('../supabase/client')

      // Check if group exists and has space
      const { data: group, error: groupError } = await supabase
        .from('study_groups')
        .select('*, study_group_members(*)')
        .eq('id', groupId)
        .single()

      if (groupError || !group) return false
      if (group.study_group_members.length >= group.max_members) return false

      // Check if already member
      if (group.study_group_members.some((member: any) => member.user_id === user.id)) return true

      // Add as member
      const { error: memberError } = await supabase
        .from('study_group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          username: user.username,
          avatar: user.avatar,
          role: 'member'
        })

      if (memberError) throw memberError

      // Send welcome message
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
   * Sends a chat message to a group in Supabase
   */
  async sendMessage(message: ChatMessage): Promise<boolean> {
    try {
      const { supabase } = await import('../supabase/client')

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          group_id: message.groupId,
          sender_id: message.senderId,
          sender_name: message.senderName,
          sender_avatar: message.senderAvatar,
          content: message.content,
          type: message.type,
          reply_to: message.replyTo,
          metadata: message.metadata || {}
        })

      if (error) throw error

      // Trigger real-time listeners
      this.triggerRealtimeUpdate(`group_${message.groupId}_messages`, message)
      
      return true
    } catch (error) {
      console.error('Failed to send message:', error)
      return false
    }
  }

  /**
   * Gets chat messages for a group from Supabase
   */
  async getGroupMessages(groupId: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const { supabase } = await import('../supabase/client')

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || [])
        .map(msg => ({
          id: msg.id,
          groupId: msg.group_id,
          senderId: msg.sender_id,
          senderName: msg.sender_name,
          senderAvatar: msg.sender_avatar,
          content: msg.content,
          type: msg.type as ChatMessage['type'],
          timestamp: new Date(msg.timestamp),
          reactions: Array.isArray(msg.reactions) 
            ? msg.reactions.map((reaction: any) => ({
                emoji: reaction.emoji || '👍',
                users: Array.isArray(reaction.users) ? reaction.users : [],
                count: reaction.count || 0
              }))
            : [],
          replyTo: msg.reply_to || undefined,
          metadata: typeof msg.metadata === 'object' && msg.metadata !== null ? msg.metadata as any : {}
        }))
        .reverse()
    } catch (error) {
      console.error('Failed to get group messages:', error)
      return []
    }
  }

  /**
   * Gets current leaderboard from Supabase
   */
  async getLeaderboard(
    type: Leaderboard['type'], 
    metric: Leaderboard['metric'],
    timeframe: Leaderboard['timeframe']
  ): Promise<Leaderboard> {
    try {
      const { supabase } = await import('../supabase/client')

      // Get users with social profiles
      const { data, error } = await supabase
        .from('user_social_profiles')
        .select('*')
        .eq('preferences->>showOnLeaderboard', 'true')
        .order('level_data->>totalXp', { ascending: false })
        .limit(100)

      if (error) throw error

      const users: FluentFlowUser[] = (data || []).map(profile => ({
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name,
        email: '', // Not needed for leaderboard
        avatar: profile.avatar,
        languagePreferences: (typeof profile.language_preferences === 'object' && profile.language_preferences !== null) 
          ? profile.language_preferences as { learning: string[]; native: string[] }
          : { learning: [], native: [] },
        joinedAt: new Date(profile.created_at),
        lastSeen: new Date(profile.last_seen),
        isOnline: profile.is_online,
        preferences: (typeof profile.preferences === 'object' && profile.preferences !== null) 
          ? profile.preferences as any : {},
        stats: (typeof profile.stats === 'object' && profile.stats !== null) 
          ? profile.stats as any : { totalXp: 0, practiceStreak: 0, sessionsCompleted: 0 },
        level: (typeof profile.level_data === 'object' && profile.level_data !== null) 
          ? profile.level_data as any : { currentLevel: 1, totalXp: 0, xpToNextLevel: 100 },
        achievements: [] // Empty for leaderboard - achievements not needed
      }))

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
   * Gets user notifications from Supabase
   */
  async getUserNotifications(): Promise<SocialNotification[]> {
    try {
      const user = await this.getCurrentUser()
      if (!user) return []

      const { supabase } = await import('../supabase/client')

      const { data, error } = await supabase
        .from('social_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      return (data || []).map(notif => ({
        id: notif.id,
        userId: notif.user_id,
        type: notif.type as SocialNotification['type'],
        title: notif.title,
        message: notif.message,
        data: typeof notif.data === 'object' && notif.data !== null ? notif.data : {},
        read: notif.read,
        createdAt: new Date(notif.created_at),
        expiresAt: notif.expires_at ? new Date(notif.expires_at) : undefined
      }))
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
    
    // Real-time subscriptions can be implemented using Supabase channels
    // Example: supabase.channel(path).on('postgres_changes', callback).subscribe()
    // Currently using manual triggering for demonstration
    
    // Return cleanup function
    return () => {
      this.realtimeListeners.delete(path)
      // subscription.unsubscribe()
    }
  }

  /**
   * Private helper methods
   */
  private async saveUser(user: FluentFlowUser): Promise<void> {
    // This is handled by updateUserStats method now
    console.log('saveUser called - handled by updateUserStats')
  }

  private async saveStudyGroup(group: StudyGroup): Promise<void> {
    // This is handled by createStudyGroup/updateStudyGroup methods now
    console.log('saveStudyGroup called - handled by individual operations')
  }

  private async getStudyGroup(groupId: string): Promise<StudyGroup | null> {
    try {
      const { supabase } = await import('../supabase/client')

      const { data, error } = await supabase
        .from('study_groups')
        .select(`
          *,
          study_group_members(*)
        `)
        .eq('id', groupId)
        .single()

      if (error || !data) return null

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        language: data.language,
        level: data.level as StudyGroup['level'],
        createdBy: data.created_by,
        createdAt: new Date(data.created_at),
        members: data.study_group_members.map((member: any) => ({
          userId: member.user_id,
          username: member.username,
          avatar: member.avatar,
          role: member.role,
          joinedAt: new Date(member.joined_at),
          contribution: member.contribution,
          lastActive: new Date(member.last_active)
        })),
        maxMembers: data.max_members,
        isPrivate: data.is_private,
        tags: data.tags || [],
        stats: typeof data.stats === 'object' && data.stats !== null 
          ? data.stats as any 
          : { totalSessions: 0, avgProgress: 0, mostActiveDay: 'monday' }
      }
    } catch (error) {
      console.error('Failed to get study group:', error)
      return null
    }
  }

  private async getAllUsers(): Promise<FluentFlowUser[]> {
    try {
      const { supabase } = await import('../supabase/client')

      const { data, error } = await supabase
        .from('user_social_profiles')
        .select('*')

      if (error) throw error

      return (data || []).map(profile => ({
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name,
        email: '', // Not needed for this operation
        avatar: profile.avatar,
        languagePreferences: (typeof profile.language_preferences === 'object' && profile.language_preferences !== null) 
          ? profile.language_preferences as { learning: string[]; native: string[] }
          : { learning: [], native: [] },
        joinedAt: new Date(profile.created_at),
        lastSeen: new Date(profile.last_seen),
        isOnline: profile.is_online,
        preferences: (typeof profile.preferences === 'object' && profile.preferences !== null) 
          ? profile.preferences as any : {},
        stats: (typeof profile.stats === 'object' && profile.stats !== null) 
          ? profile.stats as any : { totalXp: 0, practiceStreak: 0, sessionsCompleted: 0 },
        level: (typeof profile.level_data === 'object' && profile.level_data !== null) 
          ? profile.level_data as any : { currentLevel: 1, totalXp: 0, xpToNextLevel: 100 },
        achievements: [] // Empty for performance - will be loaded separately if needed
      }))
    } catch (error) {
      console.error('Failed to get all users:', error)
      return []
    }
  }

  private async createNotifications(notifications: SocialNotification[]): Promise<void> {
    try {
      const { supabase } = await import('../supabase/client')

      const notificationInserts = notifications.map(notif => ({
        user_id: notif.userId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        data: notif.data || {},
        expires_at: notif.expiresAt?.toISOString()
      }))

      const { error } = await supabase
        .from('social_notifications')
        .insert(notificationInserts)

      if (error) throw error
    } catch (error) {
      console.error('Failed to create notifications:', error)
    }
  }

  private triggerRealtimeUpdate(path: string, data: any): void {
    const listener = this.realtimeListeners.get(path)
    if (listener) {
      // Simulate real-time delay
      setTimeout(() => listener(data), 100)
    }
  }
}

// Singleton instance
export const socialService = new SocialService()