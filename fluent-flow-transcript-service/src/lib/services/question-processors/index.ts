/**
 * Question Processors Index
 * Factory function to create processors
 */

import { QuestionProcessor } from '../ai-types'
import { FillBlankProcessor } from './fill-blank-processor'
import { MultipleChoiceProcessor } from './multiple-choice-processor'

export * from './fill-blank-processor'
export * from './multiple-choice-processor'

/**
 * Factory function to create question processor
 */
export function createQuestionProcessor(exerciseType: 'multiple_choice' | 'fill_blank'): QuestionProcessor {
  switch (exerciseType) {
    case 'fill_blank':
      return new FillBlankProcessor()
    case 'multiple_choice':
    default:
      return new MultipleChoiceProcessor()
  }
}