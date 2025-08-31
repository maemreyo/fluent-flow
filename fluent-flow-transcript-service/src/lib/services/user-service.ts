'use client'

import { supabase } from '../supabase/client'
import type { Database } from '../supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']
type UserVocabularyDeck = Database['public']['Tables']['user_vocabulary_deck']['Row']
type UserVocabularyReview = Database['public']['Tables']['user_vocabulary_reviews']['Row']

export class UserService {
  // Get user profile
  async getUserProfile(userId: string): Promise<Profile | null> {
    if (!supabase) return null
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
    
    return data
  }

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
    if (!supabase) return null
    
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating user profile:', error)
      return null
    }
    
    return data
  }

  // Get user vocabulary deck with filtering and pagination
  async getUserVocabulary(
    userId: string, 
    options?: {
      starred?: boolean
      difficulty?: string
      limit?: number
      offset?: number
    }
  ): Promise<UserVocabularyDeck[]> {
    if (!supabase) return []
    
    let query = supabase
      .from('user_vocabulary_deck')
      .select('*')
      .eq('user_id', userId)
    
    if (options?.starred) {
      query = query.eq('is_starred', true)
    }
    
    if (options?.difficulty) {
      query = query.eq('difficulty', options.difficulty)
    }
    
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching user vocabulary:', error)
      return []
    }
    
    return data || []
  }

  // Star/unstar vocabulary
  async toggleVocabularyStar(vocabularyId: string, isStarred: boolean): Promise<boolean> {
    if (!supabase) return false
    
    const { error } = await supabase
      .from('user_vocabulary_deck')
      .update({ 
        is_starred: isStarred,
        updated_at: new Date().toISOString()
      })
      .eq('id', vocabularyId)
    
    if (error) {
      console.error('Error toggling vocabulary star:', error)
      return false
    }
    
    return true
  }

  // Add vocabulary to user deck
  async addVocabularyToDeck(
    userId: string,
    vocabularyData: {
      text: string
      definition: string
      definition_vi?: string
      example?: string
      difficulty?: string
      item_type?: string
      learning_status?: string
    }
  ): Promise<UserVocabularyDeck | null> {
    if (!supabase) return null
    
    const { data, error } = await supabase
      .from('user_vocabulary_deck')
      .insert({
        user_id: userId,
        text: vocabularyData.text,
        definition: vocabularyData.definition,
        definition_vi: vocabularyData.definition_vi,
        example: vocabularyData.example,
        difficulty: vocabularyData.difficulty || 'medium',
        item_type: vocabularyData.item_type || 'word',
        learning_status: vocabularyData.learning_status || 'new',
        ease_factor: 2.5, // Default ease factor for SRS
        interval_days: 1,
        next_review_date: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error adding vocabulary to deck:', error)
      return null
    }
    
    return data
  }

  // Get vocabulary due for review
  async getVocabularyForReview(userId: string): Promise<UserVocabularyDeck[]> {
    if (!supabase) return []
    
    const today = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('user_vocabulary_deck')
      .select('*')
      .eq('user_id', userId)
      .lte('next_review_date', today)
      .order('next_review_date', { ascending: true })
      .limit(20) // Limit review sessions
    
    if (error) {
      console.error('Error fetching vocabulary for review:', error)
      return []
    }
    
    return data || []
  }

  // Record vocabulary review
  async recordVocabularyReview(
    vocabularyId: string,
    isCorrect: boolean,
    responseTimeMs: number,
    reviewType: string = 'flashcard'
  ): Promise<boolean> {
    if (!supabase) return false
    
    // First, get current vocabulary data
    const { data: vocab, error: fetchError } = await supabase
      .from('user_vocabulary_deck')
      .select('*')
      .eq('id', vocabularyId)
      .single()
    
    if (fetchError || !vocab) {
      console.error('Error fetching vocabulary for review:', fetchError)
      return false
    }
    
    // Calculate new SRS values
    const currentEase = vocab.ease_factor || 2.5
    const currentInterval = vocab.interval_days || 1
    
    let newEase = currentEase
    let newInterval = currentInterval
    
    if (isCorrect) {
      if (currentInterval === 1) {
        newInterval = 6
      } else {
        newInterval = Math.round(currentInterval * currentEase)
      }
      newEase = Math.max(1.3, currentEase + 0.1)
    } else {
      newInterval = 1
      newEase = Math.max(1.3, currentEase - 0.2)
    }
    
    const nextReviewDate = new Date()
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval)
    
    // Update vocabulary record
    const { error: updateError } = await supabase
      .from('user_vocabulary_deck')
      .update({
        ease_factor: newEase,
        interval_days: newInterval,
        next_review_date: nextReviewDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', vocabularyId)
    
    // Record the review
    const { error: reviewError } = await supabase
      .from('user_vocabulary_reviews')
      .insert({
        vocabulary_id: vocabularyId,
        user_id: vocab.user_id,
        is_correct: isCorrect,
        response_time_ms: responseTimeMs,
        review_type: reviewType,
        new_ease_factor: newEase,
        new_interval_days: newInterval,
        new_next_review_date: nextReviewDate.toISOString(),
        reviewed_at: new Date().toISOString()
      })
    
    if (updateError || reviewError) {
      console.error('Error recording vocabulary review:', updateError || reviewError)
      return false
    }
    
    return true
  }

  // Get user vocabulary statistics
  async getUserVocabularyStats(userId: string): Promise<{
    totalWords: number
    starredWords: number
    wordsForReview: number
    reviewsToday: number
  }> {
    if (!supabase) return { totalWords: 0, starredWords: 0, wordsForReview: 0, reviewsToday: 0 }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    // Get total words
    const { count: totalWords } = await supabase
      .from('user_vocabulary_deck')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    
    // Get starred words
    const { count: starredWords } = await supabase
      .from('user_vocabulary_deck')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_starred', true)
    
    // Get words for review
    const { count: wordsForReview } = await supabase
      .from('user_vocabulary_deck')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('next_review_date', new Date().toISOString())
    
    // Get reviews today
    const { count: reviewsToday } = await supabase
      .from('user_vocabulary_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('reviewed_at', today.toISOString())
      .lt('reviewed_at', tomorrow.toISOString())
    
    return {
      totalWords: totalWords || 0,
      starredWords: starredWords || 0,
      wordsForReview: wordsForReview || 0,
      reviewsToday: reviewsToday || 0
    }
  }

  // Get vocabulary data for word explorer (authenticated)
  async getVocabularyForWordExplorer(): Promise<{
    success: boolean
    data: UserVocabularyDeck[]
    error?: string
  }> {
    try {
      const { getCurrentUser } = await import('../supabase/client')
      const currentUser = await getCurrentUser()
      
      if (!currentUser) {
        return {
          success: false,
          data: [],
          error: 'User not authenticated'
        }
      }

      console.log('Getting vocabulary for word explorer, user:', currentUser.id)
      
      const vocabularyData = await this.getUserVocabulary(currentUser.id, {
        limit: 100
      })
      
      console.log('Retrieved vocabulary data for word explorer:', vocabularyData.length, 'items')
      
      return {
        success: true,
        data: vocabularyData
      }
    } catch (error) {
      console.error('Error getting vocabulary for word explorer:', error)
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to get vocabulary data'
      }
    }
  }
}

export const userService = new UserService()