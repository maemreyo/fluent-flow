/**
 * Anthropic Claude Provider Implementation
 */

import Anthropic from '@anthropic-ai/sdk'
import { BaseAIProvider } from './base-provider'
import { AIConfig, ChatMessage, AIResponse, AICapability } from '../ai-types'

export class AnthropicProvider extends BaseAIProvider {
  private client?: Anthropic

  constructor(config: AIConfig) {
    super(config)
    this.initialize()
  }

  initialize(): void {
    this.client = new Anthropic({
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
    if (!this.client) throw new Error('Anthropic client not initialized')

    const mergedOptions = { ...this.config, ...options }

    try {
      // Convert messages to Anthropic format
      const systemMessage = messages.find(m => m.role === 'system')
      const conversationMessages = messages.filter(m => m.role !== 'system')

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: mergedOptions.maxTokens,
        temperature: mergedOptions.temperature,
        system: systemMessage?.content,
        messages: conversationMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        stream: mergedOptions.stream
      })

      if (mergedOptions.stream) {
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
      'long-context',
      'reasoning'
    ]
  }
}