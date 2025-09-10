// ❌ DEPRECATED: Vocabulary Analysis Service for extracting and analyzing words from transcripts
// TODO: Remove this file - replaced by vocabulary-analysis-service.ts
// This file contains old implementation that is no longer used

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getFluentFlowStore } from '../stores/fluent-flow-supabase-store'

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
  constructor(private geminiConfig: { apiKey: string }) {}

  /**
   * Analyze vocabulary from transcript segments using Gemini AI
   */
  async analyzeVocabulary(
    segments: Array<{ text: string; start: number; duration: number }>
  ): Promise<VocabularyAnalysisResult> {
    const fullText = segments.map(s => s.text).join(' ')

    if (!this.geminiConfig?.apiKey) {
      throw new Error('Gemini API key is required for vocabulary analysis')
    }

    const genAI = new GoogleGenerativeAI(this.geminiConfig.apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    const prompt = `
You are an expert English vocabulary analyst for language learners. Analyze the following transcript and extract the most important vocabulary words and phrases.

Transcript:
${fullText}

Generate a comprehensive vocabulary analysis. Return ONLY a valid JSON object with this exact structure:

{
  "words": [
    {
      "word": "example",
      "partOfSpeech": "noun",
      "pronunciation": "/ɪɡˈzæmpəl/",
      "definition": "Clear English definition",
      "definitionVi": "Vietnamese translation",
      "synonyms": ["sample", "instance"],
      "antonyms": ["opposite1"],
      "example": "Natural example sentence",
      "difficulty": "intermediate",
      "frequency": 3
    }
  ],
  "phrases": [
    {
      "phrase": "example phrase",
      "type": "collocation",
      "definition": "Clear English definition",
      "definitionVi": "Vietnamese translation", 
      "example": "Natural example sentence",
      "difficulty": "intermediate",
      "frequency": 2
    }
  ],
  "totalWords": 150,
  "uniqueWords": 95,
  "difficultyLevel": "intermediate",
  "suggestedFocusWords": ["word1", "word2", "word3"]
}

Requirements:
- Extract 15-20 most important words that are useful for learning
- Include 5-10 key phrases, collocations, or idioms
- Provide accurate pronunciation using IPA notation
- Give clear, concise definitions in English
- Provide Vietnamese translations for definitions
- Include 2-3 synonyms and 1-2 antonyms where applicable
- Create natural example sentences showing usage
- Assess difficulty: "beginner", "intermediate", or "advanced"
- Count frequency based on appearance in transcript
- Suggest 5 focus words for priority learning
- Assess overall difficulty level of the content

Types for phrases: "idiom", "collocation", "expression"
`

    try {
      const result = await model.generateContent(prompt)
      const responseText = result.response.text()

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response')
      }

      const aiResponse = JSON.parse(jsonMatch[0])

      // Validate response structure
      if (!aiResponse.words || !Array.isArray(aiResponse.words)) {
        throw new Error('Invalid response structure from Gemini')
      }

      return {
        words: aiResponse.words.map((w: any) => ({
          word: w.word,
          partOfSpeech: w.partOfSpeech,
          pronunciation: w.pronunciation,
          definition: w.definition,
          definitionVi: w.definitionVi,
          synonyms: Array.isArray(w.synonyms) ? w.synonyms : [],
          antonyms: Array.isArray(w.antonyms) ? w.antonyms : [],
          example: w.example,
          difficulty: w.difficulty || 'intermediate',
          frequency: w.frequency || 1
        })),
        phrases: (aiResponse.phrases || []).map((p: any) => ({
          phrase: p.phrase,
          type: p.type || 'expression',
          definition: p.definition,
          definitionVi: p.definitionVi,
          example: p.example,
          difficulty: p.difficulty || 'intermediate',
          frequency: p.frequency || 1
        })),
        totalWords: aiResponse.totalWords || fullText.split(/\s+/).length,
        uniqueWords: aiResponse.uniqueWords || new Set(fullText.toLowerCase().split(/\s+/)).size,
        difficultyLevel: aiResponse.difficultyLevel || 'intermediate',
        suggestedFocusWords: Array.isArray(aiResponse.suggestedFocusWords)
          ? aiResponse.suggestedFocusWords
          : []
      }
    } catch (error) {
      console.error('Gemini vocabulary analysis failed:', error)
      throw new Error(`Vocabulary analysis failed: ${error.message}`)
    }
  }

  /**
   * Generate summary from transcript using Gemini AI
   */
  async generateSummary(
    segments: Array<{ text: string; start: number; duration: number }>
  ): Promise<TranscriptSummary> {
    const fullText = segments.map(s => s.text).join(' ')
    const words = fullText.split(/\s+/).length
    const estimatedReadingTime = Math.ceil(words / 200) // 200 WPM

    if (!this.geminiConfig?.apiKey) {
      throw new Error('Gemini API key is required for summary generation')
    }

    const genAI = new GoogleGenerativeAI(this.geminiConfig.apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    const prompt = `
You are an expert content summarizer for English language learners. Analyze the following transcript and create a comprehensive summary.

Transcript:
${fullText}

Generate a detailed summary for language learners. Return ONLY a valid JSON object with this exact structure:

{
  "summary": "A clear 2-3 sentence summary capturing the main content and purpose",
  "keyPoints": [
    "First key point discussed",
    "Second key point discussed", 
    "Third key point discussed"
  ],
  "topics": [
    "main topic 1",
    "main topic 2",
    "main topic 3"
  ],
  "difficulty": "intermediate"
}

Requirements:
- Summary: 2-3 sentences capturing the essence and main message
- Key Points: 3-5 most important points or takeaways
- Topics: 3-5 main subjects or themes covered
- Difficulty: Assess as "beginner", "intermediate", or "advanced" based on:
  * Vocabulary complexity
  * Sentence structure
  * Concept difficulty
  * Speaking pace and clarity
  * Cultural/contextual knowledge required

Focus on what would be most helpful for English language learners to understand.
`

    try {
      const result = await model.generateContent(prompt)
      const responseText = result.response.text()

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response')
      }

      const aiResponse = JSON.parse(jsonMatch[0])

      return {
        summary: aiResponse.summary || 'Summary not available',
        keyPoints: Array.isArray(aiResponse.keyPoints) ? aiResponse.keyPoints : [],
        topics: Array.isArray(aiResponse.topics) ? aiResponse.topics : [],
        difficulty: aiResponse.difficulty || 'intermediate',
        estimatedReadingTime
      }
    } catch (error) {
      console.error('Gemini summary generation failed:', error)
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
   * Update Gemini configuration
   */
  updateConfig(config: { apiKey: string }): void {
    this.geminiConfig = config
  }

  /**
   * Validate Gemini API configuration
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      return !!(this.geminiConfig?.apiKey && this.geminiConfig.apiKey.length > 0)
    } catch {
      return false
    }
  }
}

// Service factory function to create instance with proper config
export const createVocabularyAnalysisService = async (): Promise<VocabularyAnalysisService> => {
  let geminiConfig = null

  try {
    // First try to get config from Supabase (same pattern as sidepanel)
    const { supabaseService } = getFluentFlowStore()
    const apiConfig = await supabaseService.getApiConfig()
    geminiConfig = apiConfig?.gemini
  } catch (supabaseError) {
    console.log('Vocabulary Service: Failed to load from Supabase, trying Chrome storage:', supabaseError)

    // Fallback to Chrome storage
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'STORAGE_OPERATION',
        operation: 'get',
        key: 'api_config'
      })
      geminiConfig = response.data?.gemini
    } catch (chromeError) {
      console.log('Vocabulary Service: Failed to load from Chrome storage:', chromeError)
    }
  }

  if (!geminiConfig?.apiKey) {
    throw new Error('Gemini API key not configured. Please configure your API key in settings.')
  }

  return new VocabularyAnalysisService(geminiConfig)
}
