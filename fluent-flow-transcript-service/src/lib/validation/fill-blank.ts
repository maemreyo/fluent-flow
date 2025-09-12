import { FillBlankQuestion, FillBlankAnswer, FillBlankValidationResult } from '../types/questions'

/**
 * Fill-in-the-Blank Answer Validation
 */

export function validateFillBlankAnswer(
  question: FillBlankQuestion, 
  answer: FillBlankAnswer
): FillBlankValidationResult {
  const blankResults = question.blanks.map(blank => {
    const userAnswer = answer.answers[blank.position]?.trim() || ''
    const correctAnswer = blank.answer.trim()
    
    // Check if user answer matches correct answer
    let isCorrect = false
    let acceptedAlternative: string | undefined
    
    if (blank.caseSensitive === false || blank.caseSensitive === undefined) {
      // Case insensitive comparison (default)
      isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase()
      
      // Check alternatives
      if (!isCorrect && blank.alternatives) {
        for (const alt of blank.alternatives) {
          if (userAnswer.toLowerCase() === alt.toLowerCase()) {
            isCorrect = true
            acceptedAlternative = alt
            break
          }
        }
      }
    } else {
      // Case sensitive comparison
      isCorrect = userAnswer === correctAnswer
      
      // Check alternatives
      if (!isCorrect && blank.alternatives) {
        for (const alt of blank.alternatives) {
          if (userAnswer === alt) {
            isCorrect = true
            acceptedAlternative = alt
            break
          }
        }
      }
    }
    
    return {
      position: blank.position,
      userAnswer,
      correctAnswer,
      isCorrect,
      acceptedAlternative
    }
  })
  
  // Calculate overall score
  const correctCount = blankResults.filter(result => result.isCorrect).length
  const totalBlanks = question.blanks.length
  const score = totalBlanks > 0 ? Math.round((correctCount / totalBlanks) * 100) : 0
  const isCorrect = correctCount === totalBlanks
  
  // Generate feedback
  let feedback = ''
  if (isCorrect) {
    feedback = `Perfect! You got all ${totalBlanks} blanks correct.`
  } else {
    const incorrectCount = totalBlanks - correctCount
    feedback = `You got ${correctCount}/${totalBlanks} blanks correct. ${incorrectCount} ${incorrectCount === 1 ? 'answer needs' : 'answers need'} improvement.`
  }
  
  return {
    isCorrect,
    score,
    feedback,
    blankResults,
    detailedFeedback: {
      correctBlanks: correctCount,
      totalBlanks,
      incorrectBlanks: blankResults.filter(r => !r.isCorrect).map(r => ({
        position: r.position,
        expected: r.correctAnswer,
        provided: r.userAnswer
      }))
    }
  }
}

/**
 * Generate Fill-in-the-Blank question from transcript
 * This is a simple implementation - can be enhanced with NLP
 */
export function generateFillBlankFromTranscript(
  transcript: string,
  targetWords: string[],
  options: {
    maxBlanks?: number
    blankType?: 'single-word' | 'phrase' | 'grammar' | 'specific-info'
    alternatives?: { [word: string]: string[] }
  } = {}
): Pick<FillBlankQuestion, 'transcript' | 'blanks'> {
  const maxBlanks = options.maxBlanks || 3
  let modifiedTranscript = transcript
  const blanks: FillBlankQuestion['blanks'] = []
  
  // Sort target words by length (longest first) to avoid substring conflicts
  const sortedTargets = [...targetWords].sort((a, b) => b.length - a.length)
  
  let processedCount = 0
  for (const word of sortedTargets) {
    if (processedCount >= maxBlanks) break
    
    const wordRegex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi')
    const match = wordRegex.exec(modifiedTranscript)
    
    if (match) {
      const position = match.index
      const length = word.length
      
      // Create blank placeholder
      const blankPlaceholder = '_'.repeat(Math.min(length, 15)) // Max 15 underscores for UI
      
      blanks.push({
        position,
        length,
        answer: word,
        alternatives: options.alternatives?.[word.toLowerCase()],
        caseSensitive: false
      })
      
      // Replace word with blank in transcript
      modifiedTranscript = modifiedTranscript.substring(0, position) + 
                          blankPlaceholder + 
                          modifiedTranscript.substring(position + length)
      
      processedCount++
    }
  }
  
  return {
    transcript: modifiedTranscript,
    blanks: blanks.sort((a, b) => a.position - b.position) // Sort by position
  }
}

// Utility function to escape regex special characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Extract potential fill-blank targets from transcript
 * Simple implementation - can be enhanced with NLP/AI
 */
export function extractFillBlankTargets(
  transcript: string,
  type: 'single-word' | 'phrase' | 'grammar' | 'specific-info' = 'single-word'
): string[] {
  const words = transcript.split(/\s+/)
  
  switch (type) {
    case 'single-word':
      // Extract content words (nouns, verbs, adjectives, adverbs)
      return words.filter(word => {
        // Simple heuristic: words longer than 3 chars, not common function words
        const cleaned = word.replace(/[.,!?;:]/, '').toLowerCase()
        const functionWords = ['the', 'and', 'but', 'for', 'are', 'was', 'will', 'can', 'have', 'had', 'this', 'that', 'with', 'from', 'they', 'them', 'your', 'you', 'not']
        return cleaned.length > 3 && !functionWords.includes(cleaned)
      }).slice(0, 10) // Limit to 10 potential targets
      
    case 'grammar':
      // Extract function words, articles, prepositions
      return words.filter(word => {
        const cleaned = word.replace(/[.,!?;:]/, '').toLowerCase()
        const grammarWords = ['the', 'a', 'an', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'to', 'of', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'will', 'would', 'can', 'could', 'should']
        return grammarWords.includes(cleaned)
      }).slice(0, 8)
      
    case 'specific-info':
      // Extract numbers, dates, names (capitalized words)
      return words.filter(word => {
        const cleaned = word.replace(/[.,!?;:]/, '')
        return /^[A-Z]/.test(cleaned) || /\d/.test(cleaned)
      }).slice(0, 5)
      
    case 'phrase':
      // Extract 2-3 word phrases - basic implementation
      const phrases: string[] = []
      for (let i = 0; i < words.length - 1; i++) {
        if (phrases.length >= 5) break
        const twoWordPhrase = `${words[i]} ${words[i + 1]}`
        if (twoWordPhrase.length > 8 && twoWordPhrase.length < 25) {
          phrases.push(twoWordPhrase)
        }
      }
      return phrases
      
    default:
      return []
  }
}