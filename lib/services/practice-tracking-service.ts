// Practice Tracking Service - Data Layer
// Following SoC: Handles practice session tracking and analytics

import type { PracticeSession } from '../types/fluent-flow-types'
import type { LearningGoal } from '../utils/goals-analysis'

export interface PracticeSessionData {
  id?: string
  videoId: string
  videoTitle: string
  videoUrl: string
  startTime: number
  endTime: number
  duration: number // in seconds
  vocabularyCount: number
  recordingsCount: number
  loopsCreated: number
  transcriptUsed: boolean
  questionsGenerated: number
  practiceType: 'listening' | 'speaking' | 'vocabulary' | 'mixed'
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced'
  metadata?: {
    pauseCount: number
    rewindCount: number
    speedAdjustments: number
    notesCount: number
    bookmarksAdded: number
  }
}

export interface PracticeAnalytics {
  totalSessions: number
  totalPracticeTime: number // in seconds
  averageSessionTime: number
  longestSession: number
  currentStreak: number
  longestStreak: number
  vocabularyLearned: number
  recordingsMade: number
  loopsCreated: number
  questionsAnswered: number
  favoriteVideoTypes: string[]
  practiceHeatmap: { [date: string]: number }
  weeklyGoalProgress: number
  monthlyGoalProgress: number
}

export interface DailyPracticeStats {
  date: string
  sessionsCount: number
  totalMinutes: number
  vocabularyCount: number
  recordingsCount: number
  loopsCount: number
  streak: number
}

class PracticeTrackingService {
  private readonly STORAGE_KEY = 'practice_sessions'
  private readonly ANALYTICS_KEY = 'practice_analytics'

  /**
   * Start a new practice session
   */
  async startPracticeSession(data: {
    videoId: string
    videoTitle: string
    videoUrl: string
    practiceType?: PracticeSessionData['practiceType']
    difficultyLevel?: PracticeSessionData['difficultyLevel']
  }): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    
    const sessionData: PracticeSessionData = {
      id: sessionId,
      videoId: data.videoId,
      videoTitle: data.videoTitle,
      videoUrl: data.videoUrl,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      vocabularyCount: 0,
      recordingsCount: 0,
      loopsCreated: 0,
      transcriptUsed: false,
      questionsGenerated: 0,
      practiceType: data.practiceType || 'mixed',
      difficultyLevel: data.difficultyLevel || 'intermediate',
      metadata: {
        pauseCount: 0,
        rewindCount: 0,
        speedAdjustments: 0,
        notesCount: 0,
        bookmarksAdded: 0
      }
    }

    // Save to both Chrome storage and Supabase
    await this.saveSessionToStorage(sessionData)
    await this.saveSessionToSupabase(sessionData)

    return sessionId
  }

  /**
   * Update practice session with new data
   */
  async updatePracticeSession(sessionId: string, updates: Partial<PracticeSessionData>): Promise<void> {
    try {
      // Get current session
      const session = await this.getSessionById(sessionId)
      if (!session) {
        console.warn(`Session ${sessionId} not found`)
        return
      }

      // Update session data
      const updatedSession: PracticeSessionData = {
        ...session,
        ...updates,
        metadata: {
          ...session.metadata,
          ...updates.metadata
        }
      }

      // Save updates
      await this.saveSessionToStorage(updatedSession)
      await this.saveSessionToSupabase(updatedSession)

      console.log(`Practice session ${sessionId} updated`)
    } catch (error) {
      console.error('Failed to update practice session:', error)
    }
  }

  /**
   * End practice session and calculate final metrics
   */
  async endPracticeSession(sessionId: string): Promise<PracticeSessionData | null> {
    try {
      const session = await this.getSessionById(sessionId)
      if (!session) {
        console.warn(`Session ${sessionId} not found`)
        return null
      }

      // Calculate final duration
      const endTime = Date.now()
      const duration = Math.floor((endTime - session.startTime) / 1000) // in seconds

      const completedSession: PracticeSessionData = {
        ...session,
        endTime,
        duration
      }

      // Save completed session
      await this.saveSessionToStorage(completedSession)
      await this.saveSessionToSupabase(completedSession)

      // Update analytics
      await this.updateAnalytics(completedSession)

      // Trigger integrations
      await this.triggerIntegrations(completedSession)

      console.log(`Practice session ${sessionId} completed: ${duration}s`)
      return completedSession

    } catch (error) {
      console.error('Failed to end practice session:', error)
      return null
    }
  }

  /**
   * Track specific practice actions
   */
  async trackPracticeAction(sessionId: string, action: {
    type: 'vocabulary_learned' | 'recording_made' | 'loop_created' | 'transcript_used' | 'question_generated' | 'pause' | 'rewind' | 'speed_change' | 'note_added' | 'bookmark_added'
    count?: number
  }): Promise<void> {
    try {
      const session = await this.getSessionById(sessionId)
      if (!session) return

      const updates: Partial<PracticeSessionData> = { metadata: { ...session.metadata } }

      switch (action.type) {
        case 'vocabulary_learned':
          updates.vocabularyCount = (session.vocabularyCount || 0) + (action.count || 1)
          break
        case 'recording_made':
          updates.recordingsCount = (session.recordingsCount || 0) + (action.count || 1)
          break
        case 'loop_created':
          updates.loopsCreated = (session.loopsCreated || 0) + (action.count || 1)
          break
        case 'transcript_used':
          updates.transcriptUsed = true
          break
        case 'question_generated':
          updates.questionsGenerated = (session.questionsGenerated || 0) + (action.count || 1)
          break
        case 'pause':
          if (updates.metadata) updates.metadata.pauseCount = (session.metadata?.pauseCount || 0) + 1
          break
        case 'rewind':
          if (updates.metadata) updates.metadata.rewindCount = (session.metadata?.rewindCount || 0) + 1
          break
        case 'speed_change':
          if (updates.metadata) updates.metadata.speedAdjustments = (session.metadata?.speedAdjustments || 0) + 1
          break
        case 'note_added':
          if (updates.metadata) updates.metadata.notesCount = (session.metadata?.notesCount || 0) + 1
          break
        case 'bookmark_added':
          if (updates.metadata) updates.metadata.bookmarksAdded = (session.metadata?.bookmarksAdded || 0) + 1
          break
      }

      await this.updatePracticeSession(sessionId, updates)
    } catch (error) {
      console.error('Failed to track practice action:', error)
    }
  }

  /**
   * Get practice analytics
   */
  async getPracticeAnalytics(timeframe: 'week' | 'month' | 'year' | 'all' = 'month'): Promise<PracticeAnalytics> {
    try {
      const sessions = await this.getAllSessions(timeframe)
      
      const analytics: PracticeAnalytics = {
        totalSessions: sessions.length,
        totalPracticeTime: sessions.reduce((total, session) => total + (session.duration || 0), 0),
        averageSessionTime: 0,
        longestSession: 0,
        currentStreak: await this.calculateCurrentStreak(),
        longestStreak: await this.calculateLongestStreak(),
        vocabularyLearned: sessions.reduce((total, session) => total + (session.vocabularyCount || 0), 0),
        recordingsMade: sessions.reduce((total, session) => total + (session.recordingsCount || 0), 0),
        loopsCreated: sessions.reduce((total, session) => total + (session.loopsCreated || 0), 0),
        questionsAnswered: sessions.reduce((total, session) => total + (session.questionsGenerated || 0), 0),
        favoriteVideoTypes: this.analyzeFavoriteVideoTypes(sessions),
        practiceHeatmap: await this.generatePracticeHeatmap(sessions),
        weeklyGoalProgress: await this.calculateWeeklyProgress(),
        monthlyGoalProgress: await this.calculateMonthlyProgress()
      }

      // Calculate averages
      if (analytics.totalSessions > 0) {
        analytics.averageSessionTime = Math.floor(analytics.totalPracticeTime / analytics.totalSessions)
        analytics.longestSession = Math.max(...sessions.map(s => s.duration || 0))
      }

      return analytics
    } catch (error) {
      console.error('Failed to get practice analytics:', error)
      return this.getEmptyAnalytics()
    }
  }

  /**
   * Get daily practice stats
   */
  async getDailyStats(days: number = 30): Promise<DailyPracticeStats[]> {
    try {
      const sessions = await this.getAllSessions('month')
      const dailyStats: { [date: string]: DailyPracticeStats } = {}

      // Initialize days
      for (let i = 0; i < days; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        dailyStats[dateStr] = {
          date: dateStr,
          sessionsCount: 0,
          totalMinutes: 0,
          vocabularyCount: 0,
          recordingsCount: 0,
          loopsCount: 0,
          streak: 0
        }
      }

      // Aggregate session data
      sessions.forEach(session => {
        const sessionDate = new Date(session.startTime).toISOString().split('T')[0]
        if (dailyStats[sessionDate]) {
          dailyStats[sessionDate].sessionsCount++
          dailyStats[sessionDate].totalMinutes += Math.floor((session.duration || 0) / 60)
          dailyStats[sessionDate].vocabularyCount += session.vocabularyCount || 0
          dailyStats[sessionDate].recordingsCount += session.recordingsCount || 0
          dailyStats[sessionDate].loopsCount += session.loopsCreated || 0
        }
      })

      // Calculate streaks
      const sortedDates = Object.keys(dailyStats).sort()
      let currentStreak = 0
      
      for (let i = sortedDates.length - 1; i >= 0; i--) {
        const dateStr = sortedDates[i]
        if (dailyStats[dateStr].sessionsCount > 0) {
          currentStreak++
          dailyStats[dateStr].streak = currentStreak
        } else {
          currentStreak = 0
          dailyStats[dateStr].streak = 0
        }
      }

      return Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date))
    } catch (error) {
      console.error('Failed to get daily stats:', error)
      return []
    }
  }

  /**
   * Private helper methods
   */
  private async saveSessionToStorage(session: PracticeSessionData): Promise<void> {
    try {
      const sessions = await this.getStorageSessions()
      const existingIndex = sessions.findIndex(s => s.id === session.id)
      
      if (existingIndex >= 0) {
        sessions[existingIndex] = session
      } else {
        sessions.push(session)
      }

      await chrome.storage.local.set({ [this.STORAGE_KEY]: sessions })
    } catch (error) {
      console.error('Failed to save session to storage:', error)
    }
  }

  private async saveSessionToSupabase(session: PracticeSessionData): Promise<void> {
    try {
      const { supabase, getCurrentUser } = await import('../supabase/client')
      const user = await getCurrentUser()
      if (!user) return

      const sessionData = {
        id: session.id,
        user_id: user.id,
        video_id: session.videoId,
        video_title: session.videoTitle,
        video_url: session.videoUrl || `https://www.youtube.com/watch?v=${session.videoId}`,
        video_channel: null, // Not available in current data structure
        video_duration: null, // Not available in current data structure
        total_practice_time: session.duration,
        session_duration: session.duration,
        recordings_count: session.recordingsCount,
        segments_count: session.loopsCreated,
        status: session.endTime ? 'completed' : 'active',
        metadata: session.metadata || {},
        created_at: new Date(session.startTime).toISOString(),
        updated_at: session.endTime ? new Date(session.endTime).toISOString() : new Date().toISOString()
      }

      const { error } = await supabase
        .from('practice_sessions')
        .upsert(sessionData, { onConflict: 'id' })

      if (error) throw error
    } catch (error) {
      console.error('Failed to save session to Supabase:', error)
    }
  }

  private async getSessionById(sessionId: string): Promise<PracticeSessionData | null> {
    try {
      const sessions = await this.getStorageSessions()
      return sessions.find(s => s.id === sessionId) || null
    } catch (error) {
      console.error('Failed to get session by ID:', error)
      return null
    }
  }

  private async getStorageSessions(): Promise<PracticeSessionData[]> {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY])
      return result[this.STORAGE_KEY] || []
    } catch (error) {
      console.error('Failed to get storage sessions:', error)
      return []
    }
  }

  private async getAllSessions(timeframe: string): Promise<PracticeSessionData[]> {
    try {
      let sessions: PracticeSessionData[] = []
      
      // Get from Supabase first
      const { supabase, getCurrentUser } = await import('../supabase/client')
      const user = await getCurrentUser()
      
      if (user) {
        let query = supabase
          .from('practice_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        // Apply timeframe filter
        const now = new Date()
        let startDate: Date
        
        switch (timeframe) {
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          case 'year':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
            break
          default:
            startDate = new Date(0) // All time
        }
        
        if (timeframe !== 'all') {
          query = query.gte('created_at', startDate.toISOString())
        }

        const { data, error } = await query
        
        if (!error && data) {
          sessions = data.map(row => ({
            id: row.id,
            videoId: row.video_id,
            videoTitle: row.video_title,
            videoUrl: `https://youtube.com/watch?v=${row.video_id}`,
            startTime: new Date(row.created_at).getTime(),
            endTime: row.updated_at ? new Date(row.updated_at).getTime() : 0,
            duration: row.total_practice_time || 0,
            vocabularyCount: 0, // Not tracked in current schema
            recordingsCount: row.recordings_count || 0,
            loopsCreated: row.segments_count || 0,
            transcriptUsed: false, // Not tracked in current schema
            questionsGenerated: 0, // Not tracked in current schema
            practiceType: 'mixed', // Default
            difficultyLevel: 'intermediate', // Default
            metadata: (row.metadata as any) || {
              pauseCount: 0,
              rewindCount: 0,
              speedAdjustments: 0,
              notesCount: 0,
              bookmarksAdded: 0
            }
          }))
        }
      }
      
      // Fallback to storage if no Supabase data
      if (sessions.length === 0) {
        const storageSessions = await this.getStorageSessions()
        const cutoffTime = timeframe === 'all' ? 0 : 
          timeframe === 'week' ? Date.now() - 7 * 24 * 60 * 60 * 1000 :
          timeframe === 'month' ? Date.now() - 30 * 24 * 60 * 60 * 1000 :
          timeframe === 'year' ? Date.now() - 365 * 24 * 60 * 60 * 1000 : 0
        
        sessions = storageSessions.filter(session => session.startTime >= cutoffTime)
      }
      
      return sessions
    } catch (error) {
      console.error('Failed to get all sessions:', error)
      return this.getStorageSessions()
    }
  }

  private async calculateCurrentStreak(): Promise<number> {
    try {
      const sessions = await this.getAllSessions('all')
      if (sessions.length === 0) return 0
      
      // Group sessions by date
      const sessionsByDate: { [date: string]: boolean } = {}
      sessions.forEach(session => {
        const dateStr = new Date(session.startTime).toISOString().split('T')[0]
        sessionsByDate[dateStr] = true
      })
      
      let streak = 0
      const today = new Date()
      
      // Check consecutive days backwards from today
      for (let i = 0; i < 365; i++) { // Max check 1 year
        const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = checkDate.toISOString().split('T')[0]
        
        if (sessionsByDate[dateStr]) {
          streak++
        } else {
          // Allow skipping today if no session yet
          if (i === 0) continue
          break
        }
      }
      
      return streak
    } catch (error) {
      console.error('Failed to calculate current streak:', error)
      return 0
    }
  }

  private async calculateLongestStreak(): Promise<number> {
    try {
      const sessions = await this.getAllSessions('all')
      if (sessions.length === 0) return 0
      
      // Group sessions by date
      const sessionsByDate: { [date: string]: boolean } = {}
      sessions.forEach(session => {
        const dateStr = new Date(session.startTime).toISOString().split('T')[0]
        sessionsByDate[dateStr] = true
      })
      
      // Get all unique dates and sort them
      const dates = Object.keys(sessionsByDate).sort()
      if (dates.length === 0) return 0
      
      let longestStreak = 1
      let currentStreak = 1
      
      // Calculate longest consecutive streak
      for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i - 1])
        const currDate = new Date(dates[i])
        const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000))
        
        if (daysDiff === 1) {
          currentStreak++
          longestStreak = Math.max(longestStreak, currentStreak)
        } else {
          currentStreak = 1
        }
      }
      
      return longestStreak
    } catch (error) {
      console.error('Failed to calculate longest streak:', error)
      return 0
    }
  }

  private analyzeFavoriteVideoTypes(sessions: PracticeSessionData[]): string[] {
    if (sessions.length === 0) return []
    
    // Analyze video titles to extract categories/types
    const typeCount: { [type: string]: number } = {}
    
    sessions.forEach(session => {
      const title = session.videoTitle.toLowerCase()
      
      // Basic categorization based on common patterns
      if (title.includes('news') || title.includes('bbc') || title.includes('cnn')) {
        typeCount['News'] = (typeCount['News'] || 0) + 1
      } else if (title.includes('podcast') || title.includes('interview') || title.includes('talk')) {
        typeCount['Podcasts & Interviews'] = (typeCount['Podcasts & Interviews'] || 0) + 1
      } else if (title.includes('music') || title.includes('song') || title.includes('lyrics')) {
        typeCount['Music'] = (typeCount['Music'] || 0) + 1
      } else if (title.includes('movie') || title.includes('film') || title.includes('trailer')) {
        typeCount['Movies & Films'] = (typeCount['Movies & Films'] || 0) + 1
      } else if (title.includes('lesson') || title.includes('learn') || title.includes('tutorial')) {
        typeCount['Educational'] = (typeCount['Educational'] || 0) + 1
      } else if (title.includes('comedy') || title.includes('funny') || title.includes('humor')) {
        typeCount['Comedy'] = (typeCount['Comedy'] || 0) + 1
      } else if (title.includes('documentary') || title.includes('history') || title.includes('science')) {
        typeCount['Documentaries'] = (typeCount['Documentaries'] || 0) + 1
      } else {
        typeCount['Other'] = (typeCount['Other'] || 0) + 1
      }
    })
    
    // Sort by count and return top 5 types
    return Object.entries(typeCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type]) => type)
  }

  private async generatePracticeHeatmap(sessions: PracticeSessionData[]): Promise<{ [date: string]: number }> {
    const heatmap: { [date: string]: number } = {}
    
    // Initialize last 365 days with 0 values
    const today = new Date()
    for (let i = 0; i < 365; i++) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      heatmap[dateStr] = 0
    }
    
    // Aggregate practice time by date
    sessions.forEach(session => {
      const dateStr = new Date(session.startTime).toISOString().split('T')[0]
      if (heatmap.hasOwnProperty(dateStr)) {
        heatmap[dateStr] += Math.floor((session.duration || 0) / 60) // Convert to minutes
      }
    })
    
    return heatmap
  }

  private async calculateWeeklyProgress(): Promise<number> {
    try {
      const sessions = await this.getAllSessions('week')
      const totalWeeklyMinutes = sessions.reduce((total, session) => 
        total + Math.floor((session.duration || 0) / 60), 0
      )
      
      // Assume weekly goal of 180 minutes (3 hours)
      const weeklyGoalMinutes = 180
      const progress = Math.min((totalWeeklyMinutes / weeklyGoalMinutes) * 100, 100)
      
      return Math.round(progress)
    } catch (error) {
      console.error('Failed to calculate weekly progress:', error)
      return 0
    }
  }

  private async calculateMonthlyProgress(): Promise<number> {
    try {
      const sessions = await this.getAllSessions('month')
      const totalMonthlyMinutes = sessions.reduce((total, session) => 
        total + Math.floor((session.duration || 0) / 60), 0
      )
      
      // Assume monthly goal of 720 minutes (12 hours)
      const monthlyGoalMinutes = 720
      const progress = Math.min((totalMonthlyMinutes / monthlyGoalMinutes) * 100, 100)
      
      return Math.round(progress)
    } catch (error) {
      console.error('Failed to calculate monthly progress:', error)
      return 0
    }
  }

  private getEmptyAnalytics(): PracticeAnalytics {
    return {
      totalSessions: 0,
      totalPracticeTime: 0,
      averageSessionTime: 0,
      longestSession: 0,
      currentStreak: 0,
      longestStreak: 0,
      vocabularyLearned: 0,
      recordingsMade: 0,
      loopsCreated: 0,
      questionsAnswered: 0,
      favoriteVideoTypes: [],
      practiceHeatmap: {},
      weeklyGoalProgress: 0,
      monthlyGoalProgress: 0
    }
  }

  private async updateAnalytics(session: PracticeSessionData): Promise<void> {
    try {
      // Get current analytics from cache
      const currentAnalytics = await chrome.storage.local.get([this.ANALYTICS_KEY])
      const analytics: PracticeAnalytics = currentAnalytics[this.ANALYTICS_KEY] || this.getEmptyAnalytics()
      
      // Update metrics
      analytics.totalSessions += 1
      analytics.totalPracticeTime += session.duration
      analytics.averageSessionTime = Math.floor(analytics.totalPracticeTime / analytics.totalSessions)
      analytics.longestSession = Math.max(analytics.longestSession, session.duration)
      analytics.vocabularyLearned += session.vocabularyCount
      analytics.recordingsMade += session.recordingsCount
      analytics.loopsCreated += session.loopsCreated
      analytics.questionsAnswered += session.questionsGenerated
      
      // Recalculate streaks (more accurate calculation)
      analytics.currentStreak = await this.calculateCurrentStreak()
      analytics.longestStreak = await this.calculateLongestStreak()
      
      // Update progress
      analytics.weeklyGoalProgress = await this.calculateWeeklyProgress()
      analytics.monthlyGoalProgress = await this.calculateMonthlyProgress()
      
      // Save updated analytics
      await chrome.storage.local.set({ [this.ANALYTICS_KEY]: analytics })
      
      console.log('Practice analytics updated')
    } catch (error) {
      console.error('Failed to update analytics:', error)
    }
  }

  private async triggerIntegrations(session: PracticeSessionData): Promise<void> {
    try {
      // Update learning goals
      const { learningGoalsService } = await import('./learning-goals-service')
      const practiceSession: PracticeSession = {
        id: session.id || '',
        videoId: session.videoId,
        videoTitle: session.videoTitle,
        videoUrl: session.videoUrl,
        segments: [], // Would be populated from session data
        recordings: [], // Would be populated from session data
        totalPracticeTime: session.duration,
        vocabularyCount: session.vocabularyCount,
        createdAt: new Date(session.startTime),
        updatedAt: new Date(session.endTime || Date.now())
      }

      await learningGoalsService.updateProgress(practiceSession)

      // Update social features
      const { SocialService } = await import('./social-service')
      const socialService = new SocialService()
      
      await socialService.updateUserStats({
        duration: session.duration,
        recordingsMade: session.recordingsCount,
        loopsCompleted: session.loopsCreated,
        vocabularyLearned: session.vocabularyCount,
        streakDay: await this.calculateCurrentStreak()
      })

      console.log('Practice session integrations completed')
    } catch (error) {
      console.error('Failed to trigger integrations:', error)
    }
  }
}

// Singleton instance
export const practiceTrackingService = new PracticeTrackingService()

// Dashboard Integration Helper
export async function generateDashboardAnalytics(): Promise<any> {
  try {
    const analytics = await practiceTrackingService.getPracticeAnalytics('month')
    const dailyStats = await practiceTrackingService.getDailyStats(30)
    
    // Generate weekly trend (last 7 days)
    const weeklyTrend = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayStats = dailyStats.find(stat => stat.date === dateStr)
      weeklyTrend.push({
        date,
        sessions: dayStats?.sessionsCount || 0,
        practiceTime: (dayStats?.totalMinutes || 0) * 60, // Convert to seconds
        recordings: dayStats?.recordingsCount || 0
      })
    }
    
    // Generate monthly trend (last 4 weeks)
    const monthlyTrend = []
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - (i * 7))
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week
      
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      
      const weekStats = dailyStats.filter(stat => {
        const statDate = new Date(stat.date)
        return statDate >= weekStart && statDate <= weekEnd
      })
      
      monthlyTrend.push({
        weekStart,
        sessions: weekStats.reduce((sum, stat) => sum + stat.sessionsCount, 0),
        practiceTime: weekStats.reduce((sum, stat) => sum + stat.totalMinutes * 60, 0),
        recordings: weekStats.reduce((sum, stat) => sum + stat.recordingsCount, 0)
      })
    }
    
    // Calculate daily averages
    const thisWeekStats = dailyStats.slice(-7)
    const lastWeekStats = dailyStats.slice(-14, -7)
    const thisMonthStats = dailyStats.slice(-30)
    
    const dailyAverages = {
      thisWeek: thisWeekStats.reduce((sum, stat) => sum + stat.totalMinutes, 0) / 7,
      lastWeek: lastWeekStats.reduce((sum, stat) => sum + stat.totalMinutes, 0) / 7,
      thisMonth: thisMonthStats.reduce((sum, stat) => sum + stat.totalMinutes, 0) / 30
    }
    
    // Find most active day (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeekStats = [0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => {
      const dayStats = dailyStats.filter(stat => new Date(stat.date).getDay() === dayOfWeek)
      return dayStats.reduce((sum, stat) => sum + stat.totalMinutes, 0)
    })
    
    const maxMinutes = Math.max(...dayOfWeekStats)
    const mostActiveDay = maxMinutes > 0 ? dayOfWeekStats.indexOf(maxMinutes) : null
    
    // Calculate improvement rate (this week vs last week)
    const improvementRate = dailyAverages.lastWeek > 0 
      ? ((dailyAverages.thisWeek - dailyAverages.lastWeek) / dailyAverages.lastWeek) * 100
      : 0
    
    return {
      weeklyTrend,
      monthlyTrend,
      dailyAverages,
      practiceStreak: analytics.currentStreak,
      mostActiveDay,
      improvementRate: Math.round(improvementRate * 100) / 100 // Round to 2 decimal places
    }
  } catch (error) {
    console.error('Failed to generate dashboard analytics:', error)
    return {
      weeklyTrend: [],
      monthlyTrend: [],
      dailyAverages: { thisWeek: 0, lastWeek: 0, thisMonth: 0 },
      practiceStreak: 0,
      mostActiveDay: null,
      improvementRate: 0
    }
  }
}
