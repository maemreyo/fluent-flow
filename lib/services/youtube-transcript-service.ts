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
    language?: string,
    youtubeApiKey?: string
  ): Promise<TranscriptResult> {
    if (!videoId || videoId.trim().length === 0) {
      throw this.createError('VIDEO_NOT_FOUND', 'Video ID is required')
    }

    if (startTime < 0 || endTime <= startTime) {
      throw this.createError('PARSE_ERROR', 'Invalid time range: startTime must be >= 0 and endTime must be > startTime')
    }

    const cleanVideoId = this.extractVideoId(videoId)
    
    // Advanced method selection with deep YouTube data access
    const methods = [
      // Method 1: Deep YouTube data access via ytInitialPlayerResponse (highest priority)
      ...(typeof window !== 'undefined' ? [() => this.extractTranscriptFromYtInitialPlayerResponse(cleanVideoId)] : []),
      // Method 2: Ejoy English storage/cache extraction
      ...(typeof window !== 'undefined' ? [() => this.extractTranscriptFromEjoyStorage(cleanVideoId)] : []),
      // Method 3: Extract from visible Ejoy English extension if available
      ...(typeof window !== 'undefined' ? [() => this.extractTranscriptFromEjoyExtension(cleanVideoId)] : []),
      // Method 4: Improved npm package (with smart language detection)
      () => this.fetchTranscriptWithRetry(cleanVideoId, language),
      // Method 5: Direct URL extraction (works in all contexts)
      () => this.extractTranscriptViaDirectURL(cleanVideoId, language),
      // Method 6: DOM extraction from YouTube page
      ...(typeof window !== 'undefined' ? [() => this.extractTranscriptFromDOM(cleanVideoId)] : []),
      // Method 7: Content script extraction (Chrome Extension Manifest V3 compatible)
      ...(typeof window !== 'undefined' ? [() => this.extractTranscriptViaContentScript(cleanVideoId)] : []),
      // Method 8: YouTube Data API v3 (if API key provided)
      ...(youtubeApiKey ? [() => this.extractTranscriptViaYouTubeAPI(cleanVideoId, youtubeApiKey)] : [])
    ]

    let lastError: any = null
    let methodIndex = 0
    const totalMethods = methods.length
    
    for (const method of methods) {
      try {
        methodIndex++
        console.log(`FluentFlow: Attempting transcript extraction method ${methodIndex}/${totalMethods} for ${cleanVideoId}`)
        
        const fullTranscript = await method()
        const segmentTranscript = this.extractTimeSegment(fullTranscript, startTime, endTime)
        
        if (segmentTranscript.segments.length === 0) {
          console.warn(`FluentFlow: Method ${methodIndex} - No transcript content found for time range ${startTime}s - ${endTime}s`)
          continue // Try next method
        }

        console.log(`FluentFlow: ✅ Successfully extracted transcript using method ${methodIndex}/${totalMethods} with ${segmentTranscript.segments.length} segments`)
        
        // Log a sample of the extracted content for debugging
        if (segmentTranscript.segments.length > 0) {
          const sampleText = segmentTranscript.segments.slice(0, 2).map(s => s.text).join(' ')
          console.log(`FluentFlow: Sample content: "${sampleText.substring(0, 100)}${sampleText.length > 100 ? '...' : ''}"`)
        }
        
        return {
          ...segmentTranscript,
          videoId: cleanVideoId,
          language: language || 'auto'
        }
      } catch (error) {
        console.log(`FluentFlow: ❌ Method ${methodIndex}/${totalMethods} failed:`, error)
        lastError = error
        continue // Try next method
      }
    }

    // All methods failed - provide helpful guidance
    console.error(`FluentFlow: 💥 All ${totalMethods} transcript extraction methods failed for video ${cleanVideoId}`)
    
    // Extract useful information from errors for better user guidance
    let errorMessage = 'All transcript extraction methods failed.'
    if (lastError && lastError.message) {
      if (lastError.message.includes('Available languages:')) {
        const languageMatch = lastError.message.match(/Available languages: (.+)/)
        if (languageMatch) {
          const languages = languageMatch[1].split(', ').slice(0, 10).join(', ')
          errorMessage = `Video has captions available in: ${languages}. Try a different language setting or use a video with English captions.`
        }
      }
    }
    
    if (lastError instanceof Error && 'code' in lastError) {
      throw lastError
    }
    
    const enhancedError = this.handleTranscriptError(lastError, cleanVideoId)
    enhancedError.message = errorMessage
    throw enhancedError
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
   * Get suggested videos with captions for testing
   */
  getSuggestedVideosWithCaptions(): Array<{ id: string; title: string; description: string }> {
    return [
      {
        id: 'dQw4w9WgXcQ',
        title: 'Rick Astley - Never Gonna Give You Up',
        description: 'Popular music video with auto-generated captions'
      },
      {
        id: 'do2OdJjdPKs',
        title: 'TED Talk Sample',
        description: 'TED Talks usually have professional captions'
      },
      {
        id: 'v=VQH8ZTgna3Q',
        title: 'Khan Academy Lesson',
        description: 'Educational content with captions'
      },
      {
        id: 'fJ9rUzIMcZQ',
        title: 'BBC News Video',
        description: 'News videos often have captions'
      }
    ]
  }

  /**
   * Enhanced availability check with better detection
   */
  async enhancedAvailabilityCheck(videoId: string): Promise<{
    available: boolean
    methods: string[]
    suggestions?: string[]
    error?: string
  }> {
    const cleanVideoId = this.extractVideoId(videoId)
    const results = {
      available: false,
      methods: [] as string[],
      suggestions: [] as string[]
    }

    // Test each method
    const testMethods = [
      { name: 'npm-package', test: () => this.fetchTranscriptWithRetry(cleanVideoId) },
      { name: 'npm-package-en', test: () => this.fetchTranscriptWithRetry(cleanVideoId, 'en') },
      { name: 'dom-extraction', test: () => this.extractTranscriptFromDOM(cleanVideoId) }
    ]

    for (const method of testMethods) {
      try {
        await method.test()
        results.methods.push(method.name)
        results.available = true
      } catch (error) {
        // Method failed, but continue testing others
      }
    }

    if (!results.available) {
      results.suggestions = [
        'Try videos from popular channels (TED, Khan Academy, BBC)',
        'Look for videos with the CC (closed captions) button on YouTube',
        'Educational and news content often has captions',
        'Avoid music videos without lyrics or very new videos'
      ]
    }

    return results
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

      // Try the improved package with fallback mechanisms first
      try {
        const { YoutubeTranscript: ImprovedTranscript } = await import('@danielxceron/youtube-transcript')
        console.log(`FluentFlow: Using improved transcript package (method ${retryCount + 1})`)
        
        const transcript = await Promise.race([
          ImprovedTranscript.fetchTranscript(videoId, options),
          this.createTimeoutPromise(this.DEFAULT_TIMEOUT)
        ])

        if (!transcript || !Array.isArray(transcript)) {
          throw this.createError('NOT_AVAILABLE', 'Invalid transcript format received from improved package')
        }

        console.log(`FluentFlow: Successfully fetched ${transcript.length} segments using improved package`)
        return transcript
        
      } catch (improvedError) {
        console.log(`FluentFlow: Improved package failed, falling back to original:`, improvedError)
        
        // Check if it's a language availability error and extract available languages
        if (improvedError.message && improvedError.message.includes('Available languages:')) {
          const availableLanguagesMatch = improvedError.message.match(/Available languages: (.+)/)
          if (availableLanguagesMatch) {
            const availableLanguages = availableLanguagesMatch[1].split(', ')
            console.log(`FluentFlow: Video has captions in: ${availableLanguages.join(', ')}`)
            
            // Re-import for retry attempts
            const { YoutubeTranscript: RetryTranscript } = await import('@danielxceron/youtube-transcript')
            
            // Try to find a suitable language
            const preferredLanguages = ['en', 'en-US', 'en-GB']
            for (const preferredLang of preferredLanguages) {
              if (availableLanguages.includes(preferredLang)) {
                console.log(`FluentFlow: Retrying with available language: ${preferredLang}`)
                try {
                  const retryTranscript = await RetryTranscript.fetchTranscript(videoId, { lang: preferredLang })
                  if (retryTranscript && Array.isArray(retryTranscript) && retryTranscript.length > 0) {
                    console.log(`FluentFlow: Success with ${preferredLang}: ${retryTranscript.length} segments`)
                    return retryTranscript
                  }
                } catch (langError) {
                  console.log(`FluentFlow: ${preferredLang} failed, continuing...`)
                  continue
                }
              }
            }
            
            // Try first available language if no English variants work
            if (availableLanguages.length > 0) {
              const firstLang = availableLanguages[0]
              console.log(`FluentFlow: Trying first available language: ${firstLang}`)
              try {
                const retryTranscript = await RetryTranscript.fetchTranscript(videoId, { lang: firstLang })
                if (retryTranscript && Array.isArray(retryTranscript) && retryTranscript.length > 0) {
                  console.log(`FluentFlow: Success with ${firstLang}: ${retryTranscript.length} segments`)
                  return retryTranscript
                }
              } catch (langError) {
                console.log(`FluentFlow: ${firstLang} also failed`)
              }
            }
          }
        }
        
        // Fallback to original package
        const { YoutubeTranscript } = await import('youtube-transcript')
        const transcript = await Promise.race([
          YoutubeTranscript.fetchTranscript(videoId, options),
          this.createTimeoutPromise(this.DEFAULT_TIMEOUT)
        ])

        if (!transcript || !Array.isArray(transcript)) {
          throw this.createError('NOT_AVAILABLE', 'Invalid transcript format received from original package')
        }

        console.log(`FluentFlow: Successfully fetched ${transcript.length} segments using original package`)
        return transcript
      }

    } catch (error) {
      if (retryCount < this.MAX_RETRIES && this.isRetryableError(error)) {
        console.log(`FluentFlow: Retry attempt ${retryCount + 1}/${this.MAX_RETRIES} after ${this.RETRY_DELAY * (retryCount + 1)}ms`)
        await this.delay(this.RETRY_DELAY * (retryCount + 1))
        return this.fetchTranscriptWithRetry(videoId, language, retryCount + 1)
      }
      throw error
    }
  }

  /**
   * Browser extension specific: Extract transcript from YouTube page DOM
   */
  private async extractTranscriptFromDOM(videoId: string): Promise<any[]> {
    try {
      // Check if we're in a browser extension context
      if (typeof window === 'undefined' || !window.location) {
        throw new Error('DOM extraction only available in browser context')
      }

      // Try to find ytInitialPlayerResponse in the page
      const scripts = document.getElementsByTagName('script')
      let playerResponse: any = null

      for (const script of scripts) {
        const content = script.textContent || script.innerHTML
        if (content.includes('ytInitialPlayerResponse')) {
          try {
            // Extract the JSON from the script
            const match = content.match(/ytInitialPlayerResponse\s*=\s*({.+?});/)
            if (match && match[1]) {
              playerResponse = JSON.parse(match[1])
              break
            }
          } catch (e) {
            continue
          }
        }
      }

      if (!playerResponse) {
        throw new Error('Could not find ytInitialPlayerResponse in page')
      }

      // Extract captions from player response
      const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks
      if (!captions || !Array.isArray(captions) || captions.length === 0) {
        throw new Error('No caption tracks found in player response')
      }

      // Find the best caption track (prefer English, then auto-generated)
      let selectedTrack = captions.find((track: any) => 
        track.languageCode === 'en' || track.languageCode === 'en-US'
      ) || captions[0]

      if (!selectedTrack?.baseUrl) {
        throw new Error('No valid caption track found')
      }

      // Fetch the caption content
      console.log(`FluentFlow: Fetching captions from: ${selectedTrack.baseUrl}`)
      const response = await fetch(selectedTrack.baseUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch captions: ${response.status}`)
      }

      const captionText = await response.text()
      
      // Parse the caption XML/JSON format
      return this.parseCaptionResponse(captionText)
      
    } catch (error) {
      console.log('FluentFlow: DOM extraction failed:', error)
      throw new Error(`DOM extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Parse caption response (could be XML or JSON format)
   */
  private parseCaptionResponse(captionText: string): any[] {
    try {
      // YouTube captions are usually in XML format
      if (captionText.includes('<transcript>') || captionText.includes('<text')) {
        return this.parseXMLCaptions(captionText)
      }
      
      // Try parsing as JSON
      const jsonData = JSON.parse(captionText)
      if (jsonData.events) {
        return this.parseJSONCaptions(jsonData)
      }
      
      throw new Error('Unknown caption format')
    } catch (error) {
      throw new Error(`Failed to parse caption response: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Parse XML format captions
   */
  private parseXMLCaptions(xmlText: string): any[] {
    const segments: any[] = []
    
    // Simple regex parsing for XML captions
    const textMatches = xmlText.matchAll(/<text start="([^"]*)" dur="([^"]*)"[^>]*>([^<]*)<\/text>/g)
    
    for (const match of textMatches) {
      const start = parseFloat(match[1]) || 0
      const duration = parseFloat(match[2]) || 0
      const text = match[3].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      
      if (text.trim()) {
        segments.push({
          text: text.trim(),
          offset: start,
          duration: duration
        })
      }
    }
    
    return segments
  }

  /**
   * Parse JSON format captions
   */
  private parseJSONCaptions(jsonData: any): any[] {
    const segments: any[] = []
    
    if (jsonData.events && Array.isArray(jsonData.events)) {
      for (const event of jsonData.events) {
        if (event.segs && Array.isArray(event.segs)) {
          const startTime = event.tStartMs ? event.tStartMs / 1000 : 0
          const duration = event.dDurationMs ? event.dDurationMs / 1000 : 0
          
          const text = event.segs.map((seg: any) => seg.utf8 || '').join('').trim()
          
          if (text) {
            segments.push({
              text: text,
              offset: startTime,
              duration: duration
            })
          }
        }
      }
    }
    
    return segments
  }

  /**
   * Advanced content script method for Chrome extension environment
   * Based on 2025 best practices for browser extensions
   */
  private async extractTranscriptViaContentScript(videoId: string): Promise<any[]> {
    try {
      // Check if we're in a Chrome extension environment with the correct API
      if (typeof chrome === 'undefined') {
        throw new Error('Content script method only available in Chrome extension context')
      }

      console.log(`FluentFlow: Attempting content script extraction for ${videoId}`)

      // Use modern Chrome Extension Manifest V3 API
      if (chrome.scripting && chrome.scripting.executeScript) {
        return await this.extractWithScriptingAPI(videoId)
      }
      
      // Fallback to legacy API if available (Manifest V2)
      if (chrome.tabs && chrome.tabs.executeScript) {
        return await this.extractWithLegacyAPI(videoId)
      }

      throw new Error('No suitable Chrome extension scripting API available')

    } catch (error) {
      console.log('FluentFlow: Content script extraction failed:', error)
      throw new Error(`Content script extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Modern Manifest V3 scripting API
   */
  private async extractWithScriptingAPI(videoId: string): Promise<any[]> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    
    if (!tabs[0] || !tabs[0].url?.includes('youtube.com/watch')) {
      throw new Error('Not on a YouTube video page')
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id! },
      func: this.extractTranscriptFromPage
    })

    const result = results?.[0]?.result
    if (!result?.success) {
      throw new Error(result?.error || 'Content script execution failed')
    }

    // Fetch the caption content
    const response = await fetch(result.captionUrl)
    const captionText = await response.text()
    return this.parseCaptionResponse(captionText)
  }

  /**
   * Legacy Manifest V2 API (fallback)
   */
  private async extractWithLegacyAPI(videoId: string): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0] || !tabs[0].url?.includes('youtube.com/watch')) {
          reject(new Error('Not on a YouTube video page'))
          return
        }

        chrome.tabs.executeScript(tabs[0].id!, {
          code: `(${this.extractTranscriptFromPage.toString()})()`
        }, (results) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
            return
          }

          const result = results?.[0]
          if (!result?.success) {
            reject(new Error(result?.error || 'Content script execution failed'))
            return
          }

          // Fetch the caption content
          fetch(result.captionUrl)
            .then(response => response.text())
            .then(captionText => {
              const segments = this.parseCaptionResponse(captionText)
              resolve(segments)
            })
            .catch(reject)
        })
      })
    })
  }

  /**
   * Injected function to extract transcript data from YouTube page
   */
  private extractTranscriptFromPage(): { success: boolean; captionUrl?: string; language?: string; error?: string } {
    try {
      // Method 1: Try ytInitialPlayerResponse
      let playerResponse = null
      
      // Look for ytInitialPlayerResponse in scripts
      const scripts = document.getElementsByTagName('script')
      for (const script of scripts) {
        const content = script.textContent || script.innerHTML
        if (content.includes('ytInitialPlayerResponse')) {
          const match = content.match(/ytInitialPlayerResponse\s*=\s*({.+?});/)
          if (match && match[1]) {
            try {
              playerResponse = JSON.parse(match[1])
              break
            } catch (e) {
              continue
            }
          }
        }
      }

      // Method 2: Try window.ytInitialPlayerResponse
      if (!playerResponse && (window as any).ytInitialPlayerResponse) {
        playerResponse = (window as any).ytInitialPlayerResponse
      }

      // Method 3: Try ytplayer.config (legacy)
      if (!playerResponse && (window as any).ytplayer && (window as any).ytplayer.config) {
        try {
          const rawResponse = (window as any).ytplayer.config.args.raw_player_response
          if (typeof rawResponse === 'string') {
            playerResponse = JSON.parse(rawResponse)
          } else if (typeof rawResponse === 'object') {
            playerResponse = rawResponse
          }
        } catch (e) {
          // Continue to next method
        }
      }

      if (!playerResponse) {
        throw new Error('Could not find player response data')
      }

      // Extract captions
      const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks
      if (!captions || !Array.isArray(captions) || captions.length === 0) {
        throw new Error('No caption tracks found')
      }

      // Find best caption track
      let selectedTrack = captions.find((track: any) => 
        track.languageCode === 'en' || track.languageCode === 'en-US'
      ) || captions.find((track: any) => track.kind !== 'asr') || captions[0]

      if (!selectedTrack?.baseUrl) {
        throw new Error('No valid caption track found')
      }

      return {
        success: true,
        captionUrl: selectedTrack.baseUrl,
        language: selectedTrack.languageCode
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * YouTube Data API v3 method (requires API key)
   */
  private async extractTranscriptViaYouTubeAPI(videoId: string, apiKey?: string): Promise<any[]> {
    if (!apiKey) {
      throw new Error('YouTube Data API key required for this method')
    }

    try {
      console.log(`FluentFlow: Attempting YouTube Data API v3 extraction for ${videoId}`)

      // Step 1: Get captions list
      const captionsListUrl = `https://www.googleapis.com/youtube/v3/captions?videoId=${videoId}&key=${apiKey}`
      const captionsResponse = await fetch(captionsListUrl)
      
      if (!captionsResponse.ok) {
        throw new Error(`API request failed: ${captionsResponse.status}`)
      }

      const captionsData = await captionsResponse.json()
      
      if (!captionsData.items || captionsData.items.length === 0) {
        throw new Error('No captions available via YouTube API')
      }

      // Step 2: Find best caption track
      let selectedCaption = captionsData.items.find((caption: any) => 
        caption.snippet.language === 'en'
      ) || captionsData.items[0]

      // Step 3: Download caption content (requires OAuth2)
      const downloadUrl = `https://www.googleapis.com/youtube/v3/captions/${selectedCaption.id}?key=${apiKey}`
      const downloadResponse = await fetch(downloadUrl)
      
      if (!downloadResponse.ok) {
        throw new Error(`Caption download failed: ${downloadResponse.status}`)
      }

      const captionText = await downloadResponse.text()
      const segments = this.parseCaptionResponse(captionText)
      
      console.log(`FluentFlow: YouTube API extracted ${segments.length} segments`)
      return segments

    } catch (error) {
      console.log('FluentFlow: YouTube API extraction failed:', error)
      throw new Error(`YouTube API extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Direct URL-based extraction (works for many YouTube videos)
   */
  private async extractTranscriptViaDirectURL(videoId: string, language?: string): Promise<any[]> {
    try {
      console.log(`FluentFlow: Attempting direct URL extraction for ${videoId}`)

      // Try to fetch transcript directly from YouTube's transcript API
      const lang = language || 'en'
      const transcriptUrls = [
        `https://video.google.com/timedtext?lang=${lang}&v=${videoId}`,
        `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}&fmt=vtt`,
        `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}&fmt=json3`
      ]

      for (const url of transcriptUrls) {
        try {
          console.log(`FluentFlow: Trying direct URL: ${url}`)
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          })
          
          if (response.ok) {
            const text = await response.text()
            
            if (text && text.trim().length > 0 && !text.includes('<!DOCTYPE html>')) {
              console.log(`FluentFlow: Got transcript data from direct URL: ${text.length} characters`)
              
              // Parse the response based on format
              if (url.includes('fmt=json3')) {
                return this.parseJSON3Transcript(text)
              } else if (url.includes('fmt=vtt')) {
                return this.parseVTTTranscript(text)
              } else {
                return this.parseCaptionResponse(text)
              }
            }
          }
        } catch (urlError) {
          console.log(`FluentFlow: Direct URL failed: ${urlError}`)
          continue
        }
      }

      throw new Error('No direct transcript URLs worked')

    } catch (error) {
      console.log('FluentFlow: Direct URL extraction failed:', error)
      throw new Error(`Direct URL extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract transcript from Ejoy English extension DOM if present
   */
  private async extractTranscriptFromEjoyExtension(videoId: string): Promise<any[]> {
    try {
      console.log(`FluentFlow: Attempting to extract transcript from Ejoy English extension for ${videoId}`)

      // Check if Ejoy English extension elements are present
      const ejoyContainer = document.querySelector('.gl-nf-sitebar-viewContentAbs')
      if (!ejoyContainer) {
        throw new Error('Ejoy English extension not found or transcript not loaded')
      }

      // Find all transcript segments
      const transcriptSegments = document.querySelectorAll('.site-s-c[data-time]')
      
      if (transcriptSegments.length === 0) {
        throw new Error('No transcript segments found in Ejoy English extension')
      }

      console.log(`FluentFlow: Found ${transcriptSegments.length} transcript segments in Ejoy English`)

      const segments = []
      
      for (const segment of transcriptSegments) {
        const timeData = segment.getAttribute('data-time')
        const textElement = segment.querySelector('.site-s-title .site-s-textSubItem span:first-child')
        
        if (timeData && textElement) {
          // Parse timing data (format: "5140-10140" = start-end in milliseconds)
          const [startMs, endMs] = timeData.split('-').map(t => parseInt(t))
          const startTime = startMs / 1000  // Convert to seconds
          const duration = (endMs - startMs) / 1000
          
          const text = textElement.textContent?.trim()
          if (text) {
            segments.push({
              text: text,
              start: startTime,
              duration: duration,
              offset: startTime
            })
          }
        }
      }

      if (segments.length === 0) {
        throw new Error('No valid transcript segments extracted from Ejoy English')
      }

      console.log(`FluentFlow: ✅ Successfully extracted ${segments.length} segments from Ejoy English extension`)
      console.log(`FluentFlow: Sample: "${segments[0]?.text?.substring(0, 50)}..."`)
      
      return segments

    } catch (error) {
      console.log('FluentFlow: Ejoy English extraction failed:', error)
      throw new Error(`Ejoy English extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract transcript using ytInitialPlayerResponse (deep YouTube data access)
   */
  private async extractTranscriptFromYtInitialPlayerResponse(videoId: string): Promise<any[]> {
    try {
      console.log(`FluentFlow: Attempting ytInitialPlayerResponse extraction for ${videoId}`)

      // Method 1: Try to access global ytInitialPlayerResponse
      let playerResponse = null
      
      if (typeof window !== 'undefined' && (window as any).ytInitialPlayerResponse) {
        playerResponse = (window as any).ytInitialPlayerResponse
        console.log('FluentFlow: Found ytInitialPlayerResponse in window')
      }
      
      // Method 2: Extract from script tags if global not available
      if (!playerResponse && typeof document !== 'undefined') {
        const scripts = document.querySelectorAll('script')
        for (const script of scripts) {
          if (script.innerHTML.includes('ytInitialPlayerResponse')) {
            try {
              const match = script.innerHTML.match(/ytInitialPlayerResponse\s*=\s*({.+?});/)
              if (match) {
                playerResponse = JSON.parse(match[1])
                console.log('FluentFlow: Extracted ytInitialPlayerResponse from script tag')
                break
              }
            } catch (parseError) {
              console.log('FluentFlow: Failed to parse ytInitialPlayerResponse from script')
              continue
            }
          }
        }
      }

      if (!playerResponse) {
        throw new Error('ytInitialPlayerResponse not found')
      }

      // Extract caption tracks
      const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks
      if (!captions || captions.length === 0) {
        throw new Error('No caption tracks found in ytInitialPlayerResponse')
      }

      console.log(`FluentFlow: Found ${captions.length} caption tracks`)
      
      // Prioritize English and non-ASR tracks
      const prioritizedTracks = captions.sort((a: any, b: any) => {
        const aIsEnglish = a.languageCode?.startsWith('en') || a.vssId?.includes('.en')
        const bIsEnglish = b.languageCode?.startsWith('en') || b.vssId?.includes('.en')
        const aIsASR = a.kind === 'asr'
        const bIsASR = b.kind === 'asr'
        
        if (aIsEnglish && !bIsEnglish) return -1
        if (bIsEnglish && !aIsEnglish) return 1
        if (!aIsASR && bIsASR) return -1
        if (!bIsASR && aIsASR) return 1
        return 0
      })

      const selectedTrack = prioritizedTracks[0]
      console.log(`FluentFlow: Selected caption track: ${selectedTrack.name?.simpleText || selectedTrack.languageCode}`)

      // Fetch caption content
      let captionUrl = selectedTrack.baseUrl
      if (!captionUrl.startsWith('http')) {
        captionUrl = 'https://www.youtube.com' + captionUrl
      }

      console.log('FluentFlow: Fetching caption content from:', captionUrl)
      const response = await fetch(captionUrl)
      const captionText = await response.text()

      // Parse XML captions
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(captionText, 'text/xml')
      const textNodes = xmlDoc.getElementsByTagName('text')

      if (textNodes.length === 0) {
        throw new Error('No text nodes found in caption XML')
      }

      const segments = []
      for (const textNode of textNodes) {
        const text = textNode.textContent?.trim()
        const start = parseFloat(textNode.getAttribute('start') || '0')
        const duration = parseFloat(textNode.getAttribute('dur') || '0')
        
        if (text) {
          segments.push({
            text: text.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
            start: start,
            duration: duration,
            offset: start
          })
        }
      }

      console.log(`FluentFlow: ✅ Successfully extracted ${segments.length} segments from ytInitialPlayerResponse`)
      if (segments.length > 0) {
        console.log(`FluentFlow: Sample: "${segments[0].text?.substring(0, 50)}..."`)
      }
      
      return segments

    } catch (error) {
      console.log('FluentFlow: ytInitialPlayerResponse extraction failed:', error)
      throw new Error(`ytInitialPlayerResponse extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract transcript from Ejoy English extension's internal storage/cache
   */
  private async extractTranscriptFromEjoyStorage(videoId: string): Promise<any[]> {
    try {
      console.log(`FluentFlow: Attempting Ejoy storage extraction for ${videoId}`)

      // Try to access Ejoy's internal data storage
      const ejoyData = (window as any).__EJOY_DATA__ || (window as any).ejoyData || (window as any).EJOY_TRANSCRIPT_CACHE

      if (ejoyData && ejoyData[videoId]) {
        console.log('FluentFlow: Found transcript in Ejoy storage cache')
        return ejoyData[videoId]
      }

      // Try to find Ejoy extension content scripts or injected data
      const ejoyElements = document.querySelectorAll('[data-ejoy-transcript], [data-transcript-cache]')
      for (const element of ejoyElements) {
        try {
          const transcriptData = element.getAttribute('data-transcript-cache') || element.getAttribute('data-ejoy-transcript')
          if (transcriptData) {
            const parsed = JSON.parse(transcriptData)
            if (parsed && Array.isArray(parsed)) {
              console.log('FluentFlow: Found transcript in Ejoy DOM cache')
              return parsed
            }
          }
        } catch (parseError) {
          continue
        }
      }

      // Try to access Chrome extension storage (if available)
      if (typeof chrome !== 'undefined' && chrome.storage) {
        try {
          const result = await new Promise<Record<string, any>>((resolve) => {
            chrome.storage.local.get([`ejoy_transcript_${videoId}`, `transcript_${videoId}`], resolve)
          })
          
          const transcriptKey = `ejoy_transcript_${videoId}` in result ? `ejoy_transcript_${videoId}` : `transcript_${videoId}`
          if (result[transcriptKey]) {
            console.log('FluentFlow: Found transcript in Chrome storage')
            return result[transcriptKey]
          }
        } catch (storageError) {
          console.log('FluentFlow: Chrome storage access failed:', storageError)
        }
      }

      throw new Error('No Ejoy transcript storage found')

    } catch (error) {
      console.log('FluentFlow: Ejoy storage extraction failed:', error)
      throw new Error(`Ejoy storage extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Parse YouTube's JSON3 transcript format
   */
  private parseJSON3Transcript(jsonText: string): any[] {
    try {
      const data = JSON.parse(jsonText)
      const segments: any[] = []

      if (data.events && Array.isArray(data.events)) {
        for (const event of data.events) {
          if (event.segs && Array.isArray(event.segs)) {
            const startTime = event.tStartMs ? event.tStartMs / 1000 : 0
            const duration = event.dDurationMs ? event.dDurationMs / 1000 : 0
            
            const text = event.segs.map((seg: any) => seg.utf8 || '').join('').trim()
            
            if (text) {
              segments.push({
                text: text,
                offset: startTime,
                duration: duration
              })
            }
          }
        }
      }

      return segments
    } catch (error) {
      throw new Error(`Failed to parse JSON3 transcript: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Parse VTT (WebVTT) transcript format
   */
  private parseVTTTranscript(vttText: string): any[] {
    try {
      const segments: any[] = []
      const lines = vttText.split('\n')
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        
        // Look for time stamps (e.g., "00:00:10.000 --> 00:00:12.000")
        const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3})/)
        
        if (timeMatch) {
          const startTime = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000
          const endTime = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000
          
          // Get the text on the next line(s)
          let text = ''
          for (let j = i + 1; j < lines.length && lines[j].trim() !== ''; j++) {
            text += lines[j].trim() + ' '
          }
          
          if (text.trim()) {
            segments.push({
              text: text.trim(),
              offset: startTime,
              duration: endTime - startTime
            })
          }
        }
      }

      return segments
    } catch (error) {
      throw new Error(`Failed to parse VTT transcript: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
      return this.createError('NOT_AVAILABLE', 
        `No captions/transcript available for video ${videoId}. ` +
        `Try videos with: (1) Closed captions enabled, (2) Auto-generated captions, ` +
        `(3) Popular channels like TED, Khan Academy, or news channels. ` +
        `You can check if a video has captions by looking for the CC button on YouTube.`
      )
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