import { userVocabularyService, type UserVocabularyItem } from './user-vocabulary-service'
import { wordSelectionService, type SelectedWord } from '../../fluent-flow-transcript-service/src/lib/services/word-selection-service'

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
      // Convert selected word to UserVocabularyItem format
      const vocabularyItem: Omit<UserVocabularyItem, 'id' | 'createdAt' | 'timesStudied' | 'masteryLevel' | 'lastStudied'> = {
        word: selectedWord.word,
        definition: selectedWord.definition || `Word selected from ${selectedWord.sourceType}`,
        examples: selectedWord.examples || [selectedWord.context],
        difficulty: this.inferDifficulty(selectedWord.word),
        collocations: selectedWord.collocations || [],
        source: `quiz-${selectedWord.sourceType}`,
        sourceMetadata: {
          sourceType: selectedWord.sourceType,
          sourceId: selectedWord.sourceId,
          context: selectedWord.context,
          selectedAt: selectedWord.selectedAt.toISOString()
        }
      }

      // Add to user vocabulary deck
      await userVocabularyService.addVocabularyItem(vocabularyItem)

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
        item.word.toLowerCase() === word.toLowerCase() 
          ? { ...item, shouldHighlight: false }
          : item
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