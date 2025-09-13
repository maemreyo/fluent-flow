/**
 * AI Providers Index
 * Factory function to create providers
 */

import { AIConfig } from '../ai-types'
import { BaseAIProvider } from './base-provider'
import { OpenAIProvider } from './openai-provider'
import { AnthropicProvider } from './anthropic-provider'
import { GoogleProvider } from './google-provider'
import { CustomProvider } from './custom-provider'

export * from './base-provider'
export * from './openai-provider'
export * from './anthropic-provider'
export * from './google-provider'
export * from './custom-provider'

/**
 * Factory function to create AI provider instance
 */
export function createAIProvider(config: AIConfig): BaseAIProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config)
    case 'anthropic':
      return new AnthropicProvider(config)
    case 'google':
      return new GoogleProvider(config)
    case 'custom':
      return new CustomProvider(config)
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`)
  }
}