import {
  wordSelectionService,
  type SelectedWord
} from '../../fluent-flow-transcript-service/src/lib/services/word-selection-service'
import { userVocabularyService, type UserVocabularyItem } from './user-vocabulary-service'

/**
 * Service to bridge selected words from quiz pages to Word Explorer in newtab
 */
export class WordExplorerBridgeService {
  private readonly BRIDGE_STORAGE_KEY = 'fluent_flow_word_explorer_bridge'

  /**
   * Add a word from quiz/transcript to Word Explorer
   */
  async addWordToExplorer(selectedWord: SelectedWord): Promise<boolean> {
    try {
      const vocabularyWord = {
        word: selectedWord.word,
        definition: selectedWord.definition || `Word selected from ${selectedWord.sourceType}`,
        example: selectedWord.context,
        difficulty: this.inferDifficulty(selectedWord.word),
        collocations: selectedWord.collocations || [],
        frequency: 1,
        partOfSpeech: '',
        pronunciation: '',
        synonyms: [],
        antonyms: []
      }

      // Add to user vocabulary deck
      await userVocabularyService.addToPersonalDeck(
        vocabularyWord,
        'word',
        selectedWord.sourceId
      )

      // Store bridge data for immediate access in newtab
      await this.storeBridgeData({
        word: selectedWord.word,
        addedAt: new Date(),
        source: selectedWord.sourceType,
        shouldHighlight: true
      })

      return true
    } catch (error) {
      console.error('Failed to add word to explorer:', error)
      return false
    }
  }

  /**
   * Get recently added words that should be highlighted in Word Explorer
   */
  async getRecentlyAddedWords(): Promise<{ word: string; addedAt: Date }[]> {
    try {
      if (typeof window === 'undefined') return []

      const stored = localStorage.getItem(this.BRIDGE_STORAGE_KEY)
      if (!stored) return []

      const bridgeData = JSON.parse(stored) as Array<{
        word: string
        addedAt: string
        source: string
        shouldHighlight: boolean
      }>

      // Return words added in the last 5 minutes that should be highlighted
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      return bridgeData
        .filter(item => item.shouldHighlight && new Date(item.addedAt) > fiveMinutesAgo)
        .map(item => ({
          word: item.word,
          addedAt: new Date(item.addedAt)
        }))
    } catch (error) {
      console.error('Failed to get recently added words:', error)
      return []
    }
  }

  /**
   * Mark a word as no longer needing highlight (user has seen it)
   */
  async markWordAsSeen(word: string): Promise<void> {
    try {
      if (typeof window === 'undefined') return

      const stored = localStorage.getItem(this.BRIDGE_STORAGE_KEY)
      if (!stored) return

      const bridgeData = JSON.parse(stored) as Array<{
        word: string
        addedAt: string
        source: string
        shouldHighlight: boolean
      }>

      const updated = bridgeData.map(item =>
        item.word.toLowerCase() === word.toLowerCase() ? { ...item, shouldHighlight: false } : item
      )

      localStorage.setItem(this.BRIDGE_STORAGE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to mark word as seen:', error)
    }
  }

  /**
   * Process all selected words and add them to Word Explorer
   */
  async syncSelectedWordsToExplorer(): Promise<number> {
    try {
      const selectedWords = await wordSelectionService.getSelectedWords()
      let addedCount = 0

      for (const word of selectedWords) {
        const success = await this.addWordToExplorer(word)
        if (success) addedCount++
      }

      return addedCount
    } catch (error) {
      console.error('Failed to sync selected words:', error)
      return 0
    }
  }

  /**
   * Clear bridge data (for cleanup)
   */
  async clearBridgeData(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(this.BRIDGE_STORAGE_KEY)
      }
    } catch (error) {
      console.error('Failed to clear bridge data:', error)
    }
  }

  /**
   * Get user vocabulary data with proper authentication for word explorer
   * This solves the RLS authentication issue
   */
  async getAuthenticatedVocabularyData(): Promise<{
    success: boolean
    data: any[]
    error?: string
  }> {
    try {
      console.log('Getting authenticated vocabulary data for word explorer...')
      
      // Import user service dynamically
      const { userService } = await import('../../fluent-flow-transcript-service/src/lib/services/user-service')
      
      const result = await userService.getVocabularyForWordExplorer()
      
      console.log('Word explorer vocabulary result:', result.success ? `${result.data.length} items` : result.error)
      
      return result
    } catch (error) {
      console.error('Failed to get authenticated vocabulary data:', error)
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to get vocabulary data'
      }
    }
  }

  /**
   * Alternative method that word explorer can use instead of direct API calls
   * This bypasses the RLS issue by using authenticated Supabase client
   */
  async getVocabularyForExplorer(limit: number = 100): Promise<any[]> {
    try {
      const result = await this.getAuthenticatedVocabularyData()
      
      if (!result.success) {
        console.warn('Failed to get vocabulary data:', result.error)
        return []
      }
      
      // Transform the data to match what word explorer expects
      return result.data.slice(0, limit).map(item => ({
        id: item.id,
        user_id: item.user_id,
        text: item.text,
        item_type: item.item_type,
        definition: item.definition,
        definition_vi: item.definition_vi,
        example: item.example,
        difficulty: item.difficulty,
        part_of_speech: item.part_of_speech,
        pronunciation: item.pronunciation,
        synonyms: item.synonyms || [],
        antonyms: item.antonyms || [],
        phrase_type: item.phrase_type,
        source_loop_id: item.source_loop_id,
        frequency: item.frequency || 1,
        learning_status: item.learning_status,
        ease_factor: item.ease_factor,
        interval_days: item.interval_days,
        next_review_date: item.next_review_date,
        repetitions: item.repetitions || 0,
        times_practiced: item.times_practiced || 0,
        times_correct: item.times_correct || 0,
        times_incorrect: item.times_incorrect || 0,
        last_practiced_at: item.last_practiced_at,
        created_at: item.created_at,
        updated_at: item.updated_at,
        is_starred: item.is_starred || false
      }))
    } catch (error) {
      console.error('Failed to get vocabulary for explorer:', error)
      return []
    }
  }

  /**
   * Store bridge data for communication between quiz and newtab
   */
  private async storeBridgeData(data: {
    word: string
    addedAt: Date
    source: string
    shouldHighlight: boolean
  }): Promise<void> {
    try {
      if (typeof window === 'undefined') return

      const stored = localStorage.getItem(this.BRIDGE_STORAGE_KEY)
      const bridgeData = stored ? JSON.parse(stored) : []

      // Add new data, keeping only last 50 entries
      const updated = [
        {
          ...data,
          addedAt: data.addedAt.toISOString()
        },
        ...bridgeData
      ].slice(0, 50)

      localStorage.setItem(this.BRIDGE_STORAGE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to store bridge data:', error)
    }
  }

  /**
   * Infer difficulty based on word characteristics
   */
  private inferDifficulty(word: string): 'beginner' | 'intermediate' | 'advanced' {
    const length = word.length
    const hasComplexPattern = /[^a-zA-Z\s]/.test(word) || word.includes('-')

    if (length <= 4) return 'beginner'
    if (length <= 8 && !hasComplexPattern) return 'intermediate'
    return 'advanced'
  }
}

export const wordExplorerBridgeService = new WordExplorerBridgeService()
