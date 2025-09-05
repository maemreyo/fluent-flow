import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'

// Types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  content: string
  usage: {
    totalTokens: number
    promptTokens: number
    completionTokens: number
  }
  model: string
  provider: 'openai' | 'anthropic' | 'google' | 'custom'
  finishReason: string
  stream?: any
}

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'custom'
export type AICapability = 'text-generation' | 'text-analysis' | 'summarization' | 'translation' | 'code-generation' | 'function-calling' | 'long-context' | 'reasoning' | 'multimodal' | 'fast-generation'

// Configuration Schema
export const aiConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google', 'custom']),
  apiKey: z.string().min(1, 'API key is required'),
  baseUrl: z.string().optional(),
  model: z.string().min(1, 'Model is required'),
  maxTokens: z.number().min(1).max(100000).default(4000),
  temperature: z.number().min(0).max(2).default(0.7)
})

export type AIConfig = z.infer<typeof aiConfigSchema>

// Loop and generation types
export interface SavedLoop {
  id: string
  videoTitle?: string
  startTime: number
  endTime: number
}

export interface DifficultyPreset {
  easy: number
  medium: number
  hard: number
}

export interface GeneratedQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: 'A' | 'B' | 'C' | 'D'
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
  type: 'main_idea' | 'specific_detail' | 'vocabulary_in_context' | 'inference' | 'speaker_tone' | 'language_function'
  timestamp?: number
}

export interface GeneratedQuestions {
  questions: GeneratedQuestion[]
  preset: DifficultyPreset
  actualDistribution: {
    easy: number
    medium: number
    hard: number
  }
}

/**
 * AI Service for Next.js - Server-side AI operations
 */
export class AIService {
  private openai?: OpenAI
  private anthropic?: Anthropic
  private google?: GoogleGenerativeAI
  private config: AIConfig

  constructor(config: AIConfig) {
    this.config = aiConfigSchema.parse(config)
    this.initializeProviders()
  }

  private initializeProviders() {
    switch (this.config.provider) {
      case 'openai':
        this.openai = new OpenAI({
          apiKey: this.config.apiKey,
          baseURL: this.config.baseUrl,
        })
        break

      case 'anthropic':
        this.anthropic = new Anthropic({
          apiKey: this.config.apiKey,
          baseURL: this.config.baseUrl
        })
        break

      case 'google':
        this.google = new GoogleGenerativeAI(this.config.apiKey)
        break

      case 'custom':
        // For custom HTTP-based providers
        break
    }
  }

  // Main chat completion method
  async chat(
    messages: ChatMessage[],
    options?: {
      stream?: boolean
      temperature?: number
      maxTokens?: number
    }
  ): Promise<AIResponse> {
    try {
      const mergedOptions = { ...this.config, ...options }

      switch (this.config.provider) {
        case 'openai':
          return await this.chatWithOpenAI(messages, mergedOptions)

        case 'anthropic':
          return await this.chatWithAnthropic(messages, mergedOptions)

        case 'google':
          return await this.chatWithGoogle(messages, mergedOptions)

        case 'custom':
          return await this.chatWithCustomProvider(messages, mergedOptions)

        default:
          throw new Error(`Unsupported AI provider: ${this.config.provider}`)
      }
    } catch (error) {
      throw this.handleAIError(error)
    }
  }

  // OpenAI implementation
  private async chatWithOpenAI(messages: ChatMessage[], options: any): Promise<AIResponse> {
    if (!this.openai) throw new Error('OpenAI client not initialized')

    const response = await this.openai.chat.completions.create({
      model: this.config.model,
      messages: messages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      })),
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      stream: options.stream
    })

    if (options.stream) {
      // Handle streaming response
      return {
        content: '', // Will be populated via streaming
        usage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
        model: this.config.model,
        provider: 'openai',
        finishReason: 'length',
        stream: response as any
      }
    }

    const completion = response as OpenAI.Chat.Completions.ChatCompletion
    return {
      content: completion.choices[0]?.message?.content || '',
      usage: {
        totalTokens: completion.usage?.total_tokens || 0,
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0
      },
      model: completion.model,
      provider: 'openai',
      finishReason: completion.choices[0]?.finish_reason || 'stop'
    }
  }

  // Anthropic Claude implementation
  private async chatWithAnthropic(messages: ChatMessage[], options: any): Promise<AIResponse> {
    if (!this.anthropic) throw new Error('Anthropic client not initialized')

    // Convert messages to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system')
    const conversationMessages = messages.filter(m => m.role !== 'system')

    const response = await this.anthropic.messages.create({
      model: this.config.model,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      system: systemMessage?.content,
      messages: conversationMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      stream: options.stream
    })

    if (options.stream) {
      return {
        content: '',
        usage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
        model: this.config.model,
        provider: 'anthropic',
        finishReason: 'max_tokens',
        stream: response as any
      }
    }

    const message = response as Anthropic.Messages.Message
    const content = message.content[0]?.type === 'text' ? message.content[0].text : ''

    return {
      content,
      usage: {
        totalTokens: message.usage.input_tokens + message.usage.output_tokens,
        promptTokens: message.usage.input_tokens,
        completionTokens: message.usage.output_tokens
      },
      model: message.model,
      provider: 'anthropic',
      finishReason: message.stop_reason || 'end_turn'
    }
  }

  // Google Gemini implementation
  private async chatWithGoogle(messages: ChatMessage[], options: any): Promise<AIResponse> {
    if (!this.google) throw new Error('Google Gemini client not initialized')

    // Convert messages to Gemini format
    const systemMessage = messages.find(m => m.role === 'system')
    const conversationMessages = messages.filter(m => m.role !== 'system')

    // Build prompt for Gemini (it uses a single prompt format)
    let prompt = ''
    if (systemMessage) {
      prompt += systemMessage.content + '\n\n'
    }

    conversationMessages.forEach(msg => {
      const rolePrefix = msg.role === 'user' ? 'User: ' : 'Assistant: '
      prompt += rolePrefix + msg.content + '\n'
    })

    try {
      const model = this.google.getGenerativeModel({
        model: this.config.model || 'gemini-2.5-flash-lite',
        generationConfig: {
          maxOutputTokens: options.maxTokens,
          temperature: options.temperature
        }
      })

      const result = await model.generateContent(prompt)
      const response = result.response

      return {
        content: response.text(),
        usage: {
          totalTokens: response.usageMetadata?.totalTokenCount || 0,
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0
        },
        model: this.config.model,
        provider: 'google',
        finishReason: response.candidates?.[0]?.finishReason || 'stop'
      }
    } catch (error: any) {
      throw new Error(`Google Gemini API error: ${error.message}`)
    }
  }

  // Custom provider implementation (for future extensibility)
  private async chatWithCustomProvider(messages: ChatMessage[], options: any): Promise<AIResponse> {
    // Simple HTTP client implementation for custom providers
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        stream: options.stream
      })
    })

    if (!response.ok) {
      throw new Error(`Custom provider error: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      content: data.choices[0]?.message?.content || '',
      usage: {
        totalTokens: data.usage?.total_tokens || 0,
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0
      },
      model: data.model,
      provider: 'custom',
      finishReason: data.choices[0]?.finish_reason || 'stop'
    }
  }

  /**
   * Generate conversation questions from transcript text
   */
  async generateConversationQuestions(
    loop: SavedLoop, 
    transcript: string, 
    preset?: DifficultyPreset,
    options?: { segments?: Array<{ text: string; start: number; duration: number }> }
  ): Promise<GeneratedQuestions> {
    // Import AI prompts dynamically to avoid circular dependencies
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
      const parsedResponse = PromptManager.parseJSONResponse(response.content)

      // Validate response structure
      if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
        throw new Error('AI response missing questions array')
      }

      // Validate we have the correct number of questions
      const questions = parsedResponse.questions
      if (questions.length !== totalQuestions) {
        console.warn(`Expected ${totalQuestions} questions but got ${questions.length}. Adjusting...`)
      }

      // Validate difficulty distribution
      const easyCount = questions.filter((q: any) => q.difficulty === 'easy').length
      const mediumCount = questions.filter((q: any) => q.difficulty === 'medium').length
      const hardCount = questions.filter((q: any) => q.difficulty === 'hard').length

      console.log(`Question distribution - Easy: ${easyCount}, Medium: ${mediumCount}, Hard: ${hardCount}`)
      console.log(`Expected distribution - Easy: ${actualPreset.easy}, Medium: ${actualPreset.medium}, Hard: ${actualPreset.hard}`)

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
          const shuffledData = this.shuffleOptionsWithSeed(q.options, seed)
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
            timestamp: loop.startTime + (index * (loop.endTime - loop.startTime)) / totalQuestions
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
   * Shuffle array options with seeded randomization for consistent results
   */
  private shuffleOptionsWithSeed(options: string[], seed: string): { options: string[] } {
    // Create a simple hash from the seed for consistent randomization
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }

    // Create a copy of options to shuffle
    const shuffled = [...options]
    
    // Fisher-Yates shuffle with seeded random
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Generate deterministic "random" index based on hash and position
      hash = (hash * 9301 + 49297) % 233280
      const j = Math.abs(hash) % (i + 1)
      
      // Swap elements
      const temp = shuffled[i]
      shuffled[i] = shuffled[j]
      shuffled[j] = temp
    }

    return { options: shuffled }
  }

  // Specialized AI functions for other use cases
  async summarizeText(text: string, maxLength: number = 200): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Summarize the given text in approximately ${maxLength} characters or less. Be concise but capture the key points.`
      },
      {
        role: 'user',
        content: text
      }
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
      {
        role: 'user',
        content: text
      }
    ]

    const response = await this.chat(messages, { maxTokens: Math.ceil(text.length * 1.5) })
    return response.content
  }

  // Check AI service capabilities
  async getCapabilities(): Promise<AICapability[]> {
    const baseCapabilities: AICapability[] = [
      'text-generation',
      'text-analysis',
      'summarization',
      'translation'
    ]

    // Add provider-specific capabilities
    switch (this.config.provider) {
      case 'openai':
        return [...baseCapabilities, 'code-generation', 'function-calling']
      case 'anthropic':
        return [...baseCapabilities, 'long-context', 'reasoning']
      case 'google':
        return [...baseCapabilities, 'multimodal', 'fast-generation']
      default:
        return baseCapabilities
    }
  }

  // Enhanced error handling for AI operations
  private handleAIError(error: any): Error {
    if (error.status === 401) {
      return new Error('AI API key is invalid or expired')
    }

    if (error.status === 429) {
      return new Error('AI service rate limit exceeded. Please try again later.')
    }

    if (error.status === 500) {
      return new Error('AI service is temporarily unavailable')
    }

    if (error.message?.includes('context_length_exceeded')) {
      return new Error('Text is too long for AI processing. Please try with shorter text.')
    }

    return new Error(`AI processing failed: ${error.message || 'Unknown error'}`)
  }

  // Update configuration
  updateConfig(newConfig: Partial<AIConfig>): void {
    this.config = aiConfigSchema.parse({ ...this.config, ...newConfig })
    this.initializeProviders()
  }

  // Get current configuration (without sensitive data)
  getConfig(): Omit<AIConfig, 'apiKey'> {
    const { apiKey, ...safeConfig } = this.config
    return safeConfig
  }
}

/**
 * Factory function to create AI Service with environment configuration
 */
export function createAIService(overrides?: Partial<AIConfig>): AIService {
  const config: AIConfig = {
    provider: (process.env.AI_PROVIDER as AIProvider) || 'openai',
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: process.env.AI_BASE_URL,
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    maxTokens: Number(process.env.AI_MAX_TOKENS) || 4000,
    temperature: Number(process.env.AI_TEMPERATURE) || 0.3,
    ...overrides
  }

  return new AIService(config)
}