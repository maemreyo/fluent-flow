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
  totalPracticeSessions: number
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

      // For now, return mock stats since tables don't exist yet
      return {
        id: 'mock-id',
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
        totalPracticeSessions: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to get user stats:', error)
      return null
    }
  }
}

// Export singleton instance
export const userVocabularyService = new UserVocabularyService()
