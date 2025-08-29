import { Card, Scheduler } from '@open-spaced-repetition/sm-2'
import { userVocabularyService, type UserVocabularyItem } from './user-vocabulary-service'

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
      // Validate that we haven't completed all cards
      if (savedSession.currentIndex < savedSession.cards.length) {
        return savedSession
      }
    }
    
    // Start new session if no valid saved session
    return this.startReviewSession(maxCards)
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
      return await userVocabularyService.loadSRSSession()
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
  async getStats(): Promise<SRSStats> {
    try {
      const allItems = await userVocabularyService.getUserVocabularyDeck({ limit: 1000 })

      const now = new Date()
      const today = now.toISOString().split('T')[0]

      const dueToday = allItems.filter(item => {
        const reviewDate = new Date(item.nextReviewDate).toISOString().split('T')[0]
        return reviewDate <= today && ['learning', 'review'].includes(item.learningStatus)
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

      // Calculate streak (simplified - should be based on practice history)
      const streak = this.calculateStreak(allItems)

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

  /**
   * Calculate learning streak (simplified implementation)
   */
  private calculateStreak(items: UserVocabularyItem[]): { current: number; longest: number } {
    // This is a simplified implementation
    // In a real system, you'd track daily practice sessions
    const recentPractice = items.filter(item => {
      if (!item.lastPracticedAt) return false
      const practiceDate = new Date(item.lastPracticedAt)
      const daysDiff = Math.floor((Date.now() - practiceDate.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff <= 1
    })

    return {
      current: recentPractice.length > 0 ? 1 : 0,
      longest: 1 // Would need proper streak tracking
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
}

export const srsService = new SRSService()
