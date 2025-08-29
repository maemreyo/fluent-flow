import { jsonrepair } from 'jsonrepair'
import { getCurrentUser } from '../supabase/client'
import type { AIService } from './ai-service'
import { createAIService } from './ai-service'
import type { UserVocabularyItem } from './user-vocabulary-service'
import { vocabularyDatabaseService } from './vocabulary-database-service'

export interface UsageExample {
  id: string
  sentence: string
  context: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  domain?: string
}

export interface CollocationPattern {
  id: string
  pattern: string
  examples: string[]
  frequency: 'common' | 'frequent' | 'occasional'
  type: 'verb_noun' | 'adj_noun' | 'adv_verb' | 'prep_phrase' | 'other'
}

export interface LoopContext {
  loopId: string
  videoId: string
  videoTitle: string
  timestamp: number
  duration: number
  context: string
  sentence: string
}

export class ContextualLearningAIService {
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
   * Clean and repair AI response content using jsonrepair
   */
  private cleanJsonResponse(content: string): string {
    // First remove markdown code block syntax
    const cleanedContent = content

    return jsonrepair(cleanedContent)
  }

  /**
   * Generate usage examples for vocabulary using AI with caching
   */
  async generateUsageExamples(
    vocabulary: UserVocabularyItem,
    count: number = 5,
    loopId?: string
  ): Promise<UsageExample[]> {
    try {
      // Check cache first (loop-specific or standalone)
      let cachedData = null
      if (loopId) {
        cachedData = await vocabularyDatabaseService.getContextualLearningData(loopId, vocabulary.id)
      }
      if (!cachedData) {
        cachedData = await vocabularyDatabaseService.getStandaloneContextualData(vocabulary.text)
      }
      
      if (cachedData?.examples?.length > 0) {
        console.log('Using cached usage examples for vocabulary:', vocabulary.text)
        return cachedData.examples
      }

      const aiService = await this.getAIService()
      const prompt = `Generate ${count} diverse, natural usage examples for the ${vocabulary.itemType} "${vocabulary.text}".

Definition: ${vocabulary.definition}
${vocabulary.partOfSpeech ? `Part of speech: ${vocabulary.partOfSpeech}` : ''}
${vocabulary.example ? `Existing example: ${vocabulary.example}` : ''}
Difficulty level: ${vocabulary.difficulty}

Requirements:
1. Create examples for different contexts (business, academic, casual, etc.)
2. Show various meanings if the word has multiple definitions
3. Use natural, contemporary language
4. Vary sentence complexity based on difficulty level
5. Include the target word naturally, not forced

Return JSON array with this structure:
[{
  "sentence": "The complete sentence using the word",
  "context": "Brief description of the usage context",
  "difficulty": "${vocabulary.difficulty}",
  "domain": "business|academic|casual|technical|etc"
}]

Examples should be practical and help learners understand real-world usage.`

      const response = await aiService.chat([{ role: 'user', content: prompt }])
      const cleanedContent = this.cleanJsonResponse(response.content)
      const examples = JSON.parse(cleanedContent)

      const formattedExamples = examples.map((example: any, index: number) => ({
        id: `usage_${vocabulary.id}_${index}`,
        sentence: example.sentence,
        context: example.context,
        difficulty: example.difficulty,
        domain: example.domain
      }))

      // Cache the results
      if (formattedExamples.length > 0) {
        // Get existing collocations to preserve them
        const existingCollocations = cachedData?.collocations || []
        
        if (loopId) {
          await vocabularyDatabaseService.saveContextualLearningData(
            loopId,
            vocabulary.id,
            formattedExamples,
            existingCollocations
          )
        } else {
          await vocabularyDatabaseService.saveStandaloneContextualData(
            vocabulary.text,
            vocabulary.id,
            formattedExamples,
            existingCollocations
          )
        }
      }

      return formattedExamples
    } catch (error) {
      console.error('Failed to generate usage examples:', error)
      return this.getFallbackUsageExamples(vocabulary, count)
    }
  }

  /**
   * Generate collocation patterns for vocabulary using AI with caching
   */
  async generateCollocations(
    vocabulary: UserVocabularyItem,
    count: number = 8,
    loopId?: string
  ): Promise<CollocationPattern[]> {
    try {
      // Check cache first (loop-specific or standalone)
      let cachedData = null
      if (loopId) {
        cachedData = await vocabularyDatabaseService.getContextualLearningData(loopId, vocabulary.id)
      }
      if (!cachedData) {
        cachedData = await vocabularyDatabaseService.getStandaloneContextualData(vocabulary.text)
      }
      
      if (cachedData?.collocations?.length > 0) {
        console.log('Using cached collocations for vocabulary:', vocabulary.text)
        return cachedData.collocations
      }

      const aiService = await this.getAIService()
      const prompt = `Generate ${count} common collocation patterns for the ${vocabulary.itemType} "${vocabulary.text}".

Definition: ${vocabulary.definition}
${vocabulary.partOfSpeech ? `Part of speech: ${vocabulary.partOfSpeech}` : ''}
Difficulty level: ${vocabulary.difficulty}

Requirements:
1. Include verb-noun, adjective-noun, adverb-verb, and prepositional phrases
2. Focus on natural, frequently used combinations
3. Provide 2-3 example sentences for each pattern
4. Indicate frequency (common/frequent/occasional)
5. Consider different meanings of the word

Return JSON array with this structure:
[{
  "pattern": "Short description of the collocation pattern",
  "examples": ["Example sentence 1", "Example sentence 2"],
  "frequency": "common|frequent|occasional",
  "type": "verb_noun|adj_noun|adv_verb|prep_phrase|other"
}]

Focus on authentic, useful patterns that help with natural language use.`

      const response = await aiService.chat([{ role: 'user', content: prompt }])
      const cleanedContent = this.cleanJsonResponse(response.content)
      const collocations = JSON.parse(cleanedContent)

      const formattedCollocations = collocations.map((collocation: any, index: number) => ({
        id: `collocation_${vocabulary.id}_${index}`,
        pattern: collocation.pattern,
        examples: collocation.examples,
        frequency: collocation.frequency,
        type: collocation.type
      }))

      // Cache the results
      if (formattedCollocations.length > 0) {
        // Get existing examples to preserve them
        const existingExamples = cachedData?.examples || []
        
        if (loopId) {
          await vocabularyDatabaseService.saveContextualLearningData(
            loopId,
            vocabulary.id,
            existingExamples,
            formattedCollocations
          )
        } else {
          await vocabularyDatabaseService.saveStandaloneContextualData(
            vocabulary.text,
            vocabulary.id,
            existingExamples,
            formattedCollocations
          )
        }
      }

      return formattedCollocations
    } catch (error) {
      console.error('Failed to generate collocations:', error)
      return this.getFallbackCollocations(vocabulary, count)
    }
  }

  /**
   * Generate both examples and collocations with smart caching
   * This method optimizes API costs by checking cache and generating both together
   */
  async generateContextualLearning(
    vocabulary: UserVocabularyItem,
    loopId: string,
    options: {
      exampleCount?: number
      collocationCount?: number
      forceRegenerate?: boolean
    } = {}
  ): Promise<{
    examples: UsageExample[]
    collocations: CollocationPattern[]
    fromCache: boolean
  }> {
    const { exampleCount = 5, collocationCount = 8, forceRegenerate = false } = options

    try {
      // Check cache first unless forced regeneration
      if (!forceRegenerate) {
        const cachedData = await vocabularyDatabaseService.getContextualLearningData(loopId, vocabulary.id)
        if (cachedData?.examples?.length > 0 && cachedData?.collocations?.length > 0) {
          console.log('Using complete cached contextual learning for vocabulary:', vocabulary.text)
          return {
            examples: cachedData.examples,
            collocations: cachedData.collocations,
            fromCache: true
          }
        }
      }

      // Generate both examples and collocations
      const [examples, collocations] = await Promise.all([
        this.generateUsageExamples(vocabulary, exampleCount), // Don't pass loopId to avoid double caching
        this.generateCollocations(vocabulary, collocationCount) // Don't pass loopId to avoid double caching
      ])

      // Save both to cache
      if (examples.length > 0 || collocations.length > 0) {
        await vocabularyDatabaseService.saveContextualLearningData(
          loopId,
          vocabulary.id,
          examples,
          collocations
        )
      }

      return {
        examples,
        collocations,
        fromCache: false
      }
    } catch (error) {
      console.error('Failed to generate contextual learning:', error)
      return {
        examples: this.getFallbackUsageExamples(vocabulary, exampleCount),
        collocations: this.getFallbackCollocations(vocabulary, collocationCount),
        fromCache: false
      }
    }
  }

  /**
   * Get contextual learning data for SRS review
   * Optimized for flashcard display during spaced repetition
   */
  async getContextualDataForSRS(
    vocabulary: UserVocabularyItem,
    loopId?: string,
    options: {
      generateIfMissing?: boolean
      maxExamples?: number
      maxCollocations?: number
    } = {}
  ): Promise<{
    examples: UsageExample[]
    collocations: CollocationPattern[]
    hasEnhancedData: boolean
    generated: boolean
  }> {
    const { generateIfMissing = true, maxExamples = 3, maxCollocations = 4 } = options
    
    try {
      // First, try to get cached data (either loop-specific or standalone)
      let cachedData = null
      
      if (loopId) {
        cachedData = await vocabularyDatabaseService.getContextualLearningData(loopId, vocabulary.id)
      }
      
      // If no loop-specific data, try standalone data
      if (!cachedData) {
        cachedData = await vocabularyDatabaseService.getStandaloneContextualData(vocabulary.text)
      }
      
      if (cachedData && (cachedData.examples.length > 0 || cachedData.collocations.length > 0)) {
        return {
          examples: cachedData.examples,
          collocations: cachedData.collocations,
          hasEnhancedData: true,
          generated: false
        }
      }

      // No cached data - generate if requested
      if (generateIfMissing) {
        console.log('Generating contextual learning data for:', vocabulary.text)
        
        const examples: UsageExample[] = []
        const collocations: CollocationPattern[] = []
        
        // Generate examples if requested
        if (maxExamples > 0) {
          try {
            const generatedExamples = await this.generateUsageExamples(vocabulary, maxExamples)
            examples.push(...generatedExamples)
          } catch (error) {
            console.error('Failed to generate examples:', error)
          }
        }
        
        // Generate collocations if requested
        if (maxCollocations > 0) {
          try {
            const generatedCollocations = await this.generateCollocations(vocabulary, maxCollocations)
            collocations.push(...generatedCollocations)
          } catch (error) {
            console.error('Failed to generate collocations:', error)
          }
        }
        
        // Save to cache (prefer loop-specific, fallback to standalone)
        if (examples.length > 0 || collocations.length > 0) {
          if (loopId) {
            await vocabularyDatabaseService.saveContextualLearningData(loopId, vocabulary.id, examples, collocations)
          } else {
            await vocabularyDatabaseService.saveStandaloneContextualData(vocabulary.text, vocabulary.id, examples, collocations)
          }
        }
        
        return {
          examples,
          collocations,
          hasEnhancedData: examples.length > 0 || collocations.length > 0,
          generated: true
        }
      }

      // No cached data and not generating - return basic data
      return {
        examples: vocabulary.example ? [{
          id: `basic_${vocabulary.id}`,
          sentence: vocabulary.example,
          context: 'Basic example - Click Generate for enhanced examples',
          difficulty: vocabulary.difficulty
        }] : [],
        collocations: [],
        hasEnhancedData: false,
        generated: false
      }
    } catch (error) {
      console.error('Failed to get contextual data for SRS:', error)
      return {
        examples: [],
        collocations: [],
        hasEnhancedData: false,
        generated: false
      }
    }
  }

  /**
   * Pre-generate contextual learning for vocabulary items in bulk
   * Useful for preparing SRS content in advance
   */
  async preGenerateForVocabularyList(
    vocabularyItems: UserVocabularyItem[],
    loopId: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<{
    generated: number
    cached: number
    failed: number
  }> {
    const results = { generated: 0, cached: 0, failed: 0 }
    
    for (let i = 0; i < vocabularyItems.length; i++) {
      const vocab = vocabularyItems[i]
      
      try {
        const result = await this.generateContextualLearning(vocab, loopId, {
          exampleCount: 3,
          collocationCount: 4
        })
        
        if (result.fromCache) {
          results.cached++
        } else {
          results.generated++
        }
        
        onProgress?.(i + 1, vocabularyItems.length)
        
        // Small delay to avoid rate limiting
        if (!result.fromCache) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } catch (error) {
        console.error('Failed to generate contextual learning for:', vocab.text, error)
        results.failed++
      }
    }
    
    return results
  }

  /**
   * Associate vocabulary with loop context
   */
  async saveToLoop(
    vocabulary: UserVocabularyItem,
    loopData: {
      loopId: string
      videoId: string
      videoTitle: string
      startTime: number
      endTime: number
      transcript?: string
    }
  ): Promise<LoopContext | null> {
    try {
      const user = await getCurrentUser()
      if (!user) return null

      // Extract context from transcript or generate description
      let context = 'Video segment context'
      let sentence = vocabulary.example || `Example usage of "${vocabulary.text}"`

      if (loopData.transcript) {
        // Find the sentence containing the vocabulary word
        const sentences = loopData.transcript.split(/[.!?]+/)
        const targetSentence = sentences.find(s =>
          s.toLowerCase().includes(vocabulary.text.toLowerCase())
        )

        if (targetSentence) {
          sentence = targetSentence.trim()
          context = `From "${loopData.videoTitle}" at ${this.formatTime(loopData.startTime)}`
        }
      }

      const loopContext: LoopContext = {
        loopId: loopData.loopId,
        videoId: loopData.videoId,
        videoTitle: loopData.videoTitle,
        timestamp: loopData.startTime,
        duration: loopData.endTime - loopData.startTime,
        context,
        sentence
      }

      // Store in database (using the existing vocabulary service pattern)
      // This would typically save to a loop_contexts table
      console.log('Saving loop context:', loopContext)

      return loopContext
    } catch (error) {
      console.error('Failed to save to loop:', error)
      return null
    }
  }

  /**
   * Find similar contexts where the word appears in other loops
   */
  async findSimilarContexts(
    vocabulary: UserVocabularyItem,
    limit: number = 5
  ): Promise<LoopContext[]> {
    try {
      // Mock data - in real implementation, this would query the database
      // for other loops where this vocabulary word appears
      const mockContexts: LoopContext[] = [
        {
          loopId: 'loop_001',
          videoId: 'video_001',
          videoTitle: 'Advanced English Conversation',
          timestamp: 125,
          duration: 15,
          context: 'Business meeting discussion',
          sentence: `The ${vocabulary.text} was crucial for our success.`
        },
        {
          loopId: 'loop_002',
          videoId: 'video_002',
          videoTitle: 'Academic Vocabulary in Context',
          timestamp: 67,
          duration: 12,
          context: 'Academic lecture segment',
          sentence: `Understanding ${vocabulary.text} requires careful analysis.`
        }
      ]

      // Filter based on vocabulary text (in real implementation)
      return mockContexts.slice(0, limit)
    } catch (error) {
      console.error('Failed to find similar contexts:', error)
      return []
    }
  }

  /**
   * Analyze vocabulary relationships and suggest learning paths
   */
  async analyzeLearningPath(
    vocabulary: UserVocabularyItem,
    userLevel: string = 'intermediate'
  ): Promise<{
    prerequisites: string[]
    relatedWords: string[]
    nextSteps: string[]
  }> {
    try {
      const aiService = await this.getAIService()
      const prompt = `Analyze the learning path for "${vocabulary.text}" (${vocabulary.definition}) for a ${userLevel} learner.

Suggest:
1. Prerequisites - simpler words/concepts that should be learned first
2. Related words - words in the same semantic field or topic
3. Next steps - more advanced words to learn after mastering this one

Return JSON with this structure:
{
  "prerequisites": ["word1", "word2", "word3"],
  "relatedWords": ["word1", "word2", "word3", "word4", "word5"],
  "nextSteps": ["word1", "word2", "word3"]
}

Focus on practical vocabulary progression that builds naturally.`

      const response = await aiService.chat([{ role: 'user', content: prompt }])
      const cleanedContent = this.cleanJsonResponse(response.content)
      return JSON.parse(cleanedContent)
    } catch (error) {
      console.error('Failed to analyze learning path:', error)
      return {
        prerequisites: [],
        relatedWords: [],
        nextSteps: []
      }
    }
  }

  // Fallback methods for when AI is not available
  private getFallbackUsageExamples(vocabulary: UserVocabularyItem, count: number): UsageExample[] {
    const examples: UsageExample[] = []

    for (let i = 0; i < count; i++) {
      examples.push({
        id: `fallback_usage_${vocabulary.id}_${i}`,
        sentence: `Here's an example sentence using "${vocabulary.text}" in context.`,
        context: 'General usage example',
        difficulty: vocabulary.difficulty,
        domain: 'general'
      })
    }

    return examples
  }

  private getFallbackCollocations(
    vocabulary: UserVocabularyItem,
    count: number
  ): CollocationPattern[] {
    const patterns: CollocationPattern[] = []

    for (let i = 0; i < count; i++) {
      patterns.push({
        id: `fallback_collocation_${vocabulary.id}_${i}`,
        pattern: `Common ${vocabulary.partOfSpeech || 'word'} combinations`,
        examples: [
          `Example phrase with "${vocabulary.text}"`,
          `Another combination using "${vocabulary.text}"`
        ],
        frequency: 'common',
        type: 'other'
      })
    }

    return patterns
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
}

// Export singleton instance with Google Gemini as default
export const contextualLearningAIService = new ContextualLearningAIService('google')
