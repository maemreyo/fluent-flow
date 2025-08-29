// Enhanced Vocabulary Analysis Service using AIService
// This replaces the direct Gemini implementation with the universal AIService

import { createAIService } from './ai-service'
import type { AIService } from './ai-service'

export interface VocabularyWord {
  word: string
  partOfSpeech: string
  pronunciation: string
  definition: string
  definitionVi?: string
  synonyms: string[]
  antonyms: string[]
  example: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  frequency: number // How often it appears in the transcript
}

export interface VocabularyPhrase {
  phrase: string
  type: 'idiom' | 'collocation' | 'expression'
  definition: string
  definitionVi?: string
  example: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  frequency: number
}

export interface VocabularyAnalysisResult {
  words: VocabularyWord[]
  phrases: VocabularyPhrase[]
  totalWords: number
  uniqueWords: number
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced'
  suggestedFocusWords: string[] // Top words to focus on for learning
}

export interface TranscriptSummary {
  summary: string
  keyPoints: string[]
  topics: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedReadingTime: number
}

export class VocabularyAnalysisService {
  private aiService: AIService | null = null

  constructor(private preferredProvider: 'openai' | 'anthropic' | 'google' = 'google') {}

  /**
   * Initialize the AI service (lazy loading)
   */
  private async getAIService(): Promise<AIService> {
    if (!this.aiService) {
      this.aiService = await createAIService(this.preferredProvider)
    }
    return this.aiService
  }

  /**
   * Analyze vocabulary from transcript segments using AI
   */
  async analyzeVocabulary(
    segments: Array<{ text: string; start: number; duration: number }>
  ): Promise<VocabularyAnalysisResult> {
    const fullText = segments.map(s => s.text).join(' ')

    try {
      const aiService = await this.getAIService()
      const result = await aiService.analyzeVocabulary(fullText)
      
      return {
        words: result.words.map((w: any) => ({
          word: w.word || '',
          partOfSpeech: w.partOfSpeech || '',
          pronunciation: w.pronunciation || '',
          definition: w.definition || '',
          definitionVi: w.definitionVi || '',
          synonyms: Array.isArray(w.synonyms) ? w.synonyms : [],
          antonyms: Array.isArray(w.antonyms) ? w.antonyms : [],
          example: w.example || '',
          difficulty: w.difficulty || 'intermediate',
          frequency: w.frequency || 1
        })),
        phrases: result.phrases.map((p: any) => ({
          phrase: p.phrase || '',
          type: p.type || 'expression',
          definition: p.definition || '',
          definitionVi: p.definitionVi || '',
          example: p.example || '',
          difficulty: p.difficulty || 'intermediate',
          frequency: p.frequency || 1
        })),
        totalWords: result.totalWords || fullText.split(/\s+/).length,
        uniqueWords: result.uniqueWords || new Set(fullText.toLowerCase().split(/\s+/)).size,
        difficultyLevel: result.difficultyLevel || 'intermediate',
        suggestedFocusWords: Array.isArray(result.suggestedFocusWords) ? result.suggestedFocusWords : []
      }
    } catch (error) {
      console.error('AI vocabulary analysis failed:', error)
      throw new Error(`Vocabulary analysis failed: ${error.message}`)
    }
  }

  /**
   * Generate summary from transcript using AI
   */
  async generateSummary(
    segments: Array<{ text: string; start: number; duration: number }>
  ): Promise<TranscriptSummary> {
    const fullText = segments.map(s => s.text).join(' ')

    try {
      const aiService = await this.getAIService()
      const result = await aiService.generateTranscriptSummary(fullText)
      
      return {
        summary: result.summary || 'Summary not available',
        keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : [],
        topics: Array.isArray(result.topics) ? result.topics : [],
        difficulty: result.difficulty || 'intermediate',
        estimatedReadingTime: result.estimatedReadingTime || Math.ceil(fullText.split(/\s+/).length / 200)
      }
    } catch (error) {
      console.error('AI summary generation failed:', error)
      throw new Error(`Summary generation failed: ${error.message}`)
    }
  }

  /**
   * Get pronunciation audio URL for a word using Web Speech API
   */
  async getPronunciationAudio(
    word: string,
    language: 'en' | 'en-US' = 'en-US'
  ): Promise<string | null> {
    try {
      // Use Google TTS API
      const encodedWord = encodeURIComponent(word)
      return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedWord}&tl=${language}&client=tw-ob`
    } catch (error) {
      console.error('Failed to get pronunciation audio:', error)
      return null
    }
  }

  /**
   * Change AI provider (useful for switching between different AI services)
   */
  async switchProvider(provider: 'openai' | 'anthropic' | 'google'): Promise<void> {
    this.preferredProvider = provider
    this.aiService = null // Reset to force re-initialization
  }

  /**
   * Get current AI provider
   */
  getCurrentProvider(): string {
    return this.preferredProvider
  }

  /**
   * Validate AI service configuration
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      await this.getAIService()
      return true
    } catch (error) {
      console.error('AI service validation failed:', error)
      return false
    }
  }

  /**
   * Get AI service capabilities
   */
  async getCapabilities(): Promise<string[]> {
    try {
      const aiService = await this.getAIService()
      return await aiService.getCapabilities()
    } catch (error) {
      console.error('Failed to get AI capabilities:', error)
      return []
    }
  }
}

// Service factory function to create instance with proper config
export const createVocabularyAnalysisService = async (
  provider: 'openai' | 'anthropic' | 'google' = 'google'
): Promise<VocabularyAnalysisService> => {
  const service = new VocabularyAnalysisService(provider)
  
  // Validate configuration on creation
  const isValid = await service.validateConfiguration()
  if (!isValid) {
    throw new Error(`${provider.toUpperCase()} API not properly configured. Please configure your API key in settings.`)
  }
  
  return service
}

// Legacy compatibility - creates service with Google Gemini (default)
export const createVocabularyAnalysisServiceLegacy = async (): Promise<VocabularyAnalysisService> => {
  return createVocabularyAnalysisService('google')
}