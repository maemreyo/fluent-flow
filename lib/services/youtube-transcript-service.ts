import { YoutubeTranscript } from 'youtube-transcript'

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
  code: 'NOT_AVAILABLE' | 'VIDEO_NOT_FOUND' | 'PRIVATE_VIDEO' | 'REGION_BLOCKED' | 'NETWORK_ERROR' | 'PARSE_ERROR' | 'UNKNOWN'
  message: string
  details?: string
}

export class YouTubeTranscriptService {
  private readonly DEFAULT_TIMEOUT = 10000
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAY = 1000

  /**
   * Extract transcript for a specific time segment of a YouTube video
   */
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
      throw this.createError('PARSE_ERROR', 'Invalid time range: startTime must be >= 0 and endTime must be > startTime')
    }

    const cleanVideoId = this.extractVideoId(videoId)
    
    try {
      const fullTranscript = await this.fetchTranscriptWithRetry(cleanVideoId, language)
      const segmentTranscript = this.extractTimeSegment(fullTranscript, startTime, endTime)
      
      if (segmentTranscript.segments.length === 0) {
        throw this.createError('NOT_AVAILABLE', `No transcript found for time range ${startTime}s - ${endTime}s`)
      }

      return {
        ...segmentTranscript,
        videoId: cleanVideoId,
        language
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.handleTranscriptError(error, cleanVideoId)
    }
  }

  /**
   * Get available languages for a video's transcript
   */
  async getAvailableLanguages(videoId: string): Promise<string[]> {
    const cleanVideoId = this.extractVideoId(videoId)
    
    try {
      const transcript = await this.fetchTranscriptWithRetry(cleanVideoId)
      return transcript.length > 0 ? ['en'] : []
    } catch (error) {
      if (this.isTranscriptNotAvailable(error)) {
        return []
      }
      throw this.handleTranscriptError(error, cleanVideoId)
    }
  }

  /**
   * Check if transcript is available for a video
   */
  async isTranscriptAvailable(videoId: string, language?: string): Promise<boolean> {
    try {
      const cleanVideoId = this.extractVideoId(videoId)
      await this.fetchTranscriptWithRetry(cleanVideoId, language)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Extract video ID from various YouTube URL formats
   */
  private extractVideoId(input: string): string {
    if (!input || typeof input !== 'string') {
      throw this.createError('VIDEO_NOT_FOUND', 'Invalid video identifier')
    }

    const trimmed = input.trim()
    
    // If it's already a video ID (11 characters, alphanumeric + - _)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed
    }

    // Extract from various YouTube URL formats
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

  /**
   * Fetch transcript with retry logic
   */
  private async fetchTranscriptWithRetry(
    videoId: string,
    language?: string,
    retryCount = 0
  ): Promise<any[]> {
    try {
      const options: any = {}
      if (language) {
        options.lang = language
      }

      const transcript = await Promise.race([
        YoutubeTranscript.fetchTranscript(videoId, options),
        this.createTimeoutPromise(this.DEFAULT_TIMEOUT)
      ])

      if (!transcript || !Array.isArray(transcript)) {
        throw this.createError('NOT_AVAILABLE', 'Invalid transcript format received')
      }

      return transcript
    } catch (error) {
      if (retryCount < this.MAX_RETRIES && this.isRetryableError(error)) {
        await this.delay(this.RETRY_DELAY * (retryCount + 1))
        return this.fetchTranscriptWithRetry(videoId, language, retryCount + 1)
      }
      throw error
    }
  }

  /**
   * Extract transcript segments within specified time range
   */
  private extractTimeSegment(
    fullTranscript: any[],
    startTime: number,
    endTime: number
  ): { segments: TranscriptSegment[]; fullText: string } {
    const segments: TranscriptSegment[] = []
    
    for (const item of fullTranscript) {
      if (!item || typeof item !== 'object') continue
      
      const segmentStart = this.parseFloat(item.offset) || 0
      const segmentDuration = this.parseFloat(item.duration) || 0
      const segmentEnd = segmentStart + segmentDuration
      const text = (item.text || '').trim()
      
      if (!text) continue
      
      // Include segments that overlap with our time range
      if (segmentEnd > startTime && segmentStart < endTime) {
        segments.push({
          text: this.cleanTranscriptText(text),
          start: segmentStart,
          duration: segmentDuration
        })
      }
    }

    // Sort by start time
    segments.sort((a, b) => a.start - b.start)
    
    const fullText = segments.map(s => s.text).join(' ').trim()
    
    return { segments, fullText }
  }

  /**
   * Clean and normalize transcript text
   */
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

  /**
   * Parse float with fallback
   */
  private parseFloat(value: any): number {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(this.createError('NETWORK_ERROR', `Request timeout after ${ms}ms`))
      }, ms)
    })
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false
    
    const message = error.message?.toLowerCase() || ''
    const isNetworkError = message.includes('network') || 
                          message.includes('timeout') || 
                          message.includes('connection') ||
                          message.includes('fetch')
    
    return isNetworkError && !this.isTranscriptNotAvailable(error)
  }

  /**
   * Check if transcript is not available (non-retryable)
   */
  private isTranscriptNotAvailable(error: any): boolean {
    if (!error) return false
    
    const message = error.message?.toLowerCase() || ''
    return message.includes('transcript') && message.includes('disabled') ||
           message.includes('no transcript') ||
           message.includes('transcript not available') ||
           message.includes('captions are disabled')
  }

  /**
   * Handle and categorize transcript errors
   */
  private handleTranscriptError(error: any, videoId: string): TranscriptError {
    if (!error) {
      return this.createError('UNKNOWN', 'Unknown error occurred')
    }

    const message = error.message?.toLowerCase() || ''
    
    if (message.includes('video unavailable') || message.includes('video not found')) {
      return this.createError('VIDEO_NOT_FOUND', `Video ${videoId} not found or unavailable`)
    }
    
    if (message.includes('private') || message.includes('members-only')) {
      return this.createError('PRIVATE_VIDEO', `Video ${videoId} is private or members-only`)
    }
    
    if (message.includes('region') || message.includes('country')) {
      return this.createError('REGION_BLOCKED', `Video ${videoId} is blocked in this region`)
    }
    
    if (this.isTranscriptNotAvailable(error)) {
      return this.createError('NOT_AVAILABLE', `Transcript not available for video ${videoId}`)
    }
    
    if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
      return this.createError('NETWORK_ERROR', `Network error while fetching transcript: ${error.message}`)
    }
    
    if (message.includes('parse') || message.includes('invalid')) {
      return this.createError('PARSE_ERROR', `Failed to parse transcript data: ${error.message}`)
    }
    
    return this.createError('UNKNOWN', `Unexpected error: ${error.message}`, error.stack)
  }

  /**
   * Create standardized error object
   */
  private createError(code: TranscriptError['code'], message: string, details?: string): TranscriptError {
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