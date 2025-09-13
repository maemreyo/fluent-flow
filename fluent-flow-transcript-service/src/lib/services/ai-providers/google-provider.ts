/**
 * Google Gemini Provider Implementation
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { BaseAIProvider } from './base-provider'
import { AIConfig, ChatMessage, AIResponse, AICapability } from '../ai-types'

export class GoogleProvider extends BaseAIProvider {
  private client?: GoogleGenerativeAI

  constructor(config: AIConfig) {
    super(config)
    this.initialize()
  }

  initialize(): void {
    this.client = new GoogleGenerativeAI(this.config.apiKey)
  }

  async chat(
    messages: ChatMessage[],
    options?: {
      stream?: boolean
      temperature?: number
      maxTokens?: number
    }
  ): Promise<AIResponse> {
    if (!this.client) throw new Error('Google Gemini client not initialized')

    const mergedOptions = { ...this.config, ...options }

    try {
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

      const model = this.client.getGenerativeModel({
        model: this.config.model || 'gemini-2.5-flash-lite',
        generationConfig: {
          maxOutputTokens: mergedOptions.maxTokens,
          temperature: mergedOptions.temperature
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

  getCapabilities(): AICapability[] {
    return [
      'text-generation',
      'text-analysis',
      'summarization',
      'translation',
      'multimodal',
      'fast-generation'
    ]
  }
}