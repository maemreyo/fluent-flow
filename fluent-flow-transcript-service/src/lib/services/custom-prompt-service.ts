import { PromptTemplate } from './ai-prompts'
import type { SavedLoop, DifficultyPreset } from './ai-service'

export interface CustomPrompt {
  id: string
  name: string
  description?: string
  category: string
  system_prompt: string
  user_template: string
  config: {
    maxTokens?: number
    temperature?: number
  }
  is_active: boolean
  is_default: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

export interface CustomPromptContext {
  loop: SavedLoop
  transcript?: string
  preset?: DifficultyPreset
  segments?: Array<{ text: string; start: number; duration: number }>
  totalQuestions?: number
  easyCount?: number
  mediumCount?: number
  hardCount?: number
  videoTitle?: string
  startTime?: string
  endTime?: string
  duration?: string
}

export class CustomPromptService {
  /**
   * Convert custom prompt to AI service PromptTemplate format
   */
  static convertToPromptTemplate(customPrompt: CustomPrompt): PromptTemplate {
    return {
      system: customPrompt.system_prompt,
      userTemplate: (context: CustomPromptContext) => {
        return this.processTemplate(customPrompt.user_template, context)
      },
      config: {
        maxTokens: customPrompt.config.maxTokens || 16000,
        temperature: customPrompt.config.temperature || 0.3
      }
    }
  }

  /**
   * Process template with context variables
   */
  static processTemplate(template: string, context: CustomPromptContext): string {
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Calculate values from context
    const preset = context.preset || { easy: 5, medium: 6, hard: 4 }
    const totalQuestions = context.totalQuestions || (preset.easy + preset.medium + preset.hard)
    const easyCount = context.easyCount || preset.easy
    const mediumCount = context.mediumCount || preset.medium
    const hardCount = context.hardCount || preset.hard

    const videoTitle = context.videoTitle || context.loop.videoTitle || 'YouTube Video'
    const startTime = context.startTime || formatTime(context.loop.startTime)
    const endTime = context.endTime || formatTime(context.loop.endTime)
    const duration = context.duration || formatTime(context.loop.endTime - context.loop.startTime)

    // Process transcript content
    const transcriptContent = context.segments
      ? context.segments
          .map(segment => {
            const endTime = segment.start + segment.duration
            return `[${formatTime(segment.start)}-${formatTime(endTime)}] ${segment.text}`
          })
          .join('\n')
      : context.transcript || ''

    // Template variables to replace
    const variables: Record<string, string | number> = {
      totalQuestions,
      easyCount,
      mediumCount, 
      hardCount,
      videoTitle,
      startTime,
      endTime,
      duration,
      transcript: transcriptContent
    }

    // Replace template variables
    let processedTemplate = template
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      processedTemplate = processedTemplate.replace(regex, String(value))
    })

    return processedTemplate
  }

  /**
   * Get default prompt for a category
   */
  static async getDefaultPrompt(category: string): Promise<CustomPrompt | null> {
    try {
      const response = await fetch(`/api/prompts?category=${category}&defaults_only=true`)
      if (!response.ok) return null

      const { prompts } = await response.json()
      return prompts.length > 0 ? prompts[0] : null
    } catch (error) {
      console.error('Error fetching default prompt:', error)
      return null
    }
  }

  /**
   * Get all prompts for a category
   */
  static async getPromptsForCategory(category: string): Promise<CustomPrompt[]> {
    try {
      const response = await fetch(`/api/prompts?category=${category}`)
      if (!response.ok) return []

      const { prompts } = await response.json()
      return prompts || []
    } catch (error) {
      console.error('Error fetching prompts:', error)
      return []
    }
  }

  /**
   * Get all available prompt categories with their prompts
   */
  static async getAllPrompts(): Promise<Record<string, CustomPrompt[]>> {
    try {
      const response = await fetch('/api/prompts')
      if (!response.ok) return {}

      const { grouped } = await response.json()
      return grouped || {}
    } catch (error) {
      console.error('Error fetching all prompts:', error)
      return {}
    }
  }

  /**
   * Increment usage count for a prompt
   */
  static async incrementUsage(promptId: string): Promise<void> {
    try {
      // This would be called when a prompt is used to generate questions
      // We might want to add this endpoint later for analytics
      console.log(`Prompt ${promptId} was used`)
    } catch (error) {
      console.error('Error incrementing usage count:', error)
    }
  }

  /**
   * Category display names in Vietnamese and English
   */
  static getCategoryDisplayName(category: string): { vi: string; en: string } {
    const categoryNames: Record<string, { vi: string; en: string }> = {
      listening_comprehension: {
        vi: 'Nghe hiểu tổng quan',
        en: 'General Listening Comprehension'
      },
      detail_focused: {
        vi: 'Nghe bắt chi tiết', 
        en: 'Detail-focused Listening'
      },
      inference_implication: {
        vi: 'Nghe đoán ý',
        en: 'Inference & Implication'
      },
      tone_analysis: {
        vi: 'Phân tích giọng điệu',
        en: 'Tone & Attitude Analysis'
      },
      vocabulary_context: {
        vi: 'Từ vựng theo ngữ cảnh',
        en: 'Vocabulary in Context'
      },
      language_function: {
        vi: 'Chức năng ngôn ngữ',
        en: 'Language Function Analysis'
      },
      general: {
        vi: 'Tổng hợp',
        en: 'General'
      }
    }

    return categoryNames[category] || { vi: category, en: category }
  }

  /**
   * Validate template variables
   */
  static validateTemplate(template: string): { isValid: boolean; missingVars: string[] } {
    const requiredVars = ['transcript', 'videoTitle', 'totalQuestions']
    const optionalVars = ['easyCount', 'mediumCount', 'hardCount', 'startTime', 'endTime', 'duration']
    
    const missingRequired = requiredVars.filter(varName => {
      const regex = new RegExp(`{{${varName}}}`)
      return !regex.test(template)
    })

    return {
      isValid: missingRequired.length === 0,
      missingVars: missingRequired
    }
  }
}