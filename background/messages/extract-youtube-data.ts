import type { PlasmoMessaging } from "@plasmohq/messaging"

export interface ExtractYouTubeDataRequest {
  videoId?: string
  requestType?: string
  language?: string
}

export interface ExtractYouTubeDataResponse {
  success: boolean
  data?: any
  error?: string
}

// Function that will be injected into the YouTube page
async function extractYouTubeDataFromPage(videoId?: string, requestType: string = 'window_objects', language: string = 'en'): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    console.log('Extracting YouTube data from page:', { videoId, requestType, language })
    
    if (requestType === 'innertube_transcript' && videoId) {
      // Use InnerTube API with browser context for transcript
      try {
        const apiKeyMatch = document.documentElement.innerHTML.match(/"INNERTUBE_API_KEY":"([^"]+)"/)
        if (!apiKeyMatch) {
          throw new Error('INNERTUBE_API_KEY not found')
        }
        const apiKey = apiKeyMatch[1]
        
        const endpoint = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`
        
        const body = {
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20241217.01.00'
            }
          },
          videoId: videoId
        }
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Origin': 'https://www.youtube.com',
            'Referer': `https://www.youtube.com/watch?v=${videoId}`,
            'User-Agent': navigator.userAgent
          },
          credentials: 'include',
          body: JSON.stringify(body)
        })

        if (!response.ok) {
          throw new Error(`InnerTube API failed: ${response.status} ${response.statusText}`)
        }

        const playerData = await response.json()
        
        // Extract captions from player data
        const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks
        
        if (captions && Array.isArray(captions)) {
          return {
            success: true,
            data: {
              captions: captions.map((track: any) => ({
                languageCode: track.languageCode || 'unknown',
                baseUrl: track.baseUrl || '',
                name: track.name?.simpleText || track.name?.runs?.[0]?.text || 'Unknown'
              }))
            }
          }
        } else {
          throw new Error('No captions found in player response')
        }
      } catch (innerTubeError) {
        console.warn('InnerTube transcript extraction failed:', innerTubeError)
        return {
          success: false,
          error: `InnerTube transcript extraction failed: ${innerTubeError}`
        }
      }
    }
    
    if (requestType === 'innertube_player' && videoId) {
      // Use InnerTube API with browser context for full player data
      try {
        const apiKeyMatch = document.documentElement.innerHTML.match(/"INNERTUBE_API_KEY":"([^"]+)"/)
        if (!apiKeyMatch) {
          throw new Error('INNERTUBE_API_KEY not found')
        }
        const apiKey = apiKeyMatch[1]
        
        const endpoint = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`
        
        const body = {
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20241217.01.00'
            }
          },
          videoId: videoId
        }
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Origin': 'https://www.youtube.com',
            'Referer': `https://www.youtube.com/watch?v=${videoId}`,
            'User-Agent': navigator.userAgent
          },
          credentials: 'include',
          body: JSON.stringify(body)
        })

        if (!response.ok) {
          throw new Error(`InnerTube API failed: ${response.status} ${response.statusText}`)
        }

        const playerData = await response.json()
        
        // Extract captions from player data
        const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks
        const videoDetails = playerData?.videoDetails
        
        if (videoDetails) {
          return {
            success: true,
            data: {
              videoId: videoDetails.videoId,
              title: videoDetails.title,
              author: videoDetails.author,
              duration: parseInt(videoDetails.lengthSeconds) || 0,
              viewCount: parseInt(videoDetails.viewCount) || 0,
              captions: captions ? captions.map((track: any) => ({
                languageCode: track.languageCode || 'unknown',
                baseUrl: track.baseUrl || '',
                name: track.name?.simpleText || track.name?.runs?.[0]?.text || 'Unknown'
              })) : [],
              thumbnails: videoDetails.thumbnail?.thumbnails || []
            }
          }
        }
      } catch (innerTubeError) {
        console.warn('InnerTube extraction failed, falling back to window objects:', innerTubeError)
        // Fall through to window objects extraction
      }
    }
    
    // Original window objects extraction
    const currentVideoId = videoId || new URLSearchParams(window.location.search).get('v')
    
    if (!currentVideoId) {
      return { success: false, error: 'No video ID found' }
    }

    const data: any = {
      videoId: currentVideoId,
      url: window.location.href
    }

    // Extract from ytInitialPlayerResponse
    const playerResponse = (window as any).ytInitialPlayerResponse
    if (playerResponse?.videoDetails) {
      const details = playerResponse.videoDetails
      data.title = details.title
      data.author = details.author
      data.duration = parseInt(details.lengthSeconds) || 0
      data.viewCount = parseInt(details.viewCount) || 0
      data.thumbnails = details.thumbnail?.thumbnails || []
      
      // Extract captions
      const captions = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks
      if (captions) {
        data.captions = captions.map((track: any) => ({
          languageCode: track.languageCode || 'unknown',
          baseUrl: track.baseUrl || '',
          name: track.name?.simpleText || track.name?.runs?.[0]?.text || 'Unknown'
        }))
      }
    }

    // Extract from ytInitialData  
    const initialData = (window as any).ytInitialData
    if (initialData) {
      try {
        const contents = initialData?.contents?.twoColumnWatchNextResults?.results?.results?.contents
        if (contents && Array.isArray(contents)) {
          const primaryInfo = contents.find((c: any) => c.videoPrimaryInfoRenderer)
          if (primaryInfo?.videoPrimaryInfoRenderer?.title?.runs?.[0]?.text) {
            data.title = data.title || primaryInfo.videoPrimaryInfoRenderer.title.runs[0].text
          }
        }
      } catch (error) {
        console.warn('Failed to extract from ytInitialData:', error)
      }
    }

    // Fallback: extract from DOM
    if (!data.title) {
      const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.title')
      if (titleElement) {
        data.title = titleElement.textContent?.trim()
      }
    }

    if (!data.author) {
      const authorElement = document.querySelector('ytd-channel-name a, .ytd-video-owner-renderer a')
      if (authorElement) {
        data.author = authorElement.textContent?.trim()
      }
    }

    return { success: true, data }
  } catch (error) {
    console.error('YouTube data extraction failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown extraction error' 
    }
  }
}

const handler: PlasmoMessaging.MessageHandler<
  ExtractYouTubeDataRequest,
  ExtractYouTubeDataResponse
> = async (req, res) => {
  try {
    // Get the active tab
    const tabs = await chrome.tabs.query({ 
      active: true, 
      currentWindow: true,
      url: "*://www.youtube.com/watch*"
    })

    if (tabs.length === 0) {
      return res.send({
        success: false,
        error: "No active YouTube tab found"
      })
    }

    const activeTab = tabs[0]
    if (!activeTab.id) {
      return res.send({
        success: false,
        error: "Active tab has no ID"
      })
    }

    // Check if chrome.scripting is available in background context
    if (!chrome.scripting) {
      return res.send({
        success: false,
        error: "chrome.scripting API not available"
      })
    }

    // Execute script to extract YouTube data directly on the page with browser context
    const results = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: extractYouTubeDataFromPage,
      args: [
        req.body?.videoId, 
        req.body?.requestType || 'window_objects',
        req.body?.language || 'en'
      ]
    })

    if (results && results[0]?.result) {
      const result = results[0].result
      if (result.success) {
        return res.send({
          success: true,
          data: result.data
        })
      } else {
        return res.send({
          success: false,
          error: result.error
        })
      }
    }

    return res.send({
      success: false,
      error: "Failed to execute extraction script"
    })
  } catch (error) {
    console.error('Background script extraction error:', error)
    return res.send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export default handler