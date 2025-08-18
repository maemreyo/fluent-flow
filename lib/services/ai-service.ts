// AI Service - Universal AI integration with multiple providers
// Supports OpenAI, Anthropic Claude, and other AI services

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { z } from 'zod'
import type {
  AICapability,
  AIResponse,
  ChatMessage
} from '../types'
import { ImprovedBaseService } from './improved-base-service'

// AI Configuration Schema
const aiConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'custom']),
  apiKey: z.string().min(1),
  model: z.string().min(1),
  baseUrl: z.string().url().optional(),
  maxTokens: z.number().min(1).max(4096).default(1000),
  temperature: z.number().min(0).max(2).default(0.7),
  stream: z.boolean().default(false)
})

export class AIService extends ImprovedBaseService {
  private openai?: OpenAI
  private anthropic?: Anthropic
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
        
      case 'custom':
        // Initialize custom HTTP client for other providers
        super.setApiKey(this.config.apiKey)
        break
    }
  }

  // Main chat completion method
  async chat(messages: ChatMessage[], options?: {
    stream?: boolean
    temperature?: number
    maxTokens?: number
  }): Promise<AIResponse> {
    try {
      const mergedOptions = { ...this.config, ...options }
      
      switch (this.config.provider) {
        case 'openai':
          return await this.chatWithOpenAI(messages, mergedOptions)
          
        case 'anthropic':
          return await this.chatWithAnthropic(messages, mergedOptions)
          
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
  private async chatWithOpenAI(
    messages: ChatMessage[], 
    options: any
  ): Promise<AIResponse> {
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
  private async chatWithAnthropic(
    messages: ChatMessage[], 
    options: any
  ): Promise<AIResponse> {
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
    const content = message.content[0]?.type === 'text' 
      ? message.content[0].text 
      : ''

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

  // Custom provider implementation
  private async chatWithCustomProvider(
    messages: ChatMessage[], 
    options: any
  ): Promise<AIResponse> {
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
    const complexity = level === 'simple' ? 'simple terms suitable for a general audience' : 'detailed technical explanation'
    
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

  async analyzeText(text: string, analysisType: 'sentiment' | 'keywords' | 'topics' | 'language'): Promise<string> {
    const prompts = {
      sentiment: 'Analyze the sentiment of this text (positive, negative, neutral) and explain why.',
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

  async generateContent(prompt: string, contentType: 'email' | 'summary' | 'creative' | 'technical'): Promise<string> {
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
      
      const batchPromises = batch.map(async (text) => {
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
      
      batchResults.forEach((result) => {
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
