// Transcript Analysis Utilities - Business Logic Layer
// Following SoC: Pure functions for transcript processing

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

export interface HighlightedSegment extends TranscriptSegment {
  isHighlighted: boolean
  isLoopSegment: boolean
  loopId?: string
}

export interface TranscriptAnalysis {
  wordCount: number
  estimatedReadingTime: number
  difficulty: 'easy' | 'medium' | 'hard'
  keyPhrases: string[]
  languageLevel: string
}

/**
 * Highlights transcript segments that match saved loops
 */
export function highlightLoopSegments(
  transcriptSegments: TranscriptSegment[],
  savedLoops: Array<{ startTime: number; endTime: number; id: string }>
): HighlightedSegment[] {
  return transcriptSegments.map(segment => {
    const matchingLoop = savedLoops.find(loop => {
      // Check if segment overlaps with loop (within 1 second tolerance)
      return (
        (segment.start >= loop.startTime - 1 && segment.start <= loop.endTime + 1) ||
        (segment.end >= loop.startTime - 1 && segment.end <= loop.endTime + 1) ||
        (segment.start <= loop.startTime && segment.end >= loop.endTime)
      )
    })

    return {
      ...segment,
      isHighlighted: Boolean(matchingLoop),
      isLoopSegment: Boolean(matchingLoop),
      loopId: matchingLoop?.id
    }
  })
}

/**
 * Analyzes transcript text for language learning insights
 */
export function analyzeTranscriptDifficulty(segments: TranscriptSegment[]): TranscriptAnalysis {
  const fullText = segments.map(s => s.text).join(' ')
  const words = fullText.split(/\s+/).filter(word => word.length > 0)
  
  // Simple difficulty assessment based on word length and common patterns
  const avgWordLength = words.reduce((acc, word) => acc + word.length, 0) / words.length
  const longWords = words.filter(word => word.length > 7).length
  const complexPunctuation = (fullText.match(/[;:()—]/g) || []).length
  
  let difficulty: 'easy' | 'medium' | 'hard'
  if (avgWordLength < 4.5 && longWords < words.length * 0.1) {
    difficulty = 'easy'
  } else if (avgWordLength < 6 && longWords < words.length * 0.2) {
    difficulty = 'medium'
  } else {
    difficulty = 'hard'
  }

  // Extract potential key phrases (2-3 word combinations that appear multiple times)
  const phrases = extractKeyPhrases(fullText)

  return {
    wordCount: words.length,
    estimatedReadingTime: Math.ceil(words.length / 200), // 200 WPM average
    difficulty,
    keyPhrases: phrases.slice(0, 5), // Top 5 phrases
    languageLevel: difficulty === 'easy' ? 'Beginner' : difficulty === 'medium' ? 'Intermediate' : 'Advanced'
  }
}

/**
 * Extracts key phrases from transcript text
 */
function extractKeyPhrases(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2)

  const phrases: { [key: string]: number } = {}
  
  // Look for 2-3 word combinations
  for (let i = 0; i < words.length - 1; i++) {
    const twoWord = `${words[i]} ${words[i + 1]}`
    phrases[twoWord] = (phrases[twoWord] || 0) + 1
    
    if (i < words.length - 2) {
      const threeWord = `${words[i]} ${words[i + 1]} ${words[i + 2]}`
      phrases[threeWord] = (phrases[threeWord] || 0) + 1
    }
  }

  // Return phrases that appear more than once, sorted by frequency
  return Object.entries(phrases)
    .filter(([_, count]) => count > 1)
    .sort(([, a], [, b]) => b - a)
    .map(([phrase]) => phrase)
}

/**
 * Formats transcript segments for display with timestamps
 */
export function formatTranscriptForDisplay(
  segments: HighlightedSegment[],
  formatTime: (seconds: number) => string
): Array<{
  id: string
  timestamp: string
  text: string
  isHighlighted: boolean
  loopId?: string
  startTime: number
  endTime: number
}> {
  return segments.map((segment, index) => ({
    id: `segment-${index}`,
    timestamp: formatTime(segment.start),
    text: segment.text,
    isHighlighted: segment.isHighlighted,
    loopId: segment.loopId,
    startTime: segment.start,
    endTime: segment.end
  }))
}

/**
 * Searches transcript segments for specific text
 */
export function searchTranscriptSegments(
  segments: TranscriptSegment[],
  searchQuery: string
): TranscriptSegment[] {
  if (!searchQuery.trim()) return segments

  const query = searchQuery.toLowerCase().trim()
  return segments.filter(segment => 
    segment.text.toLowerCase().includes(query)
  )
}

/**
 * Gets transcript segment containing specific time
 */
export function getSegmentAtTime(
  segments: TranscriptSegment[],
  time: number
): TranscriptSegment | null {
  return segments.find(segment => 
    time >= segment.start && time <= segment.end
  ) || null
}