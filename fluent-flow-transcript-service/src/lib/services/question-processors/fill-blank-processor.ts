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
    // Support both 'exercises' and 'questions' array formats
    const questions = parsedResponse.exercises || parsedResponse.questions
    if (!questions || !Array.isArray(questions)) {
      throw new Error('AI response missing exercises or questions array for Fill-in-the-Blank')
    }

    console.log(`Generated ${questions.length} Fill-in-the-Blank questions (requested: ${targetQuestionCount})`)

    return {
      questions: questions.slice(0, targetQuestionCount).map((question: any, index: number) => {
        // Validate Fill-in-the-Blank question structure
        if (!question.transcript || !Array.isArray(question.blanks)) {
          throw new Error(`Invalid Fill-in-the-Blank question structure at index ${index}`)
        }

        // Process blanks to ensure proper format
        const processedBlanks = question.blanks.map((blank: any) => ({
          position: blank.position || 0,
          answer: blank.answer || '',
          alternatives: Array.isArray(blank.alternatives) ? blank.alternatives : [],
          caseSensitive: blank.caseSensitive || false
        }))

        // Create transcript with [BLANK_N] placeholders
        let transcriptWithBlanks = question.transcript
        if (!transcriptWithBlanks.includes('[BLANK_')) {
          // If transcript doesn't have blanks, create them from blank positions
          processedBlanks.forEach((blank, blankIndex) => {
            const blankPlaceholder = `[BLANK_${blankIndex + 1}]`
            const answerRegex = new RegExp(`\\b${blank.answer}\\b`, 'gi')
            transcriptWithBlanks = transcriptWithBlanks.replace(answerRegex, blankPlaceholder)
          })
        }

        return {
          id: `q_${loop.id}_fillblank_${index + 1}`,
          type: 'fill_blank',
          difficulty: difficulty,
          explanation: question.explanation || 'Fill in the blanks with the correct words.',
          transcript: transcriptWithBlanks,
          blanks: processedBlanks,
          audioSegment: {
            start: question.audioSegment?.start || loop.startTime + (index * (loop.endTime - loop.startTime)) / targetQuestionCount,
            end: question.audioSegment?.end || loop.startTime + ((index + 1) * (loop.endTime - loop.startTime)) / targetQuestionCount
          },
          timestamp: question.timestamp || loop.startTime + (index * (loop.endTime - loop.startTime)) / targetQuestionCount
        } as GeneratedQuestion
      }),
      preset: { 
        easy: difficulty === 'easy' ? questions.slice(0, targetQuestionCount).length : 0, 
        medium: difficulty === 'medium' ? questions.slice(0, targetQuestionCount).length : 0, 
        hard: difficulty === 'hard' ? questions.slice(0, targetQuestionCount).length : 0 
      },
      actualDistribution: { 
        easy: difficulty === 'easy' ? questions.slice(0, targetQuestionCount).length : 0, 
        medium: difficulty === 'medium' ? questions.slice(0, targetQuestionCount).length : 0, 
        hard: difficulty === 'hard' ? questions.slice(0, targetQuestionCount).length : 0 
      }
    }
  }
}