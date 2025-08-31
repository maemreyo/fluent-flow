import { getCurrentUser, supabase } from '../supabase/client'
import type {
  VocabularyPhrase,
  VocabularyWord
} from './vocabulary-analysis-service'

export interface UserVocabularyItem {
  id: string
  userId: string
  text: string
  itemType: 'word' | 'phrase'
  definition: string
  definitionVi?: string
  example?: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  
  // Word-specific fields
  partOfSpeech?: string
  pronunciation?: string
  synonyms?: string[]
  antonyms?: string[]
  
  // Phrase-specific fields
  phraseType?: string
  
  // Source information
  sourceLoopId?: string
  frequency: number
  
  // SRS fields
  learningStatus: 'new' | 'learning' | 'review' | 'mature' | 'suspended'
  easeFactor: number
  intervalDays: number
  nextReviewDate: string
  repetitions: number
  
  // Tracking fields
  timesPracticed: number
  timesCorrect: number
  timesIncorrect: number
  lastPracticedAt?: string
  
  createdAt: string
  updatedAt: string
}

export interface LearningStats {
  id: string
  userId: string
  totalWordsAdded: number
  totalPhrasesAdded: number
  wordsLearned: number
  phrasesLearned: number
  currentStreakDays: number
  longestStreakDays: number
  lastPracticeDate?: string
  totalReviews: number
  correctReviews: number
  createdAt: string
  updatedAt: string
}

export class UserVocabularyService {
  /**
   * Add a vocabulary item to user's personal deck (Star functionality)
   */
  async addToPersonalDeck(
    item: VocabularyWord | VocabularyPhrase,
    type: 'word' | 'phrase',
    sourceLoopId?: string
  ): Promise<{ id: string } | null> {
    try {
      const user = await getCurrentUser()
      if (!user) {
        console.warn('No user authenticated, cannot add to personal deck')
        return null
      }

      const isWord = type === 'word'
      const word = isWord ? (item as VocabularyWord) : null
      const phrase = !isWord ? (item as VocabularyPhrase) : null
      const text = isWord ? word!.word : phrase!.phrase

      // Check if already exists using raw SQL for now
      const { data: existing } = await (supabase as any)
        .from('user_vocabulary_deck')
        .select('id')
        .eq('user_id', user.id)
        .eq('text', text)
        .eq('item_type', type)
        .maybeSingle()

      if (existing) {
        console.log('Vocabulary item already in personal deck:', text)
        return { id: existing.id }
      }

      // Insert new vocabulary item using raw SQL for now
      const { data, error } = await (supabase as any)
        .from('user_vocabulary_deck')
        .insert({
          user_id: user.id,
          text,
          item_type: type,
          definition: item.definition,
          definition_vi: item.definitionVi,
          example: item.example,
          difficulty: item.difficulty,
          
          // Word-specific fields
          part_of_speech: word?.partOfSpeech,
          pronunciation: word?.pronunciation,
          synonyms: word?.synonyms || [],
          antonyms: word?.antonyms || [],
          
          // Phrase-specific fields
          phrase_type: phrase?.type,
          
          // Source info
          source_loop_id: sourceLoopId,
          frequency: item.frequency || 1,
          
          // SRS defaults
          learning_status: 'new',
          ease_factor: 2.50,
          interval_days: 1,
          next_review_date: new Date().toISOString(),
          repetitions: 0,
          
          // Tracking defaults
          times_practiced: 0,
          times_correct: 0,
          times_incorrect: 0
        })
        .select('id')
        .single()

      if (error) {
        console.error('Database error adding to personal deck:', error)
        return null
      }

      console.log(`Added ${type} to personal deck:`, text)
      
      // Update learning stats - increment items added
      await this.incrementItemsAdded(type)

      return { id: data.id }
    } catch (error) {
      console.error('Failed to add to personal deck:', error)
      return null
    }
  }

  /**
   * Remove a vocabulary item from user's personal deck (Unstar functionality)
   */
  async removeFromPersonalDeck(text: string, type: 'word' | 'phrase'): Promise<boolean> {
    try {
      const user = await getCurrentUser()
      if (!user) return false

      const { error } = await (supabase as any)
        .from('user_vocabulary_deck')
        .delete()
        .eq('user_id', user.id)
        .eq('text', text)
        .eq('item_type', type)

      if (error) {
        console.error('Database error removing from personal deck:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Failed to remove from personal deck:', error)
      return false
    }
  }

  /**
   * Delete a vocabulary item by ID from user's personal deck
   */
  async deleteVocabularyItem(vocabularyId: string): Promise<boolean> {
    try {
      const user = await getCurrentUser()
      if (!user) {
        console.warn('No user authenticated, cannot delete vocabulary item')
        return false
      }

      console.log('Deleting vocabulary item:', vocabularyId, 'for user:', user.id)

      const { error } = await (supabase as any)
        .from('user_vocabulary_deck')
        .delete()
        .eq('id', vocabularyId)
        .eq('user_id', user.id) // Ensure user can only delete their own words

      if (error) {
        console.error('Database error deleting vocabulary item:', error)
        return false
      }

      console.log('Successfully deleted vocabulary item:', vocabularyId)
      return true
    } catch (error) {
      console.error('Failed to delete vocabulary item:', error)
      return false
    }
  }

  /**
   * Check if a vocabulary item is in user's personal deck
   */
  async isInPersonalDeck(text: string, type: 'word' | 'phrase'): Promise<boolean> {
    try {
      const user = await getCurrentUser()
      if (!user) return false

      const { data } = await (supabase as any)
        .from('user_vocabulary_deck')
        .select('id')
        .eq('user_id', user.id)
        .eq('text', text)
        .eq('item_type', type)
        .maybeSingle()

      return !!data
    } catch (error) {
      console.error('Failed to check if in personal deck:', error)
      return false
    }
  }

  /**
   * Get user's vocabulary deck with pagination and filtering
   */
  async getUserVocabularyDeck(options: {
    status?: 'new' | 'learning' | 'review' | 'mature' | 'suspended'
    type?: 'word' | 'phrase'
    limit?: number
    offset?: number
  } = {}): Promise<UserVocabularyItem[]> {
    try {
      const user = await getCurrentUser()
      if (!user) return []

      let query = (supabase as any)
        .from('user_vocabulary_deck')
        .select('*')
        .eq('user_id', user.id)

      if (options.status) {
        query = query.eq('learning_status', options.status)
      }

      if (options.type) {
        query = query.eq('item_type', options.type)
      }

      query = query
        .order('created_at', { ascending: false })
        .limit(options.limit || 50)

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) {
        console.error('Database error getting vocabulary deck:', error)
        return []
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        text: item.text,
        itemType: item.item_type,
        definition: item.definition,
        definitionVi: item.definition_vi,
        example: item.example,
        difficulty: item.difficulty,
        partOfSpeech: item.part_of_speech,
        pronunciation: item.pronunciation,
        synonyms: item.synonyms || [],
        antonyms: item.antonyms || [],
        phraseType: item.phrase_type,
        sourceLoopId: item.source_loop_id,
        frequency: item.frequency,
        learningStatus: item.learning_status,
        easeFactor: item.ease_factor,
        intervalDays: item.interval_days,
        nextReviewDate: item.next_review_date,
        repetitions: item.repetitions,
        timesPracticed: item.times_practiced,
        timesCorrect: item.times_correct,
        timesIncorrect: item.times_incorrect,
        lastPracticedAt: item.last_practiced_at,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }))
    } catch (error) {
      console.error('Failed to get user vocabulary deck:', error)
      return []
    }
  }

  /**
   * Get vocabulary items due for review
   */
  async getItemsDueForReview(): Promise<UserVocabularyItem[]> {
    try {
      const user = await getCurrentUser()
      if (!user) return []

      const { data, error } = await (supabase as any)
        .from('user_vocabulary_deck')
        .select('*')
        .eq('user_id', user.id)
        .in('learning_status', ['learning', 'review'])
        .lte('next_review_date', new Date().toISOString())
        .order('next_review_date', { ascending: true })
        .limit(20)

      if (error) {
        console.error('Database error getting items due for review:', error)
        return []
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        text: item.text,
        itemType: item.item_type,
        definition: item.definition,
        definitionVi: item.definition_vi,
        example: item.example,
        difficulty: item.difficulty,
        partOfSpeech: item.part_of_speech,
        pronunciation: item.pronunciation,
        synonyms: item.synonyms || [],
        antonyms: item.antonyms || [],
        phraseType: item.phrase_type,
        sourceLoopId: item.source_loop_id,
        frequency: item.frequency,
        learningStatus: item.learning_status,
        easeFactor: item.ease_factor,
        intervalDays: item.interval_days,
        nextReviewDate: item.next_review_date,
        repetitions: item.repetitions,
        timesPracticed: item.times_practiced,
        timesCorrect: item.times_correct,
        timesIncorrect: item.times_incorrect,
        lastPracticedAt: item.last_practiced_at,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }))
    } catch (error) {
      console.error('Failed to get items due for review:', error)
      return []
    }
  }

  /**
   * Update a vocabulary item with new SRS values
   */
  async updateVocabularyItem(id: string, updates: Partial<UserVocabularyItem>): Promise<boolean> {
    try {
      const user = await getCurrentUser()
      if (!user) return false

      const dbUpdates: any = {}
      
      // Map TypeScript field names to database column names
      if (updates.learningStatus) dbUpdates.learning_status = updates.learningStatus
      if (updates.easeFactor) dbUpdates.ease_factor = updates.easeFactor
      if (updates.intervalDays) dbUpdates.interval_days = updates.intervalDays
      if (updates.nextReviewDate) dbUpdates.next_review_date = updates.nextReviewDate
      if (updates.repetitions !== undefined) dbUpdates.repetitions = updates.repetitions
      if (updates.timesPracticed !== undefined) dbUpdates.times_practiced = updates.timesPracticed
      if (updates.timesCorrect !== undefined) dbUpdates.times_correct = updates.timesCorrect
      if (updates.timesIncorrect !== undefined) dbUpdates.times_incorrect = updates.timesIncorrect
      if (updates.lastPracticedAt) dbUpdates.last_practiced_at = updates.lastPracticedAt
      
      dbUpdates.updated_at = new Date().toISOString()

      const { error } = await (supabase as any)
        .from('user_vocabulary_deck')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Database error updating vocabulary item:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Failed to update vocabulary item:', error)
      return false
    }
  }

  /**
   * Get user learning statistics
   */
  async getUserStats(): Promise<LearningStats | null> {
    try {
      const user = await getCurrentUser()
      if (!user) return null

      // Query user learning stats from database
      const { data: stats, error } = await supabase
        .from('user_learning_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error || !stats) {
        // If no stats exist, create default stats
        const defaultStats = {
          id: `stats_${user.id}`,
          userId: user.id,
          totalWordsAdded: 0,
          totalPhrasesAdded: 0,
          wordsLearned: 0,
          phrasesLearned: 0,
          currentStreakDays: 0,
          longestStreakDays: 0,
          lastPracticeDate: undefined,
          totalReviews: 0,
          correctReviews: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        // Try to create initial stats record
        const { error: createError } = await supabase
          .from('user_learning_stats')
          .insert({
            user_id: user.id,
            total_words_added: 0,
            total_phrases_added: 0,
            words_learned: 0,
            phrases_learned: 0,
            current_streak_days: 0,
            longest_streak_days: 0,
            total_reviews: 0,
            correct_reviews: 0
          })

        if (createError) {
          console.error('Error creating initial user stats:', createError)
        }

        return defaultStats
      }

      // Transform database format to LearningStats format
      return {
        id: stats.id,
        userId: stats.user_id,
        totalWordsAdded: stats.total_words_added || 0,
        totalPhrasesAdded: stats.total_phrases_added || 0,
        wordsLearned: stats.words_learned || 0,
        phrasesLearned: stats.phrases_learned || 0,
        currentStreakDays: stats.current_streak_days || 0,
        longestStreakDays: stats.longest_streak_days || 0,
        lastPracticeDate: stats.last_practice_date || undefined,
        totalReviews: stats.total_reviews || 0,
        correctReviews: stats.correct_reviews || 0,
        createdAt: stats.created_at,
        updatedAt: stats.updated_at
      }
    } catch (error) {
      console.error('Error fetching user learning stats:', error)
      return null
    }
  }

  /**
   * Update user learning statistics
   */
  async updateUserStats(updates: {
    totalWordsAdded?: number
    totalPhrasesAdded?: number
    wordsLearned?: number
    phrasesLearned?: number
    currentStreakDays?: number
    longestStreakDays?: number
    lastPracticeDate?: string
    totalReviews?: number
    correctReviews?: number
  }): Promise<boolean> {
    try {
      const user = await getCurrentUser()
      if (!user) return false

      const dbUpdates: any = {}
      const now = new Date().toISOString()

      // Map updates to database column names
      if (updates.totalWordsAdded !== undefined) dbUpdates.total_words_added = updates.totalWordsAdded
      if (updates.totalPhrasesAdded !== undefined) dbUpdates.total_phrases_added = updates.totalPhrasesAdded
      if (updates.wordsLearned !== undefined) dbUpdates.words_learned = updates.wordsLearned
      if (updates.phrasesLearned !== undefined) dbUpdates.phrases_learned = updates.phrasesLearned
      if (updates.currentStreakDays !== undefined) dbUpdates.current_streak_days = updates.currentStreakDays
      if (updates.longestStreakDays !== undefined) dbUpdates.longest_streak_days = updates.longestStreakDays
      if (updates.lastPracticeDate !== undefined) dbUpdates.last_practice_date = updates.lastPracticeDate
      if (updates.totalReviews !== undefined) dbUpdates.total_reviews = updates.totalReviews
      if (updates.correctReviews !== undefined) dbUpdates.correct_reviews = updates.correctReviews
      
      dbUpdates.updated_at = now

      // Use upsert to handle case where stats don't exist yet
      const { error } = await supabase
        .from('user_learning_stats')
        .upsert({
          user_id: user.id,
          ...dbUpdates
        }, {
          onConflict: 'user_id'
        })

      if (error) {
        console.error('Error updating user learning stats:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Failed to update user learning stats:', error)
      return false
    }
  }

  /**
   * Increment stats when a new vocabulary item is added
   */
  async incrementItemsAdded(type: 'word' | 'phrase'): Promise<void> {
    try {
      const currentStats = await this.getUserStats()
      if (!currentStats) return

      const updates = type === 'word' 
        ? { totalWordsAdded: currentStats.totalWordsAdded + 1 }
        : { totalPhrasesAdded: currentStats.totalPhrasesAdded + 1 }

      await this.updateUserStats(updates)
    } catch (error) {
      console.error('Failed to increment items added:', error)
    }
  }

  /**
   * Increment stats when an item reaches mature status
   */
  async incrementItemsLearned(type: 'word' | 'phrase'): Promise<void> {
    try {
      const currentStats = await this.getUserStats()
      if (!currentStats) return

      const updates = type === 'word' 
        ? { wordsLearned: currentStats.wordsLearned + 1 }
        : { phrasesLearned: currentStats.phrasesLearned + 1 }

      await this.updateUserStats(updates)
    } catch (error) {
      console.error('Failed to increment items learned:', error)
    }
  }

  /**
   * Update review statistics and streaks
   */
  async updateReviewStats(isCorrect: boolean): Promise<void> {
    try {
      const currentStats = await this.getUserStats()
      if (!currentStats) return

      // Calculate streak using SRS service
      const { srsService } = await import('./srs-service')
      const srsStats = await srsService.getStats()

      const updates = {
        totalReviews: currentStats.totalReviews + 1,
        correctReviews: currentStats.correctReviews + (isCorrect ? 1 : 0),
        currentStreakDays: srsStats.currentStreak,
        longestStreakDays: Math.max(currentStats.longestStreakDays, srsStats.longestStreak),
        lastPracticeDate: new Date().toISOString()
      }

      await this.updateUserStats(updates)
    } catch (error) {
      console.error('Failed to update review stats:', error)
    }
  }

  // SRS Session persistence methods
  async saveSRSSession(session: any): Promise<void> {
    try {
      const user = await getCurrentUser()
      if (!user?.id) return

      const { data, error } = await (supabase as any)
        .from('user_srs_sessions')
        .upsert({
          user_id: user.id,
          session_data: session,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) {
        console.error('Failed to save SRS session to database:', error)
      }
    } catch (error) {
      console.error('Failed to save SRS session:', error)
    }
  }

  async loadSRSSession(): Promise<any | null> {
    try {
      const user = await getCurrentUser()
      if (!user?.id) return null

      const { data, error } = await (supabase as any)
        .from('user_srs_sessions')
        .select('session_data, updated_at')
        .eq('user_id', user.id)
        .maybeSingle() // Use maybeSingle() instead of single() to handle zero rows

      if (error) {
        console.error('Error loading SRS session:', error)
        return null
      }

      // If no session found, return null
      if (!data) {
        return null
      }

      // Check if session is still valid (within 24 hours)
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours
      const sessionAge = Date.now() - new Date(data.updated_at).getTime()
      
      if (sessionAge > maxAge) {
        await this.clearSRSSession()
        return null
      }

      return data.session_data
    } catch (error) {
      console.error('Failed to load SRS session from database:', error)
      return null
    }
  }

  async clearSRSSession(): Promise<void> {
    try {
      const user = await getCurrentUser()
      if (!user?.id) return

      const { error } = await (supabase as any)
        .from('user_srs_sessions')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        console.error('Failed to clear SRS session from database:', error)
      }
    } catch (error) {
      console.error('Failed to clear SRS session:', error)
    }
  }
}

// Export singleton instance
export const userVocabularyService = new UserVocabularyService()
