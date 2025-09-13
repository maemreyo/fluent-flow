/**
 * AI Service Configuration
 * Handles environment and configuration setup
 */

import { AIConfig, AIProvider, aiConfigSchema } from './ai-types'

/**
 * Factory function to create AI Service with environment configuration
 */
export function createAIConfig(overrides?: Partial<AIConfig>): AIConfig {
  const config: AIConfig = {
    provider: (process.env.AI_PROVIDER as AIProvider) || 'openai',
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: process.env.AI_BASE_URL,
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    maxTokens: Number(process.env.AI_MAX_TOKENS) || 4000,
    temperature: Number(process.env.AI_TEMPERATURE) || 0.3,
    ...overrides
  }

  return aiConfigSchema.parse(config)
}

/**
 * Validate AI configuration
 */
export function validateAIConfig(config: Partial<AIConfig>): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  try {
    aiConfigSchema.parse(config)
    return { isValid: true, errors: [] }
  } catch (error: any) {
    if (error.errors) {
      error.errors.forEach((err: any) => {
        errors.push(`${err.path.join('.')}: ${err.message}`)
      })
    } else {
      errors.push('Invalid configuration')
    }
    
    return { isValid: false, errors }
  }
}

/**
 * Get provider-specific defaults
 */
export function getProviderDefaults(provider: AIProvider): Partial<AIConfig> {
  switch (provider) {
    case 'openai':
      return {
        model: 'gpt-4o-mini',
        maxTokens: 16000,
        temperature: 0.7
      }
    case 'anthropic':
      return {
        model: 'claude-3-sonnet-20240229',
        maxTokens: 16000,
        temperature: 0.7
      }
    case 'google':
      return {
        model: 'gemini-2.5-flash-lite',
        maxTokens: 16000,
        temperature: 0.7
      }
    default:
      return {
        maxTokens: 4000,
        temperature: 0.7
      }
  }
}