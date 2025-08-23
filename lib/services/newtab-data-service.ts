// NewTab Data Service - Data Layer
// Following SoC: Handles data aggregation from various FluentFlow services

import { getFluentFlowStore } from '../stores/fluent-flow-supabase-store'
import { learningGoalsService } from './learning-goals-service'
import { sessionTemplatesService } from './session-templates-service'
import {
  calculateTodayStats,
  calculatePracticeStreak,
  calculateWeeklyProgress,
  generateRecentAchievements,
  getMotivationalData,
  generateQuickActions,
  type NewTabData,
  type SavedContent
} from '../utils/newtab-analytics'

export class NewTabDataService {
  private readonly bookmarksKey = 'fluent_flow_bookmarked_videos'
  private readonly notesKey = 'fluent_flow_practice_notes'
  private readonly lastVideoKey = 'fluent_flow_last_video'

  /**
   * Aggregates all data needed for the newtab page
   */
  async getNewTabData(): Promise<NewTabData> {
    try {
      // Get data from FluentFlow store
      const store = getFluentFlowStore()
      const { allSessions, statistics } = store

      // Get data from other services
      const [goals, templates, activePlans, savedContent] = await Promise.all([
        learningGoalsService.getGoals(),
        sessionTemplatesService.getTemplates(),
        sessionTemplatesService.getActiveSessionPlans(),
        this.getSavedContent()
      ])

      // Get last video info
      const lastVideo = await this.getLastVideo()

      // Calculate analytics
      const todayStats = calculateTodayStats(allSessions, goals)
      const practiceStreak = calculatePracticeStreak(allSessions)
      const weeklyProgress = calculateWeeklyProgress(allSessions, goals)
      
      // Generate derived data
      const recentAchievements = generateRecentAchievements(
        goals,
        practiceStreak,
        statistics.totalSessions,
        todayStats.vocabularyLearned * 30 // Rough total estimate
      )

      const motivationalData = getMotivationalData(
        statistics.totalSessions,
        statistics.totalPracticeTime,
        practiceStreak
      )

      const quickActions = generateQuickActions(
        lastVideo,
        activePlans,
        practiceStreak
      )

      return {
        todayStats,
        practiceStreak,
        weeklyProgress,
        recentAchievements,
        savedContent,
        motivationalData,
        quickActions
      }
    } catch (error) {
      console.error('Failed to load newtab data:', error)
      // Return minimal data structure
      return this.getEmptyNewTabData()
    }
  }

  /**
   * Gets saved content (bookmarks, notes, recent loops)
   */
  async getSavedContent(): Promise<SavedContent> {
    try {
      const [bookmarkedVideos, practiceNotes] = await Promise.all([
        this.getBookmarkedVideos(),
        this.getPracticeNotes()
      ])

      // Get recent loops from store
      const store = getFluentFlowStore()
      const recentLoops = await this.getRecentLoops()

      return {
        recentLoops,
        bookmarkedVideos,
        practiceNotes
      }
    } catch (error) {
      console.error('Failed to load saved content:', error)
      return {
        recentLoops: [],
        bookmarkedVideos: [],
        practiceNotes: []
      }
    }
  }

  /**
   * Gets recent loops from the store
   */
  async getRecentLoops() {
    try {
      const store = getFluentFlowStore()
      // This would need to be implemented in the store
      // For now, return empty array
      return []
    } catch (error) {
      console.error('Failed to get recent loops:', error)
      return []
    }
  }

  /**
   * Gets bookmarked videos from storage
   */
  async getBookmarkedVideos(): Promise<SavedContent['bookmarkedVideos']> {
    try {
      const result = await chrome.storage.local.get([this.bookmarksKey])
      const bookmarks = result[this.bookmarksKey] || []
      
      return bookmarks.map((bookmark: any) => ({
        ...bookmark,
        bookmarkedAt: new Date(bookmark.bookmarkedAt)
      })).sort((a: any, b: any) => b.bookmarkedAt.getTime() - a.bookmarkedAt.getTime())
        .slice(0, 5) // Limit to 5 most recent
    } catch (error) {
      console.error('Failed to load bookmarked videos:', error)
      return []
    }
  }

  /**
   * Gets practice notes from storage
   */
  async getPracticeNotes(): Promise<SavedContent['practiceNotes']> {
    try {
      const result = await chrome.storage.local.get([this.notesKey])
      const notes = result[this.notesKey] || []
      
      return notes.map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt)
      })).sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 3) // Limit to 3 most recent
    } catch (error) {
      console.error('Failed to load practice notes:', error)
      return []
    }
  }

  /**
   * Gets the last watched video ID
   */
  async getLastVideo(): Promise<string | null> {
    try {
      const result = await chrome.storage.local.get([this.lastVideoKey])
      return result[this.lastVideoKey] || null
    } catch (error) {
      console.error('Failed to get last video:', error)
      return null
    }
  }

  /**
   * Saves a video as bookmarked
   */
  async bookmarkVideo(videoId: string, title: string, thumbnail: string): Promise<void> {
    try {
      const bookmarks = await this.getBookmarkedVideos()
      
      // Check if already bookmarked
      if (bookmarks.some(b => b.videoId === videoId)) {
        return
      }

      const newBookmark = {
        videoId,
        title,
        thumbnail,
        bookmarkedAt: new Date()
      }

      const updatedBookmarks = [newBookmark, ...bookmarks].slice(0, 10) // Keep max 10
      
      await chrome.storage.local.set({
        [this.bookmarksKey]: updatedBookmarks
      })
    } catch (error) {
      console.error('Failed to bookmark video:', error)
    }
  }

  /**
   * Removes a bookmarked video
   */
  async removeBookmark(videoId: string): Promise<void> {
    try {
      const bookmarks = await this.getBookmarkedVideos()
      const filteredBookmarks = bookmarks.filter(b => b.videoId !== videoId)
      
      await chrome.storage.local.set({
        [this.bookmarksKey]: filteredBookmarks
      })
    } catch (error) {
      console.error('Failed to remove bookmark:', error)
    }
  }

  /**
   * Saves a practice note
   */
  async savePracticeNote(content: string, videoId?: string): Promise<void> {
    try {
      const notes = await this.getPracticeNotes()
      
      const newNote = {
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content,
        videoId,
        createdAt: new Date()
      }

      const updatedNotes = [newNote, ...notes].slice(0, 20) // Keep max 20
      
      await chrome.storage.local.set({
        [this.notesKey]: updatedNotes
      })
    } catch (error) {
      console.error('Failed to save practice note:', error)
    }
  }

  /**
   * Deletes a practice note
   */
  async deletePracticeNote(noteId: string): Promise<void> {
    try {
      const notes = await this.getPracticeNotes()
      const filteredNotes = notes.filter(n => n.id !== noteId)
      
      await chrome.storage.local.set({
        [this.notesKey]: filteredNotes
      })
    } catch (error) {
      console.error('Failed to delete practice note:', error)
    }
  }

  /**
   * Updates the last watched video
   */
  async updateLastVideo(videoId: string): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.lastVideoKey]: videoId
      })
    } catch (error) {
      console.error('Failed to update last video:', error)
    }
  }

  /**
   * Executes a quick action
   */
  async executeQuickAction(actionId: string, data?: any): Promise<void> {
    try {
      switch (actionId) {
        case 'resume_video':
          if (data?.videoId) {
            await this.openVideo(data.videoId)
          }
          break

        case 'random_video':
          await this.openRandomVideo()
          break

        case 'start_template':
          if (data?.planId) {
            // This would integrate with session templates
            console.log('Starting template session:', data.planId)
          }
          break

        case 'focus_timer':
          await this.startFocusTimer()
          break

        case 'vocabulary_review':
          await this.openVocabularyReview()
          break

        default:
          console.warn('Unknown quick action:', actionId)
      }
    } catch (error) {
      console.error('Failed to execute quick action:', error)
    }
  }

  /**
   * Opens a specific video on YouTube
   */
  private async openVideo(videoId: string): Promise<void> {
    const url = `https://www.youtube.com/watch?v=${videoId}`
    await chrome.tabs.create({ url })
  }

  /**
   * Opens a random educational video
   */
  private async openRandomVideo(): Promise<void> {
    // This could be enhanced with AI recommendations
    const educationalQueries = [
      'english conversation practice',
      'english pronunciation lesson',
      'learn english vocabulary',
      'english grammar tutorial',
      'english listening practice'
    ]
    
    const randomQuery = educationalQueries[Math.floor(Math.random() * educationalQueries.length)]
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(randomQuery)}`
    await chrome.tabs.create({ url })
  }

  /**
   * Starts focus timer (placeholder)
   */
  private async startFocusTimer(): Promise<void> {
    // This would integrate with a focus timer component
    console.log('Focus timer started')
  }

  /**
   * Opens vocabulary review (placeholder)
   */
  private async openVocabularyReview(): Promise<void> {
    // This would open a vocabulary review page
    console.log('Opening vocabulary review')
  }

  /**
   * Returns empty data structure for error fallback
   */
  private getEmptyNewTabData(): NewTabData {
    return {
      todayStats: {
        sessionsToday: 0,
        practiceTimeToday: 0,
        goalProgress: 0,
        vocabularyLearned: 0,
        recordingsToday: 0
      },
      practiceStreak: 0,
      weeklyProgress: [],
      recentAchievements: [],
      savedContent: {
        recentLoops: [],
        bookmarkedVideos: [],
        practiceNotes: []
      },
      motivationalData: {
        quote: "Every new language is like an open window that shows a new view of the world.",
        author: "Frank Harris",
        progress: {
          level: "Beginner Explorer",
          nextMilestone: "Dedicated Learner",
          progressToNext: 0
        }
      },
      quickActions: [
        {
          id: 'random_video',
          title: 'Discover New Content',
          description: 'Get personalized video suggestions',
          icon: '🎲',
          action: 'random_video'
        }
      ]
    }
  }
}

// Singleton instance
export const newTabDataService = new NewTabDataService()