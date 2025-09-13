/**
 * Question Utility Functions
 * Shared utilities for question processing
 */

/**
 * Shuffle array options with seeded randomization for consistent results
 */
export function shuffleOptionsWithSeed(options: string[], seed: string): { options: string[] } {
  // Create a simple hash from the seed for consistent randomization
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }

  // Create a copy of options to shuffle
  const shuffled = [...options]

  // Fisher-Yates shuffle with seeded random
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Generate deterministic "random" index based on hash and position
    hash = (hash * 9301 + 49297) % 233280
    const j = Math.abs(hash) % (i + 1)

    // Swap elements
    const temp = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = temp
  }

  return { options: shuffled }
}

/**
 * Format time in MM:SS format
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Process template variables
 */
export function processTemplateVariables(
  template: string, 
  variables: Record<string, string | number>
): string {
  let processedTemplate = template
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    processedTemplate = processedTemplate.replace(regex, String(value))
  })
  return processedTemplate
}

/**
 * Detect exercise type from prompt content
 */
export function detectExerciseType(prompt: string): 'multiple_choice' | 'fill_blank' {
  const promptLower = prompt.toLowerCase()
  
  const fillBlankIndicators = [
    'fill-in-the-blank',
    'fill in the blank', 
    'complete the transcript',
    'missing words',
    'blanks',
    'transcript with gaps',
    'exercises',
    'fill_blank'
  ]
  
  const isFillBlank = fillBlankIndicators.some(indicator => 
    promptLower.includes(indicator)
  )
  
  return isFillBlank ? 'fill_blank' : 'multiple_choice'
}