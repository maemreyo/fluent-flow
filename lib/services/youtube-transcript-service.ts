import type { FluentFlowError } from '../types/fluent-flow-types'
import { YouTubeDataExtractor } from './youtube-data-extractor'
import {
  YouTubeExtractionMonitor,
  type ExtractionHealthReport,
  type ExtractionMetrics
} from './youtube-extraction-monitor'

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
  private readonly transcriptServerUrl = 'https://fluent-flow.vercel.app/api/transcript'
  private static readonly DEFAULT_TIMEOUT = 10000
  private dataExtractor: YouTubeDataExtractor
  private monitor: YouTubeExtractionMonitor

  constructor() {
    this.dataExtractor = new YouTubeDataExtractor()
    this.monitor = new YouTubeExtractionMonitor()

    this.monitor.startContinuousMonitoring(15)
  }

  public async fetchFromTranscriptServer(
    videoId: string,
    language = 'en'
  ): Promise<TranscriptResult> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), YouTubeTranscriptService.DEFAULT_TIMEOUT)

    try {
      console.log('Fetching transcript for video:', videoId, 'language:', language)

      const response = await fetch(
        `${this.transcriptServerUrl}?videoId=${videoId}&lang=${language}`,
        {
          signal: controller.signal,
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Cache-Control': 'max-age=300'
          }
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          throw this.createError(
            'TRANSCRIPT_NOT_FOUND',
            `No transcript available for video ${videoId}`
          )
        }
        throw this.createError(
          'TRANSCRIPT_FETCH_ERROR',
          `Server error: ${response.status} ${response.statusText}`
        )
      }

      const segments = await response.json()

      if (!Array.isArray(segments)) {
        throw this.createError('TRANSCRIPT_PARSE_ERROR', 'Invalid transcript data format')
      }

      const fullText = segments.map(segment => segment.text).join(' ')

      return {
        segments: segments as TranscriptSegment[],
        fullText,
        videoId,
        language
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createError('TRANSCRIPT_TIMEOUT', 'Transcript fetch timeout')
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  public async fetchFromInnerTubeAPI(videoId: string, language = 'en'): Promise<TranscriptResult> {
    try {
      console.log('Fetching transcript via InnerTube API for video:', videoId, 'language:', language)
      
      // Method 1: Use content script (most reliable - same origin)
      try {
        const { getInnerTubeDataFromContentScript } = await import('../utils/content-script-api')
        
        const response = await getInnerTubeDataFromContentScript(videoId, language)

        if (response.success && response.data?.captions) {
          console.log('✅ Got captions via content script (same-origin)')
          
          // Find the right caption track
          let captionTrack = response.data.captions.find((track: any) => 
            track.languageCode === language || track.languageCode?.startsWith(language)
          )
          
          if (!captionTrack) {
            captionTrack = response.data.captions[0]
            console.warn(`Language '${language}' not found, using '${captionTrack.languageCode}' instead`)
          }

          if (!captionTrack?.baseUrl) {
            throw new Error('Caption track URL not found')
          }

          // Fetch transcript data
          const transcriptResponse = await fetch(captionTrack.baseUrl)
          if (!transcriptResponse.ok) {
            throw new Error(`Failed to fetch transcript: ${transcriptResponse.status}`)
          }

          const transcriptXml = await transcriptResponse.text()
          const segments = this.parseTranscriptXml(transcriptXml)
          const fullText = segments.map(segment => segment.text).join(' ')

          console.log(`✅ Transcript parsed via content script: ${segments.length} segments, ${fullText.length} characters`)

          return {
            segments,
            fullText,
            videoId,
            language: captionTrack.languageCode || language
          }
        } else {
          throw new Error(response.error || 'Content script call failed')
        }
      } catch (contentScriptError) {
        console.warn('Content script method failed:', contentScriptError)
        
        // Method 2: Fallback to background script with executeScript
        try {
          const { sendToBackground } = await import("@plasmohq/messaging")
          
          const response = await sendToBackground({
            name: "extract-youtube-data", 
            body: { videoId, requestType: 'innertube_transcript', language }
          })

          if (response?.success && response.data?.captions) {
            console.log('✅ Got captions via background script with browser context')
            
            // Find the right caption track
            let captionTrack = response.data.captions.find((track: any) => 
              track.languageCode === language || track.languageCode?.startsWith(language)
            )
            
            if (!captionTrack) {
              captionTrack = response.data.captions[0]
              console.warn(`Language '${language}' not found, using '${captionTrack.languageCode}' instead`)
            }

            if (!captionTrack?.baseUrl) {
              throw new Error('Caption track URL not found')
            }

            // Fetch transcript data
            const transcriptResponse = await fetch(captionTrack.baseUrl)
            if (!transcriptResponse.ok) {
              throw new Error(`Failed to fetch transcript: ${transcriptResponse.status}`)
            }

            const transcriptXml = await transcriptResponse.text()
            const segments = this.parseTranscriptXml(transcriptXml)
            const fullText = segments.map(segment => segment.text).join(' ')

            console.log(`✅ Transcript parsed via background: ${segments.length} segments, ${fullText.length} characters`)

            return {
              segments,
              fullText,
              videoId,
              language: captionTrack.languageCode || language
            }
          } else {
            throw new Error(response?.error || 'Background script call failed')
          }
        } catch (backgroundError) {
          console.warn('Background script extraction failed:', backgroundError)
          throw new Error(`Both content script and background methods failed: ${backgroundError}`)
        }
      }
    } catch (error) {
      console.error('All InnerTube API transcript extraction methods failed:', error)
      throw this.handleTranscriptError(error, videoId)
    }
  }

  private parseTranscriptXml(xmlContent: string): TranscriptSegment[] {
    const segments: TranscriptSegment[] = []

    try {
      // Parse XML using regex (lightweight alternative to XML parser)
      const textMatches = xmlContent.matchAll(
        /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g
      )

      for (const match of textMatches) {
        const start = parseFloat(match[1]) || 0
        const duration = parseFloat(match[2]) || 0
        const text =
          match[3]
            ?.replace(/&amp;/g, '&')
            ?.replace(/&lt;/g, '<')
            ?.replace(/&gt;/g, '>')
            ?.replace(/&quot;/g, '"')
            ?.replace(/&#39;/g, "'")
            ?.trim() || ''

        if (text) {
          segments.push({
            start,
            duration,
            text
          })
        }
      }

      return segments
    } catch (error) {
      console.error('Failed to parse transcript XML:', error)
      throw this.createError('TRANSCRIPT_PARSE_ERROR', 'Failed to parse transcript XML content')
    }
  }

  public async getTranscriptSegment(
    videoId: string,
    startTime: number,
    endTime: number,
    language = 'en'
  ): Promise<TranscriptResult> {
    try {
      // Try InnerTube API first (more reliable in 2025)
      let fullTranscript: TranscriptResult

      try {
        fullTranscript = await this.fetchFromInnerTubeAPI(videoId, language)
        console.log('Successfully fetched transcript via InnerTube API')
      } catch (innerTubeError) {
        console.warn('InnerTube API failed, falling back to transcript server:', innerTubeError)
        // Fallback to transcript server
        fullTranscript = await this.fetchFromTranscriptServer(videoId, language)
        console.log('Successfully fetched transcript via transcript server fallback')
      }

      const filteredSegments = fullTranscript.segments.filter(segment => {
        const segmentStart = segment.start
        const segmentEnd = segment.start + segment.duration

        return (
          (segmentStart >= startTime && segmentStart <= endTime) ||
          (segmentEnd >= startTime && segmentEnd <= endTime) ||
          (segmentStart <= startTime && segmentEnd >= endTime)
        )
      })

      const segmentText = filteredSegments.map(segment => segment.text).join(' ')

      return {
        segments: filteredSegments,
        fullText: segmentText,
        videoId,
        language: fullTranscript.language
      }
    } catch (error) {
      throw this.handleTranscriptError(error, videoId)
    }
  }

  public async getAvailableLanguages(videoId: string): Promise<string[]> {
    try {
      // Try InnerTube API first for accurate language list
      try {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
        const html = await fetch(videoUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        }).then(res => res.text())

        const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)
        if (!apiKeyMatch) {
          throw new Error('API key not found')
        }
        const apiKey = apiKeyMatch[1]

        const endpoint = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`

        const body = {
          context: {
            client: {
              clientName: 'ANDROID',
              clientVersion: '20.10.38'
            }
          },
          videoId: videoId
        }

        const playerResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip'
          },
          body: JSON.stringify(body)
        })

        if (playerResponse.ok) {
          const playerData = await playerResponse.json()
          const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks

          if (captions && Array.isArray(captions)) {
            return captions.map((track: any) => track.languageCode).filter(Boolean)
          }
        }
      } catch (innerTubeError) {
        console.warn('InnerTube language detection failed, trying fallback:', innerTubeError)
      }

      // Fallback to data extractor
      const extractionResult = await this.dataExtractor.extractVideoData(videoId)

      if (extractionResult.success && extractionResult.data?.captions) {
        return extractionResult.data.captions.map(caption => caption.languageCode)
      }

      return ['en']
    } catch (error) {
      console.warn('Failed to get available languages:', error)
      return ['en']
    }
  }

  public async isTranscriptAvailable(videoId: string): Promise<boolean> {
    try {
      // Try InnerTube API first for accurate availability check
      try {
        const testTranscript = await this.fetchFromInnerTubeAPI(videoId, 'en')
        return testTranscript.segments.length > 0
      } catch (innerTubeError) {
        console.warn(
          'InnerTube availability check failed, trying fallback methods:',
          innerTubeError
        )

        // Fallback to data extractor
        const extractionResult = await this.dataExtractor.extractVideoData(videoId)

        if (extractionResult.success && extractionResult.data?.captions) {
          return extractionResult.data.captions.length > 0
        }

        // Final fallback to transcript server
        const testTranscript = await this.fetchFromTranscriptServer(videoId, 'en')
        return testTranscript.segments.length > 0
      }
    } catch (error) {
      return false
    }
  }

  public getSuggestedVideosWithCaptions(): string[] {
    return [
      'dQw4w9WgXcQ', // Rick Roll
      'jNQXAC9IVRw', // Me at the zoo
      '9bZkp7q19f0' // Popular music video
    ]
  }

  private extractVideoId(url: string): string | null {
    try {
      const urlObj = new URL(url)

      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1) || null
      }

      if (urlObj.hostname.includes('youtube.com')) {
        const videoId = urlObj.searchParams.get('v')
        if (videoId) return videoId

        const embedMatch = urlObj.pathname.match(/\/embed\/([^/?]+)/)
        if (embedMatch) return embedMatch[1]
      }

      const regex =
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
      const match = url.match(regex)
      return match ? match[1] : null
    } catch {
      return null
    }
  }

  private handleTranscriptError(error: any, videoId?: string): Error {
    console.error('Transcript error:', error, 'for video:', videoId)

    if (error instanceof Error && error.message.includes('404')) {
      return this.createError('TRANSCRIPT_NOT_FOUND', 'Transcript not available for this video')
    }

    return this.createError('TRANSCRIPT_FETCH_ERROR', error?.message || 'Unknown transcript error')
  }

  public async getExtractionHealth(): Promise<ExtractionHealthReport> {
    return await this.monitor.performHealthCheck()
  }

  public getExtractionMetrics(): ExtractionMetrics {
    return this.monitor.getHealthMetrics()
  }

  private createError(code: FluentFlowError['code'], message: string): FluentFlowError {
    const error = new Error(message) as FluentFlowError
    error.code = code
    error.context = {
      service: 'YouTubeTranscriptService',
      url: typeof window !== 'undefined' ? window.location.href : '',
      timestamp: Date.now(),
      healthMetrics: this.monitor.getHealthMetrics()
    }
    return error
  }
}

export const youtubeTranscriptService = new YouTubeTranscriptService()
