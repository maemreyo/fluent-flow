/**
 * AI Service Types and Interfaces
 * Centralized type definitions for the AI service
 */

import { z } from 'zod'

// Basic AI Types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  content: string
  usage: {
    totalTokens: number
    promptTokens: number
    completionTokens: number
  }
  model: string
  provider: 'openai' | 'anthropic' | 'google' | 'custom'
  finishReason: string
  stream?: any
}

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'custom'

export type AICapability =
  | 'text-generation'
  | 'text-analysis'
  | 'summarization'
  | 'translation'
  | 'code-generation'
  | 'function-calling'
  | 'long-context'
  | 'reasoning'
  | 'multimodal'
  | 'fast-generation'

// Configuration Schema
export const aiConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google', 'custom']),
  apiKey: z.string().min(1, 'API key is required'),
  baseUrl: z.string().optional(),
  model: z.string().min(1, 'Model is required'),
  maxTokens: z.number().min(1).max(100000).default(4000),
  temperature: z.number().min(0).max(2).default(0.7)
})

export type AIConfig = z.infer<typeof aiConfigSchema>

// Loop and Generation Types
export interface SavedLoop {
  id: string
  videoTitle?: string
  startTime: number
  endTime: number
}

export interface DifficultyPreset {
  easy: number
  medium: number
  hard: number
}

// Question Types
export interface GeneratedQuestion {
  id: string
  question?: string // Made optional for Fill-in-the-Blank
  options?: string[] // Made optional for Fill-in-the-Blank
  correctAnswer?: 'A' | 'B' | 'C' | 'D' // Made optional for Fill-in-the-Blank
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
  type:
    | 'main_idea'
    | 'specific_detail' 
    | 'vocabulary_in_context'
    | 'inference'
    | 'speaker_tone'
    | 'language_function'
    | 'fill_blank' // Added Fill-in-the-Blank type
  timestamp?: number
  // Fill-in-the-Blank specific fields
  transcript?: string
  blanks?: Array<{
    position: number
    answer: string
    alternatives?: string[]
    caseSensitive?: boolean
  }>
  audioSegment?: {
    start: number
    end: number
  }
}

export interface GeneratedQuestions {
  questions: GeneratedQuestion[]
  preset: DifficultyPreset
  actualDistribution: {
    easy: number
    medium: number
    hard: number
  }
}

export interface CustomPrompt {
  system_prompt: string
  user_template: string
  exerciseType?: 'multiple_choice' | 'fill_blank' // Added to identify prompt type
  config?: {
    maxTokens?: number
    temperature?: number
  }
}

export interface QuestionGenerationOptions {
  segments?: Array<{ text: string; start: number; duration: number }>
  customPrompt?: CustomPrompt
  questionCount?: number // Allow custom question count
}

// Response Processing Types
export interface QuestionProcessor {
  processResponse(
    parsedResponse: any,
    loop: SavedLoop,
    difficulty: 'easy' | 'medium' | 'hard',
    targetQuestionCount: number
  ): GeneratedQuestions
}