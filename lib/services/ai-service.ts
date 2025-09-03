// AI Service - Universal AI integration with multiple providers
// Supports OpenAI, Anthropic Claude, and other AI services

import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import * as z from 'zod'
import type { AICapability, AIResponse, ChatMessage } from '../types'
import { ImprovedBaseService } from './improved-base-service'

// AI Configuration Schema
const aiConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google', 'custom']),
  apiKey: z.string().min(1),
  model: z.string().min(1),
  baseUrl: z.string().url().optional(),
  maxTokens: z.number().min(1).max(128000).default(1000),
  temperature: z.number().min(0).max(2).default(0.7),
  stream: z.boolean().default(false)
})

export class AIService extends ImprovedBaseService {
  private openai?: OpenAI
  private anthropic?: Anthropic
  private google?: GoogleGenerativeAI
  private config: z.infer<typeof aiConfigSchema>

  constructor(config: z.infer<typeof aiConfigSchema>) {
    super()
    this.config = aiConfigSchema.parse(config)
    this.initializeProviders()
  }

  private initializeProviders() {
    switch (this.config.provider) {
      case 'openai':
        this.openai = new OpenAI({
          apiKey: this.config.apiKey,
          baseURL: this.config.baseUrl,
          dangerouslyAllowBrowser: true // For extension environment
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
        // Initialize custom HTTP client for other providers
        super.setApiKey(this.config.apiKey)
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
    } catch (error) {
      throw new Error(`Google Gemini API error: ${error.message}`)
    }
  }

  // Custom provider implementation
  private async chatWithCustomProvider(messages: ChatMessage[], options: any): Promise<AIResponse> {
    const response = await this.post<{
      choices: Array<{
        message: { content: string }
        finish_reason: string
      }>
      usage: {
        total_tokens: number
        prompt_tokens: number
        completion_tokens: number
      }
      model: string
    }>('chat/completions', {
      model: this.config.model,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      stream: options.stream
    })

    return {
      content: response.choices[0]?.message?.content || '',
      usage: {
        totalTokens: response.usage?.total_tokens || 0,
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0
      },
      model: response.model,
      provider: 'custom',
      finishReason: response.choices[0]?.finish_reason || 'stop'
    }
  }

  // Specialized AI functions
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

  async explainText(text: string, level: 'simple' | 'detailed' = 'simple'): Promise<string> {
    const complexity =
      level === 'simple'
        ? 'simple terms suitable for a general audience'
        : 'detailed technical explanation'

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Explain the given text in ${complexity}. Be clear and helpful.`
      },
      {
        role: 'user',
        content: text
      }
    ]

    const response = await this.chat(messages)
    return response.content
  }

  async analyzeText(
    text: string,
    analysisType: 'sentiment' | 'keywords' | 'topics' | 'language'
  ): Promise<string> {
    const prompts = {
      sentiment:
        'Analyze the sentiment of this text (positive, negative, neutral) and explain why.',
      keywords: 'Extract the key terms and phrases from this text.',
      topics: 'Identify the main topics and themes discussed in this text.',
      language: 'Identify the language of this text and its linguistic characteristics.'
    }

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: prompts[analysisType]
      },
      {
        role: 'user',
        content: text
      }
    ]

    const response = await this.chat(messages)
    return response.content
  }

  async generateContent(
    prompt: string,
    contentType: 'email' | 'summary' | 'creative' | 'technical'
  ): Promise<string> {
    const systemPrompts = {
      email: 'Generate a professional email based on the given requirements.',
      summary: 'Create a clear and concise summary based on the given information.',
      creative: 'Write creative content based on the given prompt.',
      technical: 'Generate technical content with accuracy and proper terminology.'
    }

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompts[contentType]
      },
      {
        role: 'user',
        content: prompt
      }
    ]

    const response = await this.chat(messages)
    return response.content
  }

  /**
   * Specialized method for vocabulary analysis from transcript text
   */
  async analyzeVocabulary(transcriptText: string): Promise<any> {
    const { prompts, PromptManager } = await import('./ai-prompts')
    const template = prompts.vocabularyAnalysis

    const messages = PromptManager.buildMessages(template, transcriptText)
    const config = PromptManager.getConfig(template)

    try {
      const response = await this.chat(messages, config)
      const parsedResponse = PromptManager.parseJSONResponse(response.content)

      // Validate and clean response structure
      return {
        words: (parsedResponse.words || []).map((w: any) => ({
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
        phrases: (parsedResponse.phrases || []).map((p: any) => ({
          phrase: p.phrase || '',
          type: p.type || 'expression',
          definition: p.definition || '',
          definitionVi: p.definitionVi || '',
          example: p.example || '',
          difficulty: p.difficulty || 'intermediate',
          frequency: p.frequency || 1
        })),
        totalWords: parsedResponse.totalWords || transcriptText.split(/\s+/).length,
        uniqueWords:
          parsedResponse.uniqueWords || new Set(transcriptText.toLowerCase().split(/\s+/)).size,
        difficultyLevel: parsedResponse.difficultyLevel || 'intermediate',
        suggestedFocusWords: Array.isArray(parsedResponse.suggestedFocusWords)
          ? parsedResponse.suggestedFocusWords
          : []
      }
    } catch (error) {
      throw new Error(`Vocabulary analysis failed: ${error.message}`)
    }
  }

  /**
   * Specialized method for generating summaries from transcript text
   */
  async generateTranscriptSummary(transcriptText: string): Promise<any> {
    const words = transcriptText.split(/\s+/).length
    const estimatedReadingTime = Math.ceil(words / 200) // 200 WPM

    const { prompts, PromptManager } = await import('./ai-prompts')
    const template = prompts.transcriptSummary

    const messages = PromptManager.buildMessages(template, transcriptText)
    const config = PromptManager.getConfig(template)

    try {
      const response = await this.chat(messages, config)
      const parsedResponse = PromptManager.parseJSONResponse(response.content)

      return {
        summary: parsedResponse.summary || 'Summary not available',
        keyPoints: Array.isArray(parsedResponse.keyPoints) ? parsedResponse.keyPoints : [],
        topics: Array.isArray(parsedResponse.topics) ? parsedResponse.topics : [],
        difficulty: parsedResponse.difficulty || 'intermediate',
        estimatedReadingTime
      }
    } catch (error) {
      throw new Error(`Summary generation failed: ${error.message}`)
    }
  }

  /**
   * Generate conversation questions from transcript text
   */
  async generateConversationQuestions(
    loop: any, 
    transcript: string, 
    preset?: { easy: number; medium: number; hard: number }
  ): Promise<any> {
    const { prompts, PromptManager } = await import('./ai-prompts')
    const template = prompts.conversationQuestions

    // Default to largest preset (15 questions) to ensure we have enough for all presets
    const defaultPreset = { easy: 5, medium: 6, hard: 4 }
    const actualPreset = preset || defaultPreset
    const totalQuestions = actualPreset.easy + actualPreset.medium + actualPreset.hard

    const messages = PromptManager.buildMessages(template, { loop, transcript, preset: actualPreset })
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
      const easyCount = questions.filter(q => q.difficulty === 'easy').length
      const mediumCount = questions.filter(q => q.difficulty === 'medium').length
      const hardCount = questions.filter(q => q.difficulty === 'hard').length

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
          const newCorrectAnswer = ['A', 'B', 'C', 'D'][newCorrectIndex]

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
          }
        }),
        preset: actualPreset,
        actualDistribution: { easy: easyCount, medium: mediumCount, hard: hardCount }
      }
    } catch (error) {
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

  // Batch processing for multiple texts
  async batchProcess(
    texts: string[],
    operation: 'summarize' | 'translate' | 'analyze',
    options?: any
  ): Promise<string[]> {
    const batchSize = 5 // Process in batches to avoid rate limits
    const results: string[] = []

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)

      const batchPromises = batch.map(async text => {
        switch (operation) {
          case 'summarize':
            return await this.summarizeText(text, options?.maxLength)
          case 'translate':
            return await this.translateText(text, options?.targetLanguage)
          case 'analyze':
            return await this.analyzeText(text, options?.analysisType)
          default:
            throw new Error(`Unknown operation: ${operation}`)
        }
      })

      const batchResults = await Promise.allSettled(batchPromises)

      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push(`Error: ${result.reason.message}`)
        }
      })

      // Add delay between batches to respect rate limits
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return results
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
  updateConfig(newConfig: Partial<z.infer<typeof aiConfigSchema>>): void {
    this.config = aiConfigSchema.parse({ ...this.config, ...newConfig })
    this.initializeProviders()
  }

  // Get current configuration
  getConfig(): z.infer<typeof aiConfigSchema> {
    return { ...this.config }
  }
}

// Service factory function to create AIService with configuration
export const createAIService = async (
  provider: 'openai' | 'anthropic' | 'google' | 'custom' = 'google'
): Promise<AIService> => {
  let apiConfig = null

  try {
    // First try to get config from Supabase
    const { getFluentFlowStore } = await import('../stores/fluent-flow-supabase-store')
    const { supabaseService } = getFluentFlowStore()
    apiConfig = await supabaseService.getApiConfig()
  } catch (supabaseError) {
    console.log('AI Service: Failed to load from Supabase, trying Chrome storage:', supabaseError)

    // Fallback to Chrome storage
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'STORAGE_OPERATION',
        operation: 'get',
        key: 'api_config'
      })
      apiConfig = response.data
    } catch (chromeError) {
      console.log('AI Service: Failed to load from Chrome storage:', chromeError)
    }
  }

  // Get provider-specific config
  let config: any
  switch (provider) {
    case 'openai':
      config = apiConfig?.openai
      if (!config?.apiKey) {
        throw new Error('OpenAI API key not configured. Please configure your API key in settings.')
      }
      return new AIService({
        provider: 'openai',
        apiKey: config.apiKey,
        model: config.model || 'gpt-4o-mini',
        maxTokens: 16000,
        temperature: 0.7
      })

    case 'anthropic':
      config = apiConfig?.anthropic
      if (!config?.apiKey) {
        throw new Error(
          'Anthropic API key not configured. Please configure your API key in settings.'
        )
      }
      return new AIService({
        provider: 'anthropic',
        apiKey: config.apiKey,
        model: config.model || 'claude-3-sonnet-20240229',
        maxTokens: 16000,
        temperature: 0.7
      })

    case 'google':
    default:
      config = apiConfig?.gemini
      if (!config?.apiKey) {
        throw new Error(
          'Google Gemini API key not configured. Please configure your API key in settings.'
        )
      }
      return new AIService({
        provider: 'google',
        apiKey: config.apiKey,
        model: config.model || 'gemini-2.5-flash-lite',
        maxTokens: 16000,
        temperature: 0.7
      })
  }
}
