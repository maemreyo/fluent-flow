export interface TranscriptSegment {
  text: string
  start: number
  duration: number
}

export interface TranscriptResult {
  segments: TranscriptSegment[]
  fullText: string
  videoId: string
  language?: string
}

export interface TranscriptError {
  code:
    | 'NOT_AVAILABLE'
    | 'VIDEO_NOT_FOUND'
    | 'PRIVATE_VIDEO'
    | 'REGION_BLOCKED'
    | 'NETWORK_ERROR'
    | 'PARSE_ERROR'
    | 'UNKNOWN'
  message: string
  details?: string
}

export class YouTubeTranscriptService {
  private readonly transcriptServerUrl: string
  private readonly DEFAULT_TIMEOUT = 15000 // Increased timeout for network requests

  constructor() {
    this.transcriptServerUrl = process.env.PLASMO_PUBLIC_TRANSCRIPT_SERVER_URL
    if (!this.transcriptServerUrl) {
      console.error(
        'FluentFlow: PLASMO_PUBLIC_TRANSCRIPT_SERVER_URL environment variable is not set.'
      )
      throw new Error('Transcript server URL is not configured.')
    }
  }

  private async fetchFromTranscriptServer<T>(
    endpoint: string,
    params: Record<string, string>
  ): Promise<T> {
    const url = new URL(`${this.transcriptServerUrl}/${endpoint}`)
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.append(key, value)
      }
    })

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(this.DEFAULT_TIMEOUT)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw this.createError(
          'NETWORK_ERROR',
          `Failed to fetch from transcript server: ${response.statusText}`,
          JSON.stringify(errorData)
        )
      }

      return await response.json()
    } catch (error) {
      console.error(`FluentFlow: Error fetching from transcript server:`, error)
      if (error.name === 'TimeoutError') {
        throw this.createError('NETWORK_ERROR', 'Request to transcript server timed out.')
      }
      throw this.handleTranscriptError(error, params.videoId)
    }
  }

  async getTranscriptSegment(
    videoId: string,
    startTime: number,
    endTime: number,
    language?: string
  ): Promise<TranscriptResult> {
    if (!videoId || videoId.trim().length === 0) {
      throw this.createError('VIDEO_NOT_FOUND', 'Video ID is required')
    }

    if (startTime < 0 || endTime <= startTime) {
      throw this.createError(
        'PARSE_ERROR',
        'Invalid time range: startTime must be >= 0 and endTime must be > startTime'
      )
    }

    const cleanVideoId = this.extractVideoId(videoId)

    try {
      console.log(`FluentFlow: Fetching transcript for ${cleanVideoId} from external server.`)

      const fullTranscript = await this.fetchFullTranscript(cleanVideoId, language)
      const segmentTranscript = this.extractTimeSegment(fullTranscript, startTime, endTime)

      if (segmentTranscript.segments.length === 0) {
        throw this.createError(
          'NOT_AVAILABLE',
          `No transcript content found for time range ${startTime}s - ${endTime}s`
        )
      }

      console.log(
        `FluentFlow: ✅ Successfully extracted ${segmentTranscript.segments.length} transcript segments`
      )

      return {
        ...segmentTranscript,
        videoId: cleanVideoId,
        language: language || 'auto'
      }
    } catch (error) {
      console.error(`FluentFlow: Transcript extraction failed for ${cleanVideoId}:`, error)
      throw this.handleTranscriptError(error, cleanVideoId)
    }
  }

  async getAvailableLanguages(videoId: string): Promise<string[]> {
    const cleanVideoId = this.extractVideoId(videoId)
    try {
      const response = await this.fetchFromTranscriptServer<{ languages: string[] }>('languages', {
        videoId: cleanVideoId
      })
      return response.languages || []
    } catch (error) {
      console.log(`FluentFlow: Failed to get available languages for ${cleanVideoId}:`, error)
      return []
    }
  }

  async isTranscriptAvailable(videoId: string, language?: string): Promise<boolean> {
    const cleanVideoId = this.extractVideoId(videoId)
    try {
      const response = await this.fetchFromTranscriptServer<{ available: boolean }>(
        'availability',
        { videoId: cleanVideoId, language }
      )
      return response.available || false
    } catch (error) {
      console.log(`FluentFlow: Transcript availability check failed for ${videoId}:`, error)
      return false
    }
  }

  private async fetchFullTranscript(videoId: string, language?: string): Promise<any[]> {
    try {
      const result = await this.fetchFromTranscriptServer<TranscriptResult>('transcript', {
        videoId,
        language
      })
      // The external service is expected to return segments in the correct format.
      // We just do a bit of cleaning and validation.
      return (result.segments || [])
        .map(segment => ({
          ...segment,
          text: this.cleanTranscriptText(segment.text || ''),
          offset: this.parseFloat(segment.start),
          duration: this.parseFloat(segment.duration)
        }))
        .filter(segment => segment.text.trim().length > 0)
    } catch (error) {
      throw this.handleTranscriptError(error, videoId)
    }
  }

  getSuggestedVideosWithCaptions(): Array<{ id: string; title: string; description: string }> {
    return [
      {
        id: 'dQw4w9WgXcQ',
        title: 'Rick Astley - Never Gonna Give You Up',
        description: 'Popular music video with auto-generated captions'
      },
      {
        id: 'jNQXAC9IVRw',
        title: 'Me at the zoo',
        description: 'First YouTube video with captions'
      },
      {
        id: 'VQH8ZTgna3Q',
        title: 'Khan Academy Lesson',
        description: 'Educational content with captions'
      },
      { id: 'fJ9rUzIMcZQ', title: 'BBC News Video', description: 'News videos often have captions' }
    ]
  }

  async enhancedAvailabilityCheck(videoId: string): Promise<{
    available: boolean
    languages: string[]
    suggestions?: string[]
    error?: string
  }> {
    const cleanVideoId = this.extractVideoId(videoId)
    try {
      return await this.fetchFromTranscriptServer('availability-enhanced', {
        videoId: cleanVideoId
      })
    } catch (error) {
      console.log(`FluentFlow: Enhanced availability check failed:`, error)
      return {
        available: false,
        languages: [],
        suggestions: [
          'Could not connect to the transcript service.',
          'Please check your internet connection and try again.'
        ],
        error: error.message
      }
    }
  }

  private extractVideoId(input: string): string {
    if (!input || typeof input !== 'string') {
      throw this.createError('VIDEO_NOT_FOUND', 'Invalid video identifier')
    }
    const trimmed = input.trim()
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed
    }
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ]
    for (const pattern of patterns) {
      const match = trimmed.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }
    throw this.createError('VIDEO_NOT_FOUND', `Could not extract video ID from: ${input}`)
  }

  private extractTimeSegment(
    fullTranscript: any[],
    startTime: number,
    endTime: number
  ): { segments: TranscriptSegment[]; fullText: string } {
    const segments: TranscriptSegment[] = fullTranscript.filter(item => {
      const segmentStart = this.parseFloat(item.start) || 0
      const segmentEnd = segmentStart + (this.parseFloat(item.duration) || 0)
      return segmentEnd > startTime && segmentStart < endTime
    })

    segments.sort((a, b) => a.start - b.start)
    const fullText = segments
      .map(s => s.text)
      .join(' ')
      .trim()
    return { segments, fullText }
  }

  private cleanTranscriptText(text: string): string {
    return text
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
  }

  private parseFloat(value: any): number {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }

  private handleTranscriptError(error: any, videoId: string): TranscriptError {
    if (error.code) {
      return error
    }
    // Generic error for server communication
    return this.createError(
      'NETWORK_ERROR',
      `An error occurred while communicating with the transcript service for video ${videoId}.`,
      error.message
    )
  }

  private createError(
    code: TranscriptError['code'],
    message: string,
    details?: string
  ): TranscriptError {
    const error = new Error(message) as Error & TranscriptError
    error.code = code
    error.message = message
    if (details) {
      error.details = details
    }
    return error
  }
}

export const youtubeTranscriptService = new YouTubeTranscriptService()
