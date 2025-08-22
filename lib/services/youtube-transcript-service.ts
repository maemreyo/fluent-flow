
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
  private readonly DEFAULT_TIMEOUT = 15000

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
    payload: Record<string, any>
  ): Promise<T> {
    try {
      const response = await fetch(this.transcriptServerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
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
      throw this.handleTranscriptError(error, payload.videoId)
    }
  }

  async getTranscriptSegment(
    videoId: string,
    startTime: number,
    endTime: number,
    language?: string
  ): Promise<TranscriptResult> {
    const cleanVideoId = this.extractVideoId(videoId)
    try {
      const result = await this.fetchFromTranscriptServer<TranscriptResult>({
        action: 'getSegment',
        videoId: cleanVideoId,
        startTime,
        endTime,
        language
      })
      return result
    } catch (error) {
      console.error(`FluentFlow: Transcript extraction failed for ${cleanVideoId}:`, error)
      throw this.handleTranscriptError(error, cleanVideoId)
    }
  }

  async getAvailableLanguages(videoId: string): Promise<string[]> {
    const cleanVideoId = this.extractVideoId(videoId)
    try {
      const response = await this.fetchFromTranscriptServer<{ languages: string[] }>({
        action: 'getLanguages',
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
      const response = await this.fetchFromTranscriptServer<{ available: boolean }>({
        action: 'checkAvailability',
        videoId: cleanVideoId,
        language
      })
      return response.available || false
    } catch (error) {
      console.log(`FluentFlow: Transcript availability check failed for ${videoId}:`, error)
      return false
    }
  }

  getSuggestedVideosWithCaptions(): Array<{ id: string; title: string; description: string }> {
    return [
      { id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up', description: 'Popular music video with auto-generated captions' },
      { id: 'jNQXAC9IVRw', title: 'Me at the zoo', description: 'First YouTube video with captions' },
      { id: 'VQH8ZTgna3Q', title: 'Khan Academy Lesson', description: 'Educational content with captions' },
      { id: 'fJ9rUzIMcZQ', title: 'BBC News Video', description: 'News videos often have captions' }
    ]
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

  private handleTranscriptError(error: any, videoId: string): TranscriptError {
    if (error.code) {
      return error
    }
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
