import type { FluentFlowError } from '../types/fluent-flow-types'

export interface YouTubeVideoMetadata {
  videoId: string
  title: string
  author: string
  channelId: string
  duration: number
  viewCount: string
  publishDate?: string
  uploadDate?: string
  description?: string
  thumbnails: {
    url: string
    width: number
    height: number
  }[]
  captions?: {
    languageCode: string
    languageName: string
    baseUrl: string
    isTranslatable: boolean
  }[]
  streamingFormats?: {
    itag: number
    url: string
    mimeType: string
    quality?: string
    qualityLabel?: string
    fps?: number
    bitrate?: number
    audioQuality?: string
    width?: number
    height?: number
    audioSampleRate?: string
  }[]
}

export interface InnerTubeRequestPayload {
  context: {
    client: {
      clientName: string
      clientVersion: string
      platform?: string
      osName?: string
      osVersion?: string
      androidSdkVersion?: number
      deviceMake?: string
      deviceModel?: string
    }
    user?: {
      lockedSafetyMode: boolean
    }
    request?: {
      useSsl: boolean
    }
  }
  videoId: string
  params?: string
}

export interface YouTubeDataExtractionResult {
  success: boolean
  data?: YouTubeVideoMetadata
  method: 'window_objects' | 'innertube_api' | 'youtube_api' | 'oEmbed'
  error?: string
  reliability: number
}

export class YouTubeDataExtractor {
  private static readonly INNERTUBE_ENDPOINT = 'https://www.youtube.com/youtubei/v1/player'
  private static readonly CLIENT_VERSION = '2.20250101.00.00'

  public async extractVideoData(videoId?: string): Promise<YouTubeDataExtractionResult> {
    const extractedVideoId = videoId || (await this.extractVideoIdFromUrl())

    if (!extractedVideoId) {
      return {
        success: false,
        method: 'window_objects',
        error: 'No video ID found',
        reliability: 0
      }
    }

    const extractionMethods = [
      () => this.extractFromWindowObjects(extractedVideoId),
      () => this.extractFromInnerTubeAPI(extractedVideoId)
    ]

    for (const method of extractionMethods) {
      try {
        const result = await method()
        if (result.success) {
          return result
        }
      } catch (error) {
        console.warn('YouTube data extraction method failed:', error)
        continue
      }
    }

    return {
      success: false,
      method: 'window_objects',
      error: 'All extraction methods failed',
      reliability: 0
    }
  }

  public async extractTranscriptData(
    videoId: string,
    language = 'en'
  ): Promise<{
    success: boolean
    captions?: Array<{ languageCode: string; baseUrl: string; name: string }>
    error?: string
  }> {
    try {
      // Extract API key from YouTube video page
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
      const html = await fetch(videoUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }).then(res => res.text())

      const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)
      if (!apiKeyMatch) {
        return { success: false, error: 'API key not found' }
      }
      const apiKey = apiKeyMatch[1]

      // Make request with Android client context using the extracted API key
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

      if (!playerResponse.ok) {
        return { success: false, error: `Player request failed: ${playerResponse.status}` }
      }

      const playerData = await playerResponse.json()
      const captionsList = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks

      if (!captionsList || !Array.isArray(captionsList)) {
        return { success: false, error: 'No captions found' }
      }

      const captions = captionsList.map((track: any) => ({
        languageCode: track.languageCode || 'unknown',
        baseUrl: track.baseUrl || '',
        name:
          track.name?.simpleText || track.name?.runs?.[0]?.text || track.languageCode || 'Unknown'
      }))

      return { success: true, captions }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async extractFromWindowObjects(videoId: string): Promise<YouTubeDataExtractionResult> {
    try {
      // Check if we're in a sidepanel/extension context
      if (this.isInExtensionContext()) {
        const result = await this.extractFromContentScript(videoId)
        if (result) return result
      }

      // Direct window objects access (for content script context)
      const playerResponse = this.getWindowPlayerResponse()
      const initialData = this.getWindowInitialData()

      if (!playerResponse) {
        throw new Error('ytInitialPlayerResponse not found in window')
      }

      const metadata = this.parsePlayerResponse(playerResponse, initialData, videoId)

      return {
        success: true,
        data: metadata,
        method: 'window_objects',
        reliability: 0.9
      }
    } catch (error) {
      return {
        success: false,
        method: 'window_objects',
        error: error instanceof Error ? error.message : 'Unknown error',
        reliability: 0
      }
    }
  }

  private async extractFromInnerTubeAPI(videoId: string): Promise<YouTubeDataExtractionResult> {
    try {
      // First, get the API key from the video page
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
      const html = await fetch(videoUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }).then(res => res.text())

      const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)
      if (!apiKeyMatch) {
        throw new Error('INNERTUBE_API_KEY not found in video page')
      }
      const apiKey = apiKeyMatch[1]

      // Try different client configurations with the extracted API key
      const clients = [
        // {
        //   clientName: 'ANDROID',
        //   clientVersion: '20.10.38',
        //   userAgent: 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip'
        // },
        {
          clientName: 'WEB',
          clientVersion: '2.20241217.01.00',
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        // {
        //   clientName: 'IOS',
        //   clientVersion: '19.14.3',
        //   deviceMake: 'Apple',
        //   deviceModel: 'iPhone16,2',
        //   osName: 'iOS',
        //   osVersion: '17.5.1.21F90',
        //   userAgent: 'com.google.ios.youtube/19.14.3 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X)'
        // }
      ]

      for (const client of clients) {
        try {
          const endpoint = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`

          const body = {
            context: {
              client: {
                clientName: client.clientName,
                clientVersion: client.clientVersion
                // ...(client.clientName === 'IOS' && {
                //   deviceMake: client.deviceMake,
                //   deviceModel: client.deviceModel,
                //   osName: client.osName,
                //   osVersion: client.osVersion
                // })
              }
            },
            videoId
          }

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': client.userAgent
            },
            body: JSON.stringify(body)
          })

          if (response.ok) {
            const data = await response.json()
            const metadata = this.parsePlayerResponse(data, null, videoId)

            return {
              success: true,
              data: metadata,
              method: 'innertube_api',
              reliability:
                client.clientName === 'ANDROID' ? 0.9 : client.clientName === 'IOS' ? 0.8 : 0.7
            }
          } else {
            console.warn(
              `InnerTube ${client.clientName} client HTTP ${response.status}:`,
              response.statusText
            )
          }
        } catch (clientError) {
          console.warn(`InnerTube ${client.clientName} client failed:`, clientError)
          continue
        }
      }

      throw new Error('All InnerTube client configurations failed')
    } catch (error) {
      return {
        success: false,
        method: 'innertube_api',
        error: error instanceof Error ? error.message : 'Unknown error',
        reliability: 0
      }
    }
  }

  private getWindowPlayerResponse(): any {
    if (typeof window === 'undefined') return null

    // Try global window object first
    if ((window as any).ytInitialPlayerResponse) {
      return (window as any).ytInitialPlayerResponse
    }

    // Fallback: parse from script tags
    const scripts = document.querySelectorAll('script')
    for (const script of scripts) {
      if (script.innerHTML.includes('ytInitialPlayerResponse')) {
        try {
          const match = script.innerHTML.match(/ytInitialPlayerResponse\s*=\s*({.+?});/)
          if (match) {
            return JSON.parse(match[1])
          }
        } catch (error) {
          console.warn('Failed to parse ytInitialPlayerResponse from script:', error)
        }
      }
    }

    return null
  }

  private getWindowInitialData(): any {
    if (typeof window === 'undefined') return null

    // Try global window object first
    if ((window as any).ytInitialData) {
      return (window as any).ytInitialData
    }

    // Fallback: parse from script tags
    const scripts = document.querySelectorAll('script')
    for (const script of scripts) {
      if (script.innerHTML.includes('ytInitialData')) {
        try {
          const match = script.innerHTML.match(/ytInitialData\s*=\s*({.+?});/)
          if (match) {
            return JSON.parse(match[1])
          }
        } catch (error) {
          console.warn('Failed to parse ytInitialData from script:', error)
        }
      }
    }

    return null
  }

  private parsePlayerResponse(
    playerResponse: any,
    initialData: any,
    videoId: string
  ): YouTubeVideoMetadata {
    const videoDetails = playerResponse.videoDetails || {}
    const streamingData = playerResponse.streamingData || {}
    const captions = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks || []
    const microformat = playerResponse.microformat?.playerMicroformatRenderer || {}

    // Extract additional info from initialData if available
    if (initialData) {
      try {
        const contents =
          initialData.contents?.twoColumnWatchNextResults?.results?.results?.contents || []
        const secondaryInfo = contents.find((c: any) => c.videoSecondaryInfoRenderer)
        const subscriberCount =
          secondaryInfo?.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer?.subscriberCountText
            ?.simpleText || ''
        // Could use subscriberCount for enhanced metadata in the future
      } catch (error) {
        console.warn('Failed to extract subscriber count:', error)
      }
    }

    // Parse streaming formats
    const streamingFormats: any[] = []

    // Progressive formats (video + audio combined)
    if (streamingData.formats) {
      streamingFormats.push(
        ...streamingData.formats.map((format: any) => ({
          itag: format.itag,
          url: format.url,
          mimeType: format.mimeType,
          quality: format.quality,
          qualityLabel: format.qualityLabel,
          fps: format.fps,
          audioQuality: format.audioQuality,
          width: format.width,
          height: format.height
        }))
      )
    }

    // Adaptive formats (separate audio/video)
    if (streamingData.adaptiveFormats) {
      streamingFormats.push(
        ...streamingData.adaptiveFormats.map((format: any) => ({
          itag: format.itag,
          url: format.url,
          mimeType: format.mimeType,
          bitrate: format.bitrate,
          quality: format.quality,
          qualityLabel: format.qualityLabel,
          fps: format.fps,
          audioQuality: format.audioQuality,
          audioSampleRate: format.audioSampleRate,
          width: format.width,
          height: format.height
        }))
      )
    }

    // Parse captions
    const parsedCaptions = captions.map((caption: any) => ({
      languageCode: caption.languageCode,
      languageName:
        caption.name?.simpleText || caption.name?.runs?.[0]?.text || caption.languageCode,
      baseUrl: caption.baseUrl,
      isTranslatable: caption.isTranslatable || false
    }))

    return {
      videoId,
      title: videoDetails.title || 'Unknown Title',
      author: videoDetails.author || 'Unknown Channel',
      channelId: videoDetails.channelId || '',
      duration: parseInt(videoDetails.lengthSeconds || '0', 10),
      viewCount: videoDetails.viewCount || '0',
      publishDate: microformat.publishDate,
      uploadDate: microformat.uploadDate,
      description: videoDetails.shortDescription || '',
      thumbnails: videoDetails.thumbnail?.thumbnails || [],
      captions: parsedCaptions.length > 0 ? parsedCaptions : undefined,
      streamingFormats: streamingFormats.length > 0 ? streamingFormats : undefined
    }
  }

  private async extractVideoIdFromUrl(): Promise<string | null> {
    if (typeof window === 'undefined') return null

    // If we're in extension context, get video ID from active tab
    if (this.isInExtensionContext()) {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
        const activeTab = tabs[0]
        if (activeTab?.url) {
          const regex = /[?&]v=([^&#]*)/
          const match = activeTab.url.match(regex)
          return match ? match[1] : null
        }
      } catch (error) {
        console.warn('Failed to get video ID from active tab:', error)
      }
    }

    // Direct URL access (for content script context)
    const url = window.location.href
    const regex = /[?&]v=([^&#]*)/
    const match = url.match(regex)
    return match ? match[1] : null
  }

  private isInExtensionContext(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      typeof chrome.tabs !== 'undefined' &&
      typeof chrome.runtime !== 'undefined'
    )
  }

  private async extractFromContentScript(
    videoId: string
  ): Promise<YouTubeDataExtractionResult | null> {
    try {
      // Use Plasmo messaging to send request to background script
      const { sendToBackground } = await import('@plasmohq/messaging')

      const response = await sendToBackground({
        name: 'extract-youtube-data',
        body: { videoId, requestType: 'innertube_player' }
      })

      if (response?.success && response.data) {
        return {
          success: true,
          data: response.data,
          method: 'window_objects',
          reliability: 0.9
        }
      } else {
        throw new Error(response?.error || 'Background extraction failed')
      }
    } catch (error) {
      console.warn('Content script extraction failed:', error)
      return null
    }
  }

  public async monitorExtractionHealth(): Promise<{
    windowObjects: boolean
    innerTubeAPI: boolean
    overallHealth: number
  }> {
    const videoId = await this.extractVideoIdFromUrl()
    if (!videoId) {
      return {
        windowObjects: false,
        innerTubeAPI: false,
        overallHealth: 0
      }
    }

    const results = await Promise.allSettled([
      this.extractFromWindowObjects(videoId),
      this.extractFromInnerTubeAPI(videoId)
    ])

    const windowObjectsSuccess = results[0].status === 'fulfilled' && results[0].value.success
    const innerTubeSuccess = results[1].status === 'fulfilled' && results[1].value.success

    const overallHealth = (windowObjectsSuccess ? 0.6 : 0) + (innerTubeSuccess ? 0.4 : 0)

    return {
      windowObjects: windowObjectsSuccess,
      innerTubeAPI: innerTubeSuccess,
      overallHealth
    }
  }

  public async createError(
    code: FluentFlowError['code'],
    message: string,
    context?: any
  ): Promise<FluentFlowError> {
    const error = new Error(message) as FluentFlowError
    error.code = code
    error.context = {
      url: typeof window !== 'undefined' ? window.location.href : '',
      videoId: await this.extractVideoIdFromUrl(),
      ...context
    }
    return error
  }
}
