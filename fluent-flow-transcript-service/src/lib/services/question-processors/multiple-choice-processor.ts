/**
 * Multiple Choice Question Processor
 */

import { QuestionProcessor, GeneratedQuestions, GeneratedQuestion, SavedLoop } from '../ai-types'
import { shuffleOptionsWithSeed } from '../utils/question-utils'

export class MultipleChoiceProcessor implements QuestionProcessor {
  processResponse(
    parsedResponse: any,
    loop: SavedLoop,
    difficulty: 'easy' | 'medium' | 'hard',
    targetQuestionCount: number
  ): GeneratedQuestions {
    // Validate response structure
    if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
      throw new Error('AI response missing questions array')
    }

    // Validate we have the expected number of questions
    const questions = parsedResponse.questions
    if (questions.length !== targetQuestionCount) {
      console.warn(`Expected ${targetQuestionCount} questions but got ${questions.length}. Using available questions.`)
    }

    // Validate all questions are at the correct difficulty level
    const correctDifficultyQuestions = questions.filter((q: any) => q.difficulty === difficulty)
    const finalQuestions = correctDifficultyQuestions.slice(0, targetQuestionCount) // Take target count

    console.log(`Generated ${finalQuestions.length} ${difficulty} questions (requested: ${targetQuestionCount})`)

    return {
      questions: finalQuestions.map((q: any, index: number) => {
        // Validate question structure
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
          throw new Error(`Invalid question structure at index ${index}`)
        }

        // Shuffle answer options to randomize correct answer position
        const correctAnswerIndex = ['A', 'B', 'C', 'D'].indexOf(q.correctAnswer || 'A')
        const correctOption = q.options[correctAnswerIndex] || q.options[0]
        
        // Create shuffled array with seeded randomization for consistency
        const seed = loop.id + difficulty + index // Use loop ID, difficulty and index as seed
        const shuffledData = shuffleOptionsWithSeed(q.options, seed)
        const newCorrectIndex = shuffledData.options.indexOf(correctOption)
        const newCorrectAnswer = ['A', 'B', 'C', 'D'][newCorrectIndex] as 'A' | 'B' | 'C' | 'D'

        return {
          id: `q_${loop.id}_${difficulty}_${index + 1}`,
          question: q.question,
          options: shuffledData.options,
          correctAnswer: newCorrectAnswer,
          explanation: q.explanation || 'No explanation provided',
          difficulty: difficulty, // Ensure difficulty is consistent
          type: [
            'main_idea',
            'specific_detail',
            'vocabulary_in_context',
            'inference',
            'speaker_tone',
            'language_function'
          ].includes(q.type)
            ? q.type
            : 'main_idea',
          timestamp:
            q.timestamp ??
            loop.startTime + (index * (loop.endTime - loop.startTime)) / finalQuestions.length
        } as GeneratedQuestion
      }),
      preset: { easy: difficulty === 'easy' ? finalQuestions.length : 0, medium: difficulty === 'medium' ? finalQuestions.length : 0, hard: difficulty === 'hard' ? finalQuestions.length : 0 },
      actualDistribution: { 
        easy: difficulty === 'easy' ? finalQuestions.length : 0, 
        medium: difficulty === 'medium' ? finalQuestions.length : 0, 
        hard: difficulty === 'hard' ? finalQuestions.length : 0 
      }
    }
  }
}