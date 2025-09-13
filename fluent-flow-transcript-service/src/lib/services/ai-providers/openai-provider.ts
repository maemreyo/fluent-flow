/**
 * OpenAI Provider Implementation
 */

import OpenAI from 'openai'
import { BaseAIProvider } from './base-provider'
import { AIConfig, ChatMessage, AIResponse, AICapability } from '../ai-types'

export class OpenAIProvider extends BaseAIProvider {
  private client?: OpenAI

  constructor(config: AIConfig) {
    super(config)
    this.initialize()
  }

  initialize(): void {
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl
    })
  }

  async chat(
    messages: ChatMessage[],
    options?: {
      stream?: boolean
      temperature?: number
      maxTokens?: number
    }
  ): Promise<AIResponse> {
    if (!this.client) throw new Error('OpenAI client not initialized')

    const mergedOptions = { ...this.config, ...options }

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: messages.map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content
        })),
        max_tokens: mergedOptions.maxTokens,
        temperature: mergedOptions.temperature,
        stream: mergedOptions.stream
      })

      if (mergedOptions.stream) {
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
    } catch (error) {
      throw this.handleError(error)
    }
  }

  getCapabilities(): AICapability[] {
    return [
      'text-generation',
      'text-analysis',
      'summarization',
      'translation',
      'code-generation',
      'function-calling'
    ]
  }
}