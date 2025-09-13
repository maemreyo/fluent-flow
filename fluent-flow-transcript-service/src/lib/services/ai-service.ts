/**
 * AI Service - Modular and Clean Implementation
 * Orchestrates AI providers and question processors
 */

import { AIConfig, ChatMessage, AIResponse, SavedLoop, DifficultyPreset, GeneratedQuestion, GeneratedQuestions, QuestionGenerationOptions, AICapability } from './ai-types'
import { createAIProvider } from './ai-providers'
import { createQuestionProcessor } from './question-processors'
import { detectExerciseType, formatTime, processTemplateVariables, shuffleOptionsWithSeed } from './utils'
import { createAIConfig } from './ai-config'

export class AIService {
  private provider: any
  private config: AIConfig

  constructor(config: AIConfig) {
    this.config = config
    this.provider = createAIProvider(config)
  }

  /**
   * Main chat completion method
   */
  async chat(
    messages: ChatMessage[],
    options?: {
      stream?: boolean
      temperature?: number
      maxTokens?: number
    }
  ): Promise<AIResponse> {
    return await this.provider.chat(messages, options)
  }

  /**
   * Generate questions for a single difficulty level
   */
  async generateSingleDifficultyQuestions(
    loop: SavedLoop,
    transcript: string,
    difficulty: 'easy' | 'medium' | 'hard',
    options?: QuestionGenerationOptions
  ): Promise<GeneratedQuestions> {
    const targetQuestionCount = options?.questionCount || 6

    let messages: ChatMessage[]
    let config: any
    let exerciseType: 'multiple_choice' | 'fill_blank' = 'multiple_choice'

    // Check if custom prompt is provided
    if (options?.customPrompt) {
      console.log('🎯 Using custom prompt for question generation')
      
      const customPrompt = options.customPrompt
      
      // Detect exercise type
      exerciseType = customPrompt.exerciseType || 
                    detectExerciseType(customPrompt.system_prompt)

      console.log(`📝 Exercise type detected: ${exerciseType === 'fill_blank' ? 'Fill-in-the-Blank' : 'Multiple Choice'}`)

      // Build transcript with timestamps if segments are available
      let transcriptWithTimestamps = transcript
      if (options?.segments && options.segments.length > 0) {
        transcriptWithTimestamps = options.segments.map(segment => 
          `[${formatTime(segment.start)}-${formatTime(segment.start + segment.duration)}] ${segment.text}`
        ).join('\n')
      }

      // Prepare template variables
      const variables = {
        totalQuestions: targetQuestionCount,
        easyCount: difficulty === 'easy' ? targetQuestionCount : 0,
        mediumCount: difficulty === 'medium' ? targetQuestionCount : 0,
        hardCount: difficulty === 'hard' ? targetQuestionCount : 0,
        videoTitle: loop.videoTitle || 'YouTube Video',
        transcript: transcriptWithTimestamps,
        transcriptWithTimestamps
      }

      // Process template
      const userPrompt = processTemplateVariables(customPrompt.user_template, variables)

      messages = [
        { role: 'system', content: customPrompt.system_prompt },
        { role: 'user', content: userPrompt }
      ]

      config = {
        maxTokens: customPrompt.config?.maxTokens || 16000,
        temperature: customPrompt.config?.temperature || 0.3
      }
    } else {
      // Use default prompt template
      const { prompts, PromptManager } = await import('./ai-prompts')
      const template = prompts.singleDifficultyQuestions

      const promptData = options?.segments && options.segments.length > 0
        ? { loop, segments: options.segments, difficulty }
        : { loop, transcript, difficulty }

      messages = PromptManager.buildMessages(template, promptData)
      config = PromptManager.getConfig(template)
    }

    // Log the full prompt
    console.log('\n=== FULL PROMPT AFTER VARIABLE SUBSTITUTION ===')
    console.log('System Message:', messages.find(m => m.role === 'system')?.content)
    console.log('\nUser Message:', messages.find(m => m.role === 'user')?.content)
    console.log('=== END PROMPT LOG ===\n')

    try {
      // Get AI response
      const response = await this.chat(messages, config)
      const parsedResponse = this.parseJSONResponse(response.content)

      console.log('🔍 Parsed AI Response:', JSON.stringify(parsedResponse, null, 2))

      // Process response using appropriate processor
      const processor = createQuestionProcessor(exerciseType)
      return processor.processResponse(parsedResponse, loop, difficulty, targetQuestionCount)

    } catch (error: any) {
      throw new Error(`Single difficulty questions generation failed: ${error.message}`)
    }
  }

  /**
   * Generate conversation questions from transcript text
   */
  /**
   * Generate conversation questions from transcript text
   */
  async generateConversationQuestions(
    loop: SavedLoop,
    transcript: string,
    preset?: DifficultyPreset,
    options?: QuestionGenerationOptions
  ): Promise<GeneratedQuestions> {
    const { prompts, PromptManager } = await import('./ai-prompts')
    const template = prompts.conversationQuestions

    // Default to largest preset (15 questions) to ensure we have enough for all presets
    const defaultPreset = { easy: 5, medium: 6, hard: 4 }
    const actualPreset = preset || defaultPreset
    const totalQuestions = actualPreset.easy + actualPreset.medium + actualPreset.hard

    // Use segments if provided, otherwise fallback to transcript
    // This avoids duplication since segments contain timeframe-specific content
    const promptData = options?.segments && options.segments.length > 0
      ? { loop, segments: options.segments, preset: actualPreset }
      : { loop, transcript, preset: actualPreset }

    const messages = PromptManager.buildMessages(template, promptData)
    const config = PromptManager.getConfig(template)

    try {
      const response = await this.chat(messages, config)
      const parsedResponse = this.parseJSONResponse(response.content)

      // Validate response structure
      if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
        throw new Error('AI response missing questions array')
      }

      // Validate we have the correct number of questions
      const questions = parsedResponse.questions
      if (questions.length !== totalQuestions) {
        console.warn(
          `Expected ${totalQuestions} questions but got ${questions.length}. Adjusting...`
        )
      }

      // Validate difficulty distribution
      const easyCount = questions.filter((q: any) => q.difficulty === 'easy').length
      const mediumCount = questions.filter((q: any) => q.difficulty === 'medium').length
      const hardCount = questions.filter((q: any) => q.difficulty === 'hard').length

      console.log(
        `Question distribution - Easy: ${easyCount}, Medium: ${mediumCount}, Hard: ${hardCount}`
      )
      console.log(
        `Expected distribution - Easy: ${actualPreset.easy}, Medium: ${actualPreset.medium}, Hard: ${actualPreset.hard}`
      )

      return {
        questions: questions.slice(0, totalQuestions).map((q: any, index: number) => {
          // Validate question structure
          if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
            throw new Error(`Invalid question structure at index ${index}`)
          }

          // Shuffle answer options to randomize correct answer position
          const correctAnswerIndex = ['A', 'B', 'C', 'D'].indexOf(q.correctAnswer || 'A')
          const correctOption = q.options[correctAnswerIndex] || q.options[0]
          
          // Create shuffled array with seeded randomization for consistency
          const seed = loop.id + index // Use loop ID and index as seed for reproducible shuffling
          const shuffledData = shuffleOptionsWithSeed(q.options, seed)
          const newCorrectIndex = shuffledData.options.indexOf(correctOption)
          const newCorrectAnswer = ['A', 'B', 'C', 'D'][newCorrectIndex] as 'A' | 'B' | 'C' | 'D'

          return {
            id: `q_${loop.id}_ai_${index + 1}`,
            question: q.question,
            options: shuffledData.options,
            correctAnswer: newCorrectAnswer,
            explanation: q.explanation || 'No explanation provided',
            difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
            type: [
              'main_idea',
              'specific_detail',
              'vocabulary_in_context',
              'inference',
              'speaker_tone',
              'language_function'
            ].includes(q.type)
              ? q.type
              : 'main_idea',
            timestamp:
              q.timestamp ??
              loop.startTime + (index * (loop.endTime - loop.startTime)) / totalQuestions
          } as GeneratedQuestion
        }),
        preset: actualPreset,
        actualDistribution: { easy: easyCount, medium: mediumCount, hard: hardCount }
      }
    } catch (error: any) {
      throw new Error(`Conversation questions generation failed: ${error.message}`)
    }
  }

  /**
   * Parse JSON response with error handling
   */
  private parseJSONResponse(responseText: string): any {
    const { PromptManager } = require('./ai-prompts')
    return PromptManager.parseJSONResponse(responseText)
  }

  /**
   * Basic text processing methods
   */
  async summarizeText(text: string, maxLength: number = 200): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Summarize the given text in approximately ${maxLength} characters or less. Be concise but capture the key points.`
      },
      { role: 'user', content: text }
    ]

    const response = await this.chat(messages, { maxTokens: Math.ceil(maxLength / 3) })
    return response.content
  }

  async translateText(text: string, targetLanguage: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Translate the given text to ${targetLanguage}. Only return the translation, no additional text.`
      },
      { role: 'user', content: text }
    ]

    const response = await this.chat(messages, { maxTokens: Math.ceil(text.length * 1.5) })
    return response.content
  }

  /**
   * Get AI service capabilities
   */
  async getCapabilities(): Promise<AICapability[]> {
    return this.provider.getCapabilities()
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AIConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.provider.updateConfig(this.config)
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig(): Omit<AIConfig, 'apiKey'> {
    return this.provider.getConfig()
  }
}

/**
 * Factory function to create AI Service with environment configuration
 */
export function createAIService(overrides?: Partial<AIConfig>): AIService {
  const config = createAIConfig(overrides)
  return new AIService(config)
}

// Re-export types for backward compatibility
export * from './ai-types'
export * from './ai-config'