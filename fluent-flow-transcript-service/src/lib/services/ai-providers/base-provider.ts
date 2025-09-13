/**
 * Base AI Provider Interface
 * Abstract base class for all AI providers
 */

import { AIConfig, ChatMessage, AIResponse, AICapability } from '../ai-types'

export abstract class BaseAIProvider {
  protected config: AIConfig

  constructor(config: AIConfig) {
    this.config = config
  }

  /**
   * Initialize the provider with API keys and configuration
   */
  abstract initialize(): void

  /**
   * Send chat completion request
   */
  abstract chat(
    messages: ChatMessage[],
    options?: {
      stream?: boolean
      temperature?: number
      maxTokens?: number
    }
  ): Promise<AIResponse>

  /**
   * Get provider capabilities
   */
  abstract getCapabilities(): AICapability[]

  /**
   * Handle provider-specific errors
   */
  protected handleError(error: any): Error {
    if (error.status === 401) {
      return new Error(`${this.config.provider} API key is invalid or expired`)
    }

    if (error.status === 429) {
      return new Error(`${this.config.provider} rate limit exceeded. Please try again later.`)
    }

    if (error.status === 500) {
      return new Error(`${this.config.provider} service is temporarily unavailable`)
    }

    if (error.message?.includes('context_length_exceeded')) {
      return new Error('Text is too long for AI processing. Please try with shorter text.')
    }

    return new Error(`${this.config.provider} processing failed: ${error.message || 'Unknown error'}`)
  }

  /**
   * Update provider configuration
   */
  updateConfig(newConfig: Partial<AIConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.initialize()
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig(): Omit<AIConfig, 'apiKey'> {
    const { apiKey, ...safeConfig } = this.config
    return safeConfig
  }
}