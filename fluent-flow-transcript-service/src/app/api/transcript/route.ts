import { NextRequest, NextResponse } from 'next/server'
import { Innertube } from 'youtubei.js'

interface TranscriptSegment {
  text: string
  start: number
  duration: number
}

interface TranscriptResult {
  segments: TranscriptSegment[]
  fullText: string
  videoId: string
  language?: string
}

interface TranscriptError {
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

interface CaptionTrack {
  language_code: string
}

interface YouTubeSegment {
  snippet: {
    text: string
  }
  start_ms: number
  end_ms: number
}

type TranscriptSectionHeader = object

class YouTubeTranscriptService {
  private innertube: Innertube | null = null

  private async getInnertube(): Promise<Innertube> {
    if (!this.innertube) {
      try {
        console.log('Initializing YouTube.js Innertube client')
        this.innertube = await Innertube.create({})
        console.log('✅ Innertube client initialized successfully')
      } catch (error) {
        console.error('Failed to initialize Innertube client:', error)
        throw this.createError('NETWORK_ERROR', `Failed to initialize YouTube client: ${error}`)
      }
    }
    return this.innertube
  }

  async getTranscriptSegment(
    videoId: string,
    startTime: number,
    endTime: number,
    language?: 'en'
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
      console.log(`Extracting transcript for ${cleanVideoId} (${startTime}s-${endTime}s)`)

      const fullTranscript = await this.fetchFullTranscript(cleanVideoId, language)
      const segmentTranscript = this.extractTimeSegment(fullTranscript, startTime, endTime)

      if (segmentTranscript.segments.length === 0) {
        throw this.createError(
          'NOT_AVAILABLE',
          `No transcript content found for time range ${startTime}s - ${endTime}s`
        )
      }

      console.log(
        `✅ Successfully extracted ${segmentTranscript.segments.length} transcript segments`
      )

      return {
        ...segmentTranscript,
        videoId: cleanVideoId,
        language: language || 'auto'
      }
    } catch (error) {
      console.error(`Transcript extraction failed for ${cleanVideoId}:`, error)
      throw this.handleTranscriptError(error as Error, cleanVideoId)
    }
  }

  async getAvailableLanguages(videoId: string): Promise<string[]> {
    console.log(`[getAvailableLanguages] Getting languages for videoId: ${videoId}`)
    const cleanVideoId = this.extractVideoId(videoId)
    console.log(`[getAvailableLanguages] Clean videoId: ${cleanVideoId}`)

    try {
      const yt = await this.getInnertube()
      console.log(`[getAvailableLanguages] Innertube instance obtained.`)
      const info = await yt.getInfo(cleanVideoId)
      console.log(`[getAvailableLanguages] Video info obtained.`)
      console.log(`[getAvailableLanguages] Full video info object:`, JSON.stringify(info, null, 2))

      if (!info.captions) {
        console.log(
          `[getAvailableLanguages] No captions property in video info. Returning empty array.`
        )
        return []
      }

      const captionTracks = info.captions?.caption_tracks || []
      const availableLanguages = captionTracks.map((track: CaptionTrack) => track.language_code)

      console.log(
        `[getAvailableLanguages] Available languages for ${cleanVideoId}:`,
        availableLanguages
      )
      return availableLanguages.filter((lang: string) => lang)
    } catch (error) {
      console.error(`[getAvailableLanguages] Failed for ${cleanVideoId}:`, error)
      return []
    }
  }

  async isTranscriptAvailable(videoId: string, language?: string): Promise<boolean> {
    console.log(`[isTranscriptAvailable] Checking for videoId: ${videoId}, language: ${language}`)
    try {
      const cleanVideoId = this.extractVideoId(videoId)
      console.log(`[isTranscriptAvailable] Clean videoId: ${cleanVideoId}`)

      const yt = await this.getInnertube()
      console.log(`[isTranscriptAvailable] Innertube instance obtained.`)

      const info = await yt.getInfo(cleanVideoId)
      console.log(`[isTranscriptAvailable] Video info obtained.`)
      console.log(`[isTranscriptAvailable] Full video info object:`, JSON.stringify(info, null, 2))

      if (!info.captions) {
        console.log(`[isTranscriptAvailable] No captions property in video info. Returning false.`)
        return false
      }
      console.log(`[isTranscriptAvailable] Captions property exists.`)

      const transcript = await info.getTranscript()
      console.log(`[isTranscriptAvailable] Transcript object obtained.`)

      if (!transcript || !transcript.transcript || !transcript.transcript.content) {
        console.log(`[isTranscriptAvailable] Transcript content is missing. Returning false.`)
        return false
      }

      const captionTracks = info.captions?.caption_tracks || []
      console.log(
        `[isTranscriptAvailable] Available caption tracks:`,
        captionTracks.map(t => t.language_code)
      )

      if (language) {
        const hasLanguage = captionTracks.some(
          (track: CaptionTrack) => track.language_code === language
        )
        console.log(`[isTranscriptAvailable] Language '${language}' availability: ${hasLanguage}`)
        return hasLanguage
      }

      console.log(
        `[isTranscriptAvailable] No specific language requested, returning true as transcripts are available.`
      )
      return true
    } catch (error) {
      console.error(`[isTranscriptAvailable] Error for videoId ${videoId}:`, error)
      return false
    }
  }

  private async fetchFullTranscript(
    videoId: string,
    language?: string
  ): Promise<TranscriptSegment[]> {
    try {
      const yt = await this.getInnertube()
      console.log(`Getting video info for ${videoId}`, yt)

      const info = await yt.getInfo(videoId)

      if (!info.captions) {
        throw this.createError('NOT_AVAILABLE', 'Video has no captions available')
      }

      console.log(`Getting transcript for ${videoId}`)
      let transcriptInfo = await info.getTranscript()

      if (language) {
        try {
          console.log(`Attempting to select language: ${language}`)
          transcriptInfo = await transcriptInfo.selectLanguage(language)
          console.log(`✅ Selected language: ${transcriptInfo.selectedLanguage}`)
        } catch (langError) {
          console.log(`Language '${language}' not available, using default:`, langError)
        }
      }

      const segments = transcriptInfo.transcript.content?.body?.initial_segments

      if (!segments || !Array.isArray(segments) || segments.length === 0) {
        throw this.createError('NOT_AVAILABLE', 'No transcript segments found')
      }

      console.log(`✅ Found ${segments.length} transcript segments`)
      console.log(`Language: ${transcriptInfo.selectedLanguage}`)

      return segments
        .map((segment: YouTubeSegment | TranscriptSectionHeader) => {
          if ('snippet' in segment) {
            return {
              text: this.cleanTranscriptText((segment as YouTubeSegment).snippet.text || ''),
              start: (segment as YouTubeSegment).start_ms
                ? (segment as YouTubeSegment).start_ms / 1000
                : 0,
              duration:
                (segment as YouTubeSegment).end_ms && (segment as YouTubeSegment).start_ms
                  ? ((segment as YouTubeSegment).end_ms - (segment as YouTubeSegment).start_ms) /
                    1000
                  : 0
            }
          }
          return null
        })
        .filter(
          (segment): segment is TranscriptSegment =>
            segment !== null && segment.text.trim().length > 0
        )
    } catch (error) {
      if ((error as TranscriptError).code) {
        throw error
      }
      throw this.handleYouTubeJSError(error as Error, videoId)
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
    fullTranscript: TranscriptSegment[],
    startTime: number,
    endTime: number
  ): { segments: TranscriptSegment[]; fullText: string } {
    const segments: TranscriptSegment[] = []

    for (const item of fullTranscript) {
      if (!item || typeof item !== 'object') continue

      const segmentStart = this.parseFloat(item.start) || 0
      const segmentDuration = this.parseFloat(item.duration) || 0
      const segmentEnd = segmentStart + segmentDuration
      const text = (item.text || '').trim()

      if (!text) continue

      if (segmentEnd > startTime && segmentStart < endTime) {
        segments.push({
          text: this.cleanTranscriptText(text),
          start: segmentStart,
          duration: segmentDuration
        })
      }
    }

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

  private parseFloat(value: string | number): number {
    const parsed = parseFloat(value as string)
    return isNaN(parsed) ? 0 : parsed
  }

  private handleYouTubeJSError(error: Error, videoId: string): TranscriptError {
    const message = error.message?.toLowerCase() || error.toString().toLowerCase()

    if (message.includes('video unavailable') || message.includes('not found')) {
      return this.createError('VIDEO_NOT_FOUND', `Video ${videoId} not found or unavailable`)
    }

    if (message.includes('private') || message.includes('members-only')) {
      return this.createError('PRIVATE_VIDEO', `Video ${videoId} is private or members-only`)
    }

    if (message.includes('blocked') || message.includes('region')) {
      return this.createError('REGION_BLOCKED', `Video ${videoId} is blocked in this region`)
    }

    if (
      message.includes('captions') ||
      message.includes('transcript') ||
      message.includes('subtitles')
    ) {
      return this.createError(
        'NOT_AVAILABLE',
        `No captions/transcript available for video ${videoId}`
      )
    }

    if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
      return this.createError(
        'NETWORK_ERROR',
        `Network error while fetching transcript: ${error.message}`
      )
    }

    return this.createError('UNKNOWN', `YouTube.js error: ${error.message}`, error.stack)
  }

  private handleTranscriptError(error: Error | TranscriptError, videoId: string): TranscriptError {
    if (!error) {
      return this.createError('UNKNOWN', 'Unknown error occurred')
    }

    if ('code' in error && error.code) {
      return error
    }

    return this.handleYouTubeJSError(error as Error, videoId)
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

const transcriptService = new YouTubeTranscriptService()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('body', body)
    const { videoId, startTime, endTime, language, action } = body

    console.log('Transcript API request:', { videoId, startTime, endTime, language, action })

    switch (action) {
      case 'getSegment':
        if (!videoId || startTime === undefined || endTime === undefined) {
          return NextResponse.json(
            { error: 'Missing required parameters: videoId, startTime, endTime' },
            { status: 400 }
          )
        }
        const result = await transcriptService.getTranscriptSegment(
          videoId,
          startTime,
          endTime,
          language
        )
        return NextResponse.json(result)

      case 'getLanguages':
        if (!videoId) {
          return NextResponse.json(
            { error: 'Missing required parameter: videoId' },
            { status: 400 }
          )
        }
        const languages = await transcriptService.getAvailableLanguages(videoId)
        return NextResponse.json({ languages })

      case 'checkAvailability':
        if (!videoId) {
          return NextResponse.json(
            { error: 'Missing required parameter: videoId' },
            { status: 400 }
          )
        }
        const available = await transcriptService.isTranscriptAvailable(videoId, language)
        return NextResponse.json({ available })

      default:
        return NextResponse.json(
          {
            error: 'Invalid action. Supported actions: getSegment, getLanguages, checkAvailability'
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Transcript API error:', error)

    if (error && typeof error === 'object' && 'code' in error) {
      const transcriptError = error as TranscriptError
      return NextResponse.json(
        {
          error: transcriptError.message,
          code: transcriptError.code,
          details: transcriptError.details
        },
        { status: transcriptError.code === 'VIDEO_NOT_FOUND' ? 404 : 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}
