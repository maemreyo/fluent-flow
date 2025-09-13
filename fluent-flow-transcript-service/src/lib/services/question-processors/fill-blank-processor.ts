/**
 * Fill-in-the-Blank Question Processor
 */

import { QuestionProcessor, GeneratedQuestions, GeneratedQuestion, SavedLoop } from '../ai-types'

export class FillBlankProcessor implements QuestionProcessor {
  processResponse(
    parsedResponse: any,
    loop: SavedLoop,
    difficulty: 'easy' | 'medium' | 'hard',
    targetQuestionCount: number
  ): GeneratedQuestions {
    // Validate response structure for Fill-in-the-Blank
    if (!parsedResponse.exercises || !Array.isArray(parsedResponse.exercises)) {
      throw new Error('AI response missing exercises array for Fill-in-the-Blank')
    }

    const exercises = parsedResponse.exercises
    console.log(`Generated ${exercises.length} Fill-in-the-Blank exercises (requested: ${targetQuestionCount})`)

    return {
      questions: exercises.slice(0, targetQuestionCount).map((exercise: any, index: number) => {
        // Validate Fill-in-the-Blank exercise structure
        if (!exercise.transcript || !Array.isArray(exercise.blanks)) {
          throw new Error(`Invalid Fill-in-the-Blank exercise structure at index ${index}`)
        }

        // Process blanks to ensure proper format
        const processedBlanks = exercise.blanks.map((blank: any) => ({
          position: blank.position || 0,
          answer: blank.answer || '',
          alternatives: Array.isArray(blank.alternatives) ? blank.alternatives : [],
          caseSensitive: blank.caseSensitive || false
        }))

        return {
          id: `q_${loop.id}_fillblank_${index + 1}`,
          type: 'fill_blank',
          difficulty: difficulty,
          explanation: exercise.explanation || 'Fill in the blanks with the correct words.',
          transcript: exercise.transcript,
          blanks: processedBlanks,
          audioSegment: {
            start: exercise.audioSegment?.start || loop.startTime + (index * (loop.endTime - loop.startTime)) / targetQuestionCount,
            end: exercise.audioSegment?.end || loop.startTime + ((index + 1) * (loop.endTime - loop.startTime)) / targetQuestionCount
          },
          timestamp: exercise.timestamp || loop.startTime + (index * (loop.endTime - loop.startTime)) / targetQuestionCount
        } as GeneratedQuestion
      }),
      preset: { 
        easy: difficulty === 'easy' ? exercises.slice(0, targetQuestionCount).length : 0, 
        medium: difficulty === 'medium' ? exercises.slice(0, targetQuestionCount).length : 0, 
        hard: difficulty === 'hard' ? exercises.slice(0, targetQuestionCount).length : 0 
      },
      actualDistribution: { 
        easy: difficulty === 'easy' ? exercises.slice(0, targetQuestionCount).length : 0, 
        medium: difficulty === 'medium' ? exercises.slice(0, targetQuestionCount).length : 0, 
        hard: difficulty === 'hard' ? exercises.slice(0, targetQuestionCount).length : 0 
      }
    }
  }
}