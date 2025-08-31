/**
 * Bridge service to provide authenticated access to vocabulary data for word explorer
 * This solves the RLS authentication issue where word explorer can't access data via direct API calls
 */

import { userService } from '../../fluent-flow-transcript-service/src/lib/services/user-service'
import { getCurrentUser } from '../supabase/client'

export interface VocabularyItem {
  id: string
  user_id: string
  text: string
  item_type: string
  definition: string
  definition_vi?: string
  example?: string
  context?: string
  difficulty: string
  part_of_speech?: string
  pronunciation?: string
  synonyms: string[]
  antonyms: string[]
  phrase_type?: string
  source_loop_id?: string
  frequency: number
  learning_status: string
  ease_factor: number
  interval_days: number
  next_review_date: string
  repetitions: number
  times_practiced: number
  times_correct: number
  times_incorrect: number
  last_practiced_at?: string
  created_at: string
  updated_at: string
  is_starred: boolean
}

export class VocabularyApiBridge {
  private static instance: VocabularyApiBridge

  static getInstance(): VocabularyApiBridge {
    if (!this.instance) {
      this.instance = new VocabularyApiBridge()
    }
    return this.instance
  }

  /**
   * Get user vocabulary with proper authentication
   * This should be used by word explorer instead of direct API calls
   */
  async getUserVocabulary(options?: {
    limit?: number
    starred?: boolean
    difficulty?: string
    order?: 'desc' | 'asc'
  }): Promise<VocabularyItem[]> {
    try {
      console.log('VocabularyApiBridge: Getting authenticated vocabulary data...')

      // Import from the transcript service

      const currentUser = await getCurrentUser()
      if (!currentUser) {
        console.warn('VocabularyApiBridge: No authenticated user found')
        return []
      }

      console.log('VocabularyApiBridge: User authenticated:', currentUser.id)

      const vocabularyData = await userService.getUserVocabulary(currentUser.id, {
        limit: options?.limit || 100,
        starred: options?.starred,
        difficulty: options?.difficulty
      })

      console.log('VocabularyApiBridge: Retrieved', vocabularyData.length, 'vocabulary items')

      // Transform to match expected format
      const transformedData: VocabularyItem[] = vocabularyData.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        text: item.text,
        item_type: item.item_type,
        definition: item.definition,
        definition_vi: item.definition_vi,
        example: item.example,
        context: item.context,
        difficulty: item.difficulty,
        part_of_speech: item.part_of_speech,
        pronunciation: item.pronunciation,
        synonyms: Array.isArray(item.synonyms) ? item.synonyms.map(s => String(s)) : [],
        antonyms: Array.isArray(item.antonyms) ? item.antonyms.map(a => String(a)) : [],
        phrase_type: item.phrase_type,
        source_loop_id: item.source_loop_id,
        frequency: item.frequency || 1,
        learning_status: item.learning_status,
        ease_factor: item.ease_factor || 2.5,
        interval_days: item.interval_days || 1,
        next_review_date: item.next_review_date || new Date().toISOString(),
        repetitions: item.repetitions || 0,
        times_practiced: item.times_practiced || 0,
        times_correct: item.times_correct || 0,
        times_incorrect: item.times_incorrect || 0,
        last_practiced_at: item.last_practiced_at,
        created_at: item.created_at,
        updated_at: item.updated_at,
        is_starred: item.is_starred || false
      }))

      // Apply ordering if specified
      if (options?.order === 'desc') {
        transformedData.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      } else if (options?.order === 'asc') {
        transformedData.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      }

      return transformedData
    } catch (error) {
      console.error('VocabularyApiBridge: Failed to get vocabulary data:', error)
      return []
    }
  }

  /**
   * Get recently added words (within last 24 hours)
   */
  async getRecentlyAddedWords(limit: number = 50): Promise<VocabularyItem[]> {
    try {
      const allVocabulary = await this.getUserVocabulary({ limit: 200, order: 'desc' })

      // Filter for words added in the last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

      return allVocabulary
        .filter(item => new Date(item.created_at) > twentyFourHoursAgo)
        .slice(0, limit)
    } catch (error) {
      console.error('VocabularyApiBridge: Failed to get recently added words:', error)
      return []
    }
  }

  /**
   * Test the connection and authentication
   */
  async testConnection(): Promise<{ success: boolean; message: string; userCount?: number }> {
    try {
      const data = await this.getUserVocabulary({ limit: 1 })

      return {
        success: true,
        message: `Connection successful. User has ${data.length > 0 ? 'vocabulary data' : 'no vocabulary data'}.`,
        userCount: data.length
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Delete a vocabulary item from the user's deck
   */
  async deleteVocabularyItem(vocabularyId: string): Promise<boolean> {
    try {
      console.log('VocabularyApiBridge: Deleting vocabulary item:', vocabularyId)
      
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        console.warn('VocabularyApiBridge: No authenticated user found for deletion')
        return false
      }

      const result = await userService.deleteVocabularyFromDeck(vocabularyId)
      
      console.log('VocabularyApiBridge: Delete result:', result)
      return result
    } catch (error) {
      console.error('VocabularyApiBridge: Failed to delete vocabulary item:', error)
      return false
    }
  }

  /**
   * Delete multiple vocabulary items from the user's deck
   */
  async deleteMultipleVocabularyItems(vocabularyIds: string[]): Promise<{ success: number; failed: number; total: number }> {
    const results = { success: 0, failed: 0, total: vocabularyIds.length }
    
    try {
      console.log('VocabularyApiBridge: Bulk deleting vocabulary items:', vocabularyIds.length)
      
      for (const id of vocabularyIds) {
        const deleted = await this.deleteVocabularyItem(id)
        if (deleted) {
          results.success++
        } else {
          results.failed++
        }
      }
      
      console.log('VocabularyApiBridge: Bulk delete results:', results)
      return results
    } catch (error) {
      console.error('VocabularyApiBridge: Failed bulk delete:', error)
      results.failed = results.total
      return results
    }
  }
}

// Export singleton instance for global access
export const vocabularyApiBridge = VocabularyApiBridge.getInstance()

// Make it globally available for word explorer
declare global {
  interface Window {
    vocabularyApiBridge: VocabularyApiBridge
  }
}

// Attach to window for global access
if (typeof window !== 'undefined') {
  window.vocabularyApiBridge = vocabularyApiBridge
}
