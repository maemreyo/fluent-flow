import { supabase, getCurrentUser } from '../supabase/client'

export interface SelectedWord {
  id: string
  word: string
  context: string
  sourceType: 'quiz' | 'vocabulary' | 'transcript'
  sourceId: string
  selectedAt: Date
  definition?: string
  examples?: string[]
  collocations?: string[]
}

export interface WordSelectionData {
  word: string
  context: string
  sourceType: 'quiz' | 'vocabulary' | 'transcript'
  sourceId: string
  position?: {
    x: number
    y: number
  }
}

export class WordSelectionService {
  private readonly STORAGE_KEY = 'fluent_flow_selected_words'

  /**
   * Add a selected word to the collection
   */
  async addSelectedWord(data: Omit<SelectedWord, 'id' | 'selectedAt'>): Promise<boolean> {
    try {
      const user = await getCurrentUser()
      
      if (user && supabase) {
        // Save to Supabase for authenticated users
        const { error } = await supabase.from('selected_words').insert({
          user_id: user.id,
          word: data.word,
          context: data.context,
          source_type: data.sourceType,
          source_id: data.sourceId,
          definition: data.definition,
          examples: data.examples,
          collocations: data.collocations,
          created_at: new Date().toISOString()
        })
        
        if (error) throw error
      } else {
        // Fallback to local storage
        const selectedWords = await this.getSelectedWords()
        const newWord: SelectedWord = {
          ...data,
          id: `local_${Date.now()}`,
          selectedAt: new Date()
        }
        
        // Check if word already exists
        const exists = selectedWords.some(w => w.word.toLowerCase() === data.word.toLowerCase())
        if (exists) return false
        
        const updated = [newWord, ...selectedWords].slice(0, 100) // Keep max 100
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated))
        }
      }
      
      return true
    } catch (error) {
      console.error('Failed to add selected word:', error)
      return false
    }
  }

  /**
   * Get all selected words
   */
  async getSelectedWords(): Promise<SelectedWord[]> {
    try {
      const user = await getCurrentUser()
      
      if (user && supabase) {
        const { data, error } = await supabase
          .from('selected_words')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (error) throw error
        
        return (data || []).map((item: any) => ({
          id: item.id,
          word: item.word,
          context: item.context,
          sourceType: item.source_type,
          sourceId: item.source_id,
          definition: item.definition,
          examples: item.examples,
          collocations: item.collocations,
          selectedAt: new Date(item.created_at)
        }))
      } else {
        // Get from local storage
        if (typeof window === 'undefined') return []
        
        const stored = localStorage.getItem(this.STORAGE_KEY)
        if (!stored) return []
        
        const parsed = JSON.parse(stored)
        return parsed.map((item: any) => ({
          ...item,
          selectedAt: new Date(item.selectedAt)
        }))
      }
    } catch (error) {
      console.error('Failed to get selected words:', error)
      return []
    }
  }

  /**
   * Remove a selected word
   */
  async removeSelectedWord(wordId: string): Promise<boolean> {
    try {
      const user = await getCurrentUser()
      
      if (user && supabase) {
        const { error } = await supabase
          .from('selected_words')
          .delete()
          .eq('user_id', user.id)
          .eq('id', wordId)
        
        if (error) throw error
      } else {
        const words = await this.getSelectedWords()
        const filtered = words.filter(w => w.id !== wordId)
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
        }
      }
      
      return true
    } catch (error) {
      console.error('Failed to remove selected word:', error)
      return false
    }
  }

  /**
   * Check if a word is already selected
   */
  async isWordSelected(word: string): Promise<boolean> {
    try {
      const words = await this.getSelectedWords()
      return words.some(w => w.word.toLowerCase() === word.toLowerCase())
    } catch (error) {
      return false
    }
  }

  /**
   * Clear all selected words
   */
  async clearSelectedWords(): Promise<boolean> {
    try {
      const user = await getCurrentUser()
      
      if (user && supabase) {
        const { error } = await supabase
          .from('selected_words')
          .delete()
          .eq('user_id', user.id)
        
        if (error) throw error
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(this.STORAGE_KEY)
        }
      }
      
      return true
    } catch (error) {
      console.error('Failed to clear selected words:', error)
      return false
    }
  }

  /**
   * Extract clean word/phrase from selected text
   */
  extractCleanWord(selectedText: string): string {
    const cleaned = selectedText
      .trim()
      .replace(/[^\w\s-']/g, '') // Remove punctuation except hyphens and apostrophes
      .toLowerCase()
    
    // Support multi-word selection up to 5 words
    const words = cleaned.split(/\s+/).filter(word => word.length > 0)
    return words.slice(0, 5).join(' ')
  }

  /**
   * Get context around selected word
   */
  getWordContext(element: Element, selectedText: string): string {
    const fullText = element.textContent || ''
    const selectedIndex = fullText.toLowerCase().indexOf(selectedText.toLowerCase())
    
    if (selectedIndex === -1) return selectedText
    
    // Get 30 characters before and after
    const start = Math.max(0, selectedIndex - 30)
    const end = Math.min(fullText.length, selectedIndex + selectedText.length + 30)
    
    return fullText.slice(start, end).trim()
  }
}

export const wordSelectionService = new WordSelectionService()