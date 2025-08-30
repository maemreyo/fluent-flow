import { Card, Scheduler } from '@open-spaced-repetition/sm-2'
import { userVocabularyService, type UserVocabularyItem } from './user-vocabulary-service'
import { supabase } from '../supabase/client'

export type SRSRating = 0 | 1 | 2 | 3 | 4 | 5

export interface SRSStats {
  totalCards: number
  dueToday: number
  newCards: number
  learningCards: number
  reviewCards: number
  matureCards: number
  currentStreak: number
  longestStreak: number
  totalReviews: number
  accuracyRate: number
}

export interface ReviewSession {
  id: string
  cards: UserVocabularyItem[]
  currentIndex: number
  sessionStats: {
    reviewed: number
    correct: number
    again: number
    hard: number
    good: number
    easy: number
  }
}

export class SRSService {
  /**
   * Convert UserVocabularyItem to SM-2 Card format
   */
  private toSM2Card(item: UserVocabularyItem): Card {
    const dueDate = new Date(item.nextReviewDate)
    return new Card(
      parseInt(item.id) || 0, // cardId
      item.repetitions, // n (number of reviews)
      item.easeFactor, // EF (ease factor)
      item.intervalDays, // I (interval in days)
      dueDate, // due date
      false // needsExtraReview
    )
  }

  /**
   * Convert SM-2 Card back to UserVocabularyItem updates
   */
  private fromSM2Card(updatedCard: Card, rating: SRSRating): Partial<UserVocabularyItem> {
    const now = new Date()

    // Determine learning status based on rating and repetitions
    let learningStatus: UserVocabularyItem['learningStatus']
    if (rating <= 2) {
      learningStatus = 'learning'
    } else if (updatedCard.n < 3) {
      learningStatus = 'learning'
    } else if (updatedCard.n < 6) {
      learningStatus = 'review'
    } else {
      learningStatus = 'mature'
    }

    return {
      easeFactor: updatedCard.EF,
      intervalDays: updatedCard.I,
      repetitions: updatedCard.n,
      nextReviewDate: updatedCard.due.toISOString(),
      learningStatus,
      lastPracticedAt: now.toISOString(),
      timesPracticed: 1, // Will be incremented in service
      timesCorrect: rating >= 3 ? 1 : 0, // Will be incremented in service
      timesIncorrect: rating < 3 ? 1 : 0 // Will be incremented in service
    }
  }

  /**
   * Process user rating and update vocabulary item using SM-2 algorithm
   */
  async processReview(itemId: string, rating: SRSRating): Promise<UserVocabularyItem | null> {
    try {
      // Get current item
      const items = await userVocabularyService.getUserVocabularyDeck({ limit: 1000 })
      const currentItem = items.find(item => item.id === itemId)

      if (!currentItem) {
        console.error('Item not found for review:', itemId)
        return null
      }

      // Track the previous learning status to detect when item becomes mature
      const previousStatus = currentItem.learningStatus

      // Convert to SM2 format and process
      const sm2Card = this.toSM2Card(currentItem)
      const result = Scheduler.reviewCard(sm2Card, rating)

      // Convert back to vocabulary item updates
      const updates = this.fromSM2Card(result.card, rating)

      // Increment counters properly
      const finalUpdates: Partial<UserVocabularyItem> = {
        ...updates,
        timesPracticed: currentItem.timesPracticed + 1,
        timesCorrect: currentItem.timesCorrect + (rating >= 3 ? 1 : 0),
        timesIncorrect: currentItem.timesIncorrect + (rating < 3 ? 1 : 0)
      }

      // Update in database
      const success = await userVocabularyService.updateVocabularyItem(itemId, finalUpdates)

      if (!success) {
        console.error('Failed to update vocabulary item in database')
        return null
      }

      // Log the review activity for streak calculation and analytics
      await this.logReviewActivity(itemId, rating, rating >= 3)

      // Update learning stats
      await userVocabularyService.updateReviewStats(rating >= 3)

      // Check if item became mature and update stats accordingly
      if (previousStatus !== 'mature' && finalUpdates.learningStatus === 'mature') {
        await userVocabularyService.incrementItemsLearned(currentItem.itemType)
      }

      // Return updated item
      const updatedItem: UserVocabularyItem = {
        ...currentItem,
        ...finalUpdates
      }

      console.log(
        'Processed review for:',
        currentItem.text,
        'Rating:',
        rating,
        'Next review:',
        updates.nextReviewDate
      )

      return updatedItem
    } catch (error) {
      console.error('Failed to process review:', error)
      return null
    }
  }

  /**
   * Log review activity for streak calculation and analytics
   */
  private async logReviewActivity(vocabularyId: string, rating: SRSRating, isCorrect: boolean): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const reviewData = {
        user_id: user.id,
        vocabulary_id: vocabularyId,
        review_type: 'flashcard' as const,
        is_correct: isCorrect,
        reviewed_at: new Date().toISOString(),
        new_ease_factor: null, // Could be populated if needed
        new_interval_days: null, // Could be populated if needed
        new_next_review_date: null // Could be populated if needed
      }

      const { error } = await supabase
        .from('user_vocabulary_reviews')
        .insert(reviewData)

      if (error) {
        console.error('Failed to log review activity:', error)
      }
    } catch (error) {
      console.error('Error logging review activity:', error)
    }
  }

  /**
   * Get cards due for review today
   */
  async getDueCards(limit = 20): Promise<UserVocabularyItem[]> {
    const dueItems = await userVocabularyService.getItemsDueForReview()
    return dueItems.slice(0, limit)
  }

  /**
   * Get new cards to introduce to learning
   */
  async getNewCards(limit = 5): Promise<UserVocabularyItem[]> {
    const newItems = await userVocabularyService.getUserVocabularyDeck({
      status: 'new',
      limit
    })
    return newItems
  }

  /**
   * Start a review session with optimal card mix
   */
  async startReviewSession(maxCards = 20): Promise<ReviewSession> {
    const dueCards = await this.getDueCards(Math.floor(maxCards * 0.8))
    const newCards = await this.getNewCards(Math.floor(maxCards * 0.2))

    const allCards = [...dueCards, ...newCards].slice(0, maxCards)

    // Shuffle cards for variety
    const shuffledCards = allCards.sort(() => Math.random() - 0.5)

    return {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      cards: shuffledCards,
      currentIndex: 0,
      sessionStats: {
        reviewed: 0,
        correct: 0,
        again: 0,
        hard: 0,
        good: 0,
        easy: 0
      }
    }
  }

  // Session persistence methods
  private getSessionKey(): string {
    return 'fluent-flow-srs-session'
  }

  saveSession(session: ReviewSession): void {
    try {
      // Save to localStorage for immediate persistence
      const sessionData = {
        ...session,
        timestamp: Date.now()
      }
      localStorage.setItem(this.getSessionKey(), JSON.stringify(sessionData))
      
      // Also save to database for cross-device sync (fire-and-forget)
      this.saveToDatabase(session).catch(error => 
        console.error('Failed to save session to database:', error)
      )
    } catch (error) {
      console.error('Failed to save SRS session:', error)
    }
  }

  async loadSession(): Promise<ReviewSession | null> {
    try {
      // Try localStorage first (faster)
      const localSession = this.loadFromLocalStorage()
      if (localSession) {
        return localSession
      }

      // If no local session, try database
      const dbSession = await this.loadFromDatabase()
      if (dbSession) {
        // Cache in localStorage for future loads
        this.saveToLocalStorage(dbSession)
        return dbSession
      }

      return null
    } catch (error) {
      console.error('Failed to load SRS session:', error)
      return null
    }
  }

  clearSession(): void {
    try {
      // Clear localStorage
      localStorage.removeItem(this.getSessionKey())
      
      // Also clear from database (fire-and-forget)
      this.clearFromDatabase().catch(error => 
        console.error('Failed to clear session from database:', error)
      )
    } catch (error) {
      console.error('Failed to clear SRS session:', error)
    }
  }

  async resumeOrStartSession(maxCards = 20): Promise<ReviewSession> {
    // Try to load existing session first
    const savedSession = await this.loadSession()
    if (savedSession && savedSession.cards.length > 0) {
      // Check if we haven't completed all cards in the current session
      if (savedSession.currentIndex < savedSession.cards.length) {
        console.log('Resuming existing session at card', savedSession.currentIndex + 1, 'of', savedSession.cards.length)
        return savedSession
      } else {
        // Session is complete, clear it
        console.log('Previous session completed, clearing and starting new session')
        this.clearSession()
      }
    }
    
    // Check if there are cards available for a new session
    const dueCards = await this.getDueCards(Math.floor(maxCards * 0.8))
    const newCards = await this.getNewCards(Math.floor(maxCards * 0.2))
    const availableCards = [...dueCards, ...newCards]
    
    console.log('Available cards for new session:', {
      dueCards: dueCards.length,
      newCards: newCards.length,
      total: availableCards.length
    })
    
    // Start new session if there are cards available
    if (availableCards.length > 0) {
      const newSession = await this.startReviewSession(maxCards)
      // Immediately save the new session so it's available for processCard
      this.saveSession(newSession)
      return newSession
    }
    
    // If no cards available, return an empty session (this should be handled by the UI)
    const emptySession = {
      id: `empty_session_${Date.now()}`,
      cards: [],
      currentIndex: 0,
      sessionStats: {
        reviewed: 0,
        correct: 0,
        again: 0,
        hard: 0,
        good: 0,
        easy: 0
      }
    }
    
    // Save even empty sessions for consistency
    this.saveSession(emptySession)
    return emptySession
  }

  // Helper methods for localStorage operations
  private loadFromLocalStorage(): ReviewSession | null {
    try {
      const saved = localStorage.getItem(this.getSessionKey())
      if (!saved) return null

      const sessionData = JSON.parse(saved)
      
      // Check if session is still valid (within 24 hours)
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours
      if (Date.now() - sessionData.timestamp > maxAge) {
        localStorage.removeItem(this.getSessionKey())
        return null
      }

      // Remove timestamp before returning
      const { timestamp, ...session } = sessionData
      
      // Ensure session has an ID (for backward compatibility)
      if (!session.id) {
        session.id = `legacy_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
      
      return session as ReviewSession
    } catch (error) {
      console.error('Failed to load from localStorage:', error)
      return null
    }
  }

  private saveToLocalStorage(session: ReviewSession): void {
    try {
      const sessionData = {
        ...session,
        timestamp: Date.now()
      }
      localStorage.setItem(this.getSessionKey(), JSON.stringify(sessionData))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  }

  // Helper methods for database operations
  private async loadFromDatabase(): Promise<ReviewSession | null> {
    try {
      const { userVocabularyService } = await import('./user-vocabulary-service')
      const session = await userVocabularyService.loadSRSSession()
      
      // Ensure session has an ID (for backward compatibility)
      if (session && !session.id) {
        session.id = `db_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
      
      return session
    } catch (error) {
      console.error('Failed to load from database:', error)
      return null
    }
  }

  private async saveToDatabase(session: ReviewSession): Promise<void> {
    try {
      const { userVocabularyService } = await import('./user-vocabulary-service')
      await userVocabularyService.saveSRSSession(session)
    } catch (error) {
      console.error('Failed to save to database:', error)
    }
  }

  private async clearFromDatabase(): Promise<void> {
    try {
      const { userVocabularyService } = await import('./user-vocabulary-service')
      await userVocabularyService.clearSRSSession()
    } catch (error) {
      console.error('Failed to clear from database:', error)
    }
  }

  /**
   * Get comprehensive SRS statistics
   */
  /**
   * Get comprehensive SRS statistics
   */
  async getStats(): Promise<SRSStats> {
    try {
      const allItems = await userVocabularyService.getUserVocabularyDeck({ limit: 1000 })
      
      // Use the same logic as getItemsDueForReview for consistency
      const now = new Date().toISOString()
      
      const dueToday = allItems.filter(item => {
        return item.nextReviewDate <= now && ['learning', 'review'].includes(item.learningStatus)
      }).length

      const statusCounts = {
        new: allItems.filter(item => item.learningStatus === 'new').length,
        learning: allItems.filter(item => item.learningStatus === 'learning').length,
        review: allItems.filter(item => item.learningStatus === 'review').length,
        mature: allItems.filter(item => item.learningStatus === 'mature').length
      }

      const totalReviews = allItems.reduce((sum, item) => sum + item.timesPracticed, 0)
      const correctReviews = allItems.reduce((sum, item) => sum + item.timesCorrect, 0)
      const accuracyRate = totalReviews > 0 ? (correctReviews / totalReviews) * 100 : 0

      // Calculate streak using the new comprehensive method
      const streak = await this.calculateStreak(allItems)

      return {
        totalCards: allItems.length,
        dueToday,
        newCards: statusCounts.new,
        learningCards: statusCounts.learning,
        reviewCards: statusCounts.review,
        matureCards: statusCounts.mature,
        currentStreak: streak.current,
        longestStreak: streak.longest,
        totalReviews,
        accuracyRate: Math.round(accuracyRate)
      }
    } catch (error) {
      console.error('Failed to get SRS stats:', error)
      return {
        totalCards: 0,
        dueToday: 0,
        newCards: 0,
        learningCards: 0,
        reviewCards: 0,
        matureCards: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalReviews: 0,
        accuracyRate: 0
      }
    }
  }

  async getActivityData(days: number = 14): Promise<Array<{ date: string; count: number }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      // Get review activity data for the last N days
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days + 1)
      startDate.setHours(0, 0, 0, 0)

      const { data: reviews, error } = await supabase
        .from('user_vocabulary_reviews')
        .select('reviewed_at')
        .eq('user_id', user.id)
        .gte('reviewed_at', startDate.toISOString())
        .order('reviewed_at', { ascending: true })

      if (error) {
        console.error('Error fetching review activity:', error)
        return []
      }

      // Group reviews by date and count them
      const activityMap = new Map<string, number>()
      
      // Initialize all dates with 0 count
      for (let i = 0; i < days; i++) {
        const date = new Date()
        date.setDate(date.getDate() - days + 1 + i)
        const dateStr = date.toISOString().split('T')[0]
        activityMap.set(dateStr, 0)
      }

      // Count reviews for each date
      reviews?.forEach(review => {
        const reviewDate = new Date(review.reviewed_at).toISOString().split('T')[0]
        activityMap.set(reviewDate, (activityMap.get(reviewDate) || 0) + 1)
      })

      // Convert to array format
      return Array.from(activityMap.entries()).map(([date, count]) => ({
        date,
        count
      }))
    } catch (error) {
      console.error('Error getting activity data:', error)
      return []
    }
  }

  /**
   * Calculate learning streak based on daily review activity
   */
  /**
   * Calculate learning streak based on daily review activity
   * A day is considered "complete" if the user has reviewed at least 5 cards with 60% accuracy
   */
  private async calculateStreak(items: UserVocabularyItem[]): Promise<{ current: number; longest: number }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { current: 0, longest: 0 }

      // Get review activity for the last 365 days to calculate streaks
      const oneYearAgo = new Date()
      oneYearAgo.setDate(oneYearAgo.getDate() - 365)

      const { data: reviews, error } = await supabase
        .from('user_vocabulary_reviews')
        .select('reviewed_at, is_correct')
        .eq('user_id', user.id)
        .gte('reviewed_at', oneYearAgo.toISOString())
        .order('reviewed_at', { ascending: true })

      if (error || !reviews) {
        console.error('Failed to fetch review data for streak calculation:', error)
        // Fallback to simple calculation based on lastPracticedAt
        return this.calculateSimpleStreak(items)
      }

      // Group reviews by date
      const dailyStats = new Map<string, { total: number; correct: number }>()
      
      reviews.forEach(review => {
        const date = new Date(review.reviewed_at).toISOString().split('T')[0]
        if (!dailyStats.has(date)) {
          dailyStats.set(date, { total: 0, correct: 0 })
        }
        const stats = dailyStats.get(date)!
        stats.total++
        if (review.is_correct) stats.correct++
      })

      // Determine which days meet the "complete" criteria
      // A day is complete if: min 5 reviews AND 60% accuracy
      const completeDays = new Set<string>()
      for (const [date, stats] of dailyStats.entries()) {
        if (stats.total >= 5 && (stats.correct / stats.total) >= 0.6) {
          completeDays.add(date)
        }
      }

      // Calculate current streak (consecutive days from today backwards)
      let currentStreak = 0
      const today = new Date()
      
      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(checkDate.getDate() - i)
        const dateStr = checkDate.toISOString().split('T')[0]
        
        if (completeDays.has(dateStr)) {
          currentStreak++
        } else {
          // Allow 1 day break if it's today or yesterday (user might not have studied yet today)
          if (i <= 1) {
            continue
          } else {
            break
          }
        }
      }

      // Calculate longest streak
      let longestStreak = 0
      let tempStreak = 0
      
      // Sort dates to check chronologically
      const sortedDates = Array.from(completeDays).sort()
      let prevDate: Date | null = null
      
      for (const dateStr of sortedDates) {
        const currentDate = new Date(dateStr)
        
        if (prevDate) {
          const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
          
          if (daysDiff === 1) {
            // Consecutive day
            tempStreak++
          } else {
            // Streak broken
            longestStreak = Math.max(longestStreak, tempStreak)
            tempStreak = 1
          }
        } else {
          tempStreak = 1
        }
        
        prevDate = currentDate
      }
      
      longestStreak = Math.max(longestStreak, tempStreak)

      return { current: currentStreak, longest: longestStreak }
    } catch (error) {
      console.error('Error calculating streak:', error)
      return this.calculateSimpleStreak(items)
    }
  }

  /**
   * Fallback streak calculation based on lastPracticedAt
   */
  private calculateSimpleStreak(items: UserVocabularyItem[]): { current: number; longest: number } {
    const recentPractice = items.filter(item => {
      if (!item.lastPracticedAt) return false
      const practiceDate = new Date(item.lastPracticedAt)
      const daysDiff = Math.floor((Date.now() - practiceDate.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff <= 1
    })

    return {
      current: recentPractice.length > 0 ? 1 : 0,
      longest: 1
    }
  }

  /**
   * Initialize a new vocabulary item with SRS defaults
   */
  getDefaultSRSValues(): Pick<
    UserVocabularyItem,
    'learningStatus' | 'easeFactor' | 'intervalDays' | 'nextReviewDate' | 'repetitions'
  > {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    return {
      learningStatus: 'new',
      easeFactor: 2.5,
      intervalDays: 1,
      nextReviewDate: tomorrow.toISOString(),
      repetitions: 0
    }
  }


  /**
   * Process a card rating in the current session
   */
  /**
   * Process a card rating in the current session
   */
  async processCard(sessionId: string, cardId: string, rating: SRSRating): Promise<ReviewSession> {
    try {
      // Load current session
      let currentSession = await this.loadSession()
      
      // If no session found or session ID doesn't match, this might be a new session
      // that hasn't been saved yet, so we'll trust the sessionId parameter
      if (!currentSession || currentSession.id !== sessionId) {
        console.warn('Session ID mismatch or no stored session. Attempting to find session by ID.')
        
        // For now, we'll throw an error but with more specific information
        if (!currentSession) {
          throw new Error('No active session found. Please start a new review session.')
        } else {
          console.warn('Session ID mismatch:', {
            expected: sessionId,
            found: currentSession.id,
            hasStoredSession: !!currentSession
          })
          // Let's try to continue with the stored session if it has cards
          if (currentSession.cards.length > 0) {
            console.log('Using stored session instead of expected session ID')
          } else {
            throw new Error('Session ID mismatch and stored session has no cards')
          }
        }
      }

      // Find the current card
      const currentCard = currentSession.cards[currentSession.currentIndex]
      if (!currentCard || currentCard.id !== cardId) {
        console.error('Card ID mismatch:', {
          expectedCardId: cardId,
          currentCardId: currentCard?.id,
          currentIndex: currentSession.currentIndex,
          totalCards: currentSession.cards.length
        })
        throw new Error('Invalid card ID')
      }

      // Process the review using existing method
      await this.processReview(cardId, rating)

      // Update session stats
      const updatedStats = { ...currentSession.sessionStats }
      updatedStats.reviewed++
      
      if (rating === 1) {
        updatedStats.again++
      } else if (rating === 2) {
        updatedStats.hard++
      } else if (rating === 3) {
        updatedStats.good++
        updatedStats.correct++
      } else if (rating === 4) {
        updatedStats.easy++
        updatedStats.correct++
      }

      // Create updated session
      const updatedSession: ReviewSession = {
        ...currentSession,
        currentIndex: currentSession.currentIndex + 1,
        sessionStats: updatedStats
      }

      // Save updated session
      this.saveSession(updatedSession)

      return updatedSession
    } catch (error) {
      console.error('Failed to process card:', error)
      throw error
    }
  }

  /**
   * Complete the current SRS session
   */
  async completeSession(sessionId: string): Promise<void> {
    try {
      const currentSession = await this.loadSession()
      if (!currentSession || currentSession.id !== sessionId) {
        throw new Error('Invalid session ID')
      }

      // Clear the session
      this.clearSession()

      console.log('SRS session completed:', {
        sessionId,
        reviewed: currentSession.sessionStats.reviewed,
        correct: currentSession.sessionStats.correct
      })
    } catch (error) {
      console.error('Failed to complete session:', error)
      throw error
    }
  }
}

export const srsService = new SRSService()
