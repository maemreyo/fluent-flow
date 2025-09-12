/**
 * Question Types for Fluent Flow Quiz System
 * Extended support for multiple exercise types
 */

// Base Question Interface
export interface BaseQuestion {
  id: string
  timestamp: number
  difficulty: 'easy' | 'medium' | 'hard'
  explanation: string
  type: ExerciseType
}

// Exercise Types
export type ExerciseType = 'multiple-choice' | 'fill-blank' | 'dictation' | 'true-false' | 'sequencing' | 'matching'

// Multiple Choice Question (Current format - unchanged)
export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice'
  exerciseSubType: 'specific_detail' | 'vocabulary_in_context' | 'inference' | 'main_idea' | 'speaker_tone' | 'language_function'
  question: string
  options: [string, string, string, string] // Always 4 options for MCQ
  correctAnswer: 'A' | 'B' | 'C' | 'D'
}

// Fill-in-the-Blank Question (NEW)
export interface FillBlankQuestion extends BaseQuestion {
  type: 'fill-blank'
  exerciseSubType: 'single-word' | 'phrase' | 'grammar' | 'specific-info'
  transcript: string
  blanks: BlankItem[]
  audioSegment: AudioSegment
}

export interface BlankItem {
  position: number // Character position in transcript
  length: number // Length of blank in characters
  answer: string // Correct answer
  alternatives?: string[] // Alternative accepted answers
  caseSensitive?: boolean // Default: false
  hint?: string // Optional hint for difficulty
}

export interface AudioSegment {
  start: number // Start time in seconds
  end: number // End time in seconds
}

// Dictation Question (NEW - for future implementation)
// TODO: Implement dictation question type
export interface DictationQuestion extends BaseQuestion {
  type: 'dictation'
  exerciseSubType: 'sentence' | 'passage' | 'spot-dictation'
  audioSegment: AudioSegment
  targetText: string
  allowedPlaybacks: number
  validation: {
    ignoreCase: boolean
    ignorePunctuation: boolean
    similarityThreshold: number // 0.0 to 1.0
  }
}

// True/False/Not Given Question (NEW - for future implementation) 
// TODO: Implement true-false question type
export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true-false'
  statement: string
  correctAnswer: 'true' | 'false' | 'not-given'
}

// Union type for all question types
export type Question = MultipleChoiceQuestion | FillBlankQuestion | DictationQuestion | TrueFalseQuestion

// Answer Types
export interface BaseAnswer {
  questionId: string
  timeSpent?: number // Time spent on question in seconds
  confidence?: 'low' | 'medium' | 'high'
}

export interface MultipleChoiceAnswer extends BaseAnswer {
  selectedOption: 'A' | 'B' | 'C' | 'D'
}

export interface FillBlankAnswer extends BaseAnswer {
  answers: { [position: number]: string } // Position to answer mapping
}

export interface DictationAnswer extends BaseAnswer {
  transcribedText: string
  playbacksUsed: number
}

export interface TrueFalseAnswer extends BaseAnswer {
  selectedAnswer: 'true' | 'false' | 'not-given'
}

export type Answer = MultipleChoiceAnswer | FillBlankAnswer | DictationAnswer | TrueFalseAnswer

// Answer Validation Results
export interface ValidationResult {
  isCorrect: boolean
  score: number // 0-100 percentage
  feedback: string
  detailedFeedback?: any
}

export interface FillBlankValidationResult extends ValidationResult {
  blankResults: {
    position: number
    userAnswer: string
    correctAnswer: string
    isCorrect: boolean
    acceptedAlternative?: string
  }[]
}

export interface DictationValidationResult extends ValidationResult {
  similarityScore: number // 0.0-1.0
  errors: {
    type: 'spelling' | 'grammar' | 'missing' | 'extra'
    position: number
    expected: string
    actual: string
  }[]
}

// Question Generation Config
export interface QuestionGenerationConfig {
  exerciseTypes: ExerciseType[]
  difficulty: 'easy' | 'medium' | 'hard'
  count: number
  distribution?: Partial<Record<ExerciseType, number>>
  preset?: string
  config?: {
    // Fill-blank specific
    maxBlanksPerQuestion?: number
    blankTypes?: ('single-word' | 'phrase' | 'grammar' | 'specific-info')[]
    // TODO: Add config for other exercise types
  }
}

// Utility type guards
export function isMultipleChoiceQuestion(question: Question): question is MultipleChoiceQuestion {
  return question.type === 'multiple-choice'
}

export function isFillBlankQuestion(question: Question): question is FillBlankQuestion {
  return question.type === 'fill-blank'
}

export function isDictationQuestion(question: Question): question is DictationQuestion {
  return question.type === 'dictation'
}

export function isTrueFalseQuestion(question: Question): question is TrueFalseQuestion {
  return question.type === 'true-false'
}

// Legacy support for existing question format
export interface LegacyQuestion {
  id: string
  type: string // String type from database
  options?: string[]
  question?: string
  timestamp: number
  difficulty: 'easy' | 'medium' | 'hard'
  explanation: string
  correctAnswer?: string
}

// Convert legacy question to new format
export function convertLegacyQuestion(legacy: LegacyQuestion): Question {
  // Default to multiple choice for backward compatibility
  if (legacy.options && legacy.question && legacy.correctAnswer) {
    return {
      id: legacy.id,
      type: 'multiple-choice',
      exerciseSubType: (legacy.type as any) || 'specific_detail',
      question: legacy.question,
      options: legacy.options as [string, string, string, string],
      correctAnswer: legacy.correctAnswer as 'A' | 'B' | 'C' | 'D',
      timestamp: legacy.timestamp,
      difficulty: legacy.difficulty,
      explanation: legacy.explanation
    }
  }
  
  throw new Error(`Cannot convert legacy question with id: ${legacy.id}`)
}