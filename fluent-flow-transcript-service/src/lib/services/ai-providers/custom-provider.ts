/**
 * Custom Provider Implementation
 * For HTTP-based AI providers with OpenAI-compatible APIs
 */

import { BaseAIProvider } from './base-provider'
import { AIConfig, ChatMessage, AIResponse, AICapability } from '../ai-types'

export class CustomProvider extends BaseAIProvider {
  constructor(config: AIConfig) {
    super(config)
    this.initialize()
  }

  initialize(): void {
    // No initialization needed for HTTP-based provider
    if (!this.config.baseUrl) {
      throw new Error('Base URL is required for custom provider')
    }
  }

  async chat(
    messages: ChatMessage[],
    options?: {
      stream?: boolean
      temperature?: number
      maxTokens?: number
    }
  ): Promise<AIResponse> {
    const mergedOptions = { ...this.config, ...options }

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          max_tokens: mergedOptions.maxTokens,
          temperature: mergedOptions.temperature,
          stream: mergedOptions.stream
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
    } catch (error) {
      throw this.handleError(error)
    }
  }

  getCapabilities(): AICapability[] {
    return [
      'text-generation',
      'text-analysis',
      'summarization',
      'translation'
    ]
  }
}