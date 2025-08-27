import type { PlasmoCSConfig } from 'plasmo'
// FluentFlow Content Script - Refactored using Separation of Concerns
// This file now acts as the entry point and delegates to the main orchestrator

import { FluentFlowOrchestrator } from './lib/content/main-orchestrator'

export const config: PlasmoCSConfig = {
  matches: ['https://www.youtube.com/watch*', 'https://youtube.com/watch*'],
  run_at: 'document_end'
}

class FluentFlowContentScript {
  private orchestrator: FluentFlowOrchestrator | null = null

  constructor() {
    console.log('FluentFlow: Content script starting...')
    this.initialize()
  }

  private initialize(): void {
    // Clean up any existing FluentFlow elements first
    const existingElements = document.querySelectorAll(
      '.fluent-flow-sidebar, .fluent-flow-sidebar-toggle, .fluent-flow-sidebar-youtube-toggle'
    )
    existingElements.forEach(element => element.remove())

    // Check if we're on a YouTube watch page
    if (this.isYouTubeWatchPage()) {
      this.orchestrator = new FluentFlowOrchestrator()
    } else {
      console.log('FluentFlow: Not on YouTube watch page, skipping initialization')
    }

    // Handle page navigation for YouTube SPA
    this.setupNavigationListener()
  }

  private isYouTubeWatchPage(): boolean {
    return window.location.hostname === 'www.youtube.com' && window.location.pathname === '/watch'
  }

  private setupNavigationListener(): void {
    let currentUrl = window.location.href

    const navigationObserver = setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href

        if (this.isYouTubeWatchPage()) {
          // Initialize orchestrator if not already running
          if (!this.orchestrator) {
            // // Clean up any existing elements before creating new ones
            // const existingElements = document.querySelectorAll(
            //   '.fluent-flow-sidebar, .fluent-flow-sidebar-toggle, .fluent-flow-sidebar-youtube-toggle'
            // )
            // existingElements.forEach(element => element.remove())

            setTimeout(() => {
              this.orchestrator = new FluentFlowOrchestrator()
            }, 1000) // Wait for YouTube to finish loading
          }
        } else {
          // // Clean up orchestrator if leaving watch page
          // if (this.orchestrator) {
          //   this.orchestrator.destroy()
          //   this.orchestrator = null
          // }
          // // Also clean up any remaining UI elements
          // const existingElements = document.querySelectorAll(
          //   '.fluent-flow-sidebar, .fluent-flow-sidebar-toggle, .fluent-flow-sidebar-youtube-toggle'
          // )
          // existingElements.forEach(element => element.remove())
        }
      }
    }, 1000)

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(navigationObserver)
      if (this.orchestrator) {
        this.orchestrator.destroy()
      }
      // // Final cleanup of UI elements
      // const existingElements = document.querySelectorAll(
      //   '.fluent-flow-sidebar, .fluent-flow-sidebar-toggle, .fluent-flow-sidebar-youtube-toggle'
      // )
      // existingElements.forEach(element => element.remove())
    })
  }
}

// Listen for messages from background/sidepanel for InnerTube API calls
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_INNERTUBE_DATA') {
    getInnerTubeData(message.videoId, message.language)
      .then(sendResponse)
      .catch(error => sendResponse({ success: false, error: error.message }))
    return true // Keep message channel open
  }
})

async function getInnerTubeData(videoId: string, _language: string = 'en') {
  try {
    console.log('Content script: Fetching InnerTube data for', videoId)
    
    // Extract API key from current page
    const apiKeyMatch = document.documentElement.innerHTML.match(/"INNERTUBE_API_KEY":"([^"]+)"/)
    if (!apiKeyMatch) {
      throw new Error('INNERTUBE_API_KEY not found')
    }
    const apiKey = apiKeyMatch[1]
    
    // Make request from content script context (same-origin)
    const response = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Origin': 'https://www.youtube.com',
        'Referer': window.location.href,
        'User-Agent': navigator.userAgent
      },
      credentials: 'include', // Include cookies automatically
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20241217.01.00'
          }
        },
        videoId: videoId
      })
    })

    if (!response.ok) {
      throw new Error(`InnerTube API failed: ${response.status} ${response.statusText}`)
    }

    const playerData = await response.json()
    console.log('Content script: InnerTube API success')
    
    // Extract captions
    const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks
    
    return {
      success: true,
      data: {
        videoId: playerData?.videoDetails?.videoId || videoId,
        captions: captions ? captions.map((track: any) => ({
          languageCode: track.languageCode || 'unknown',
          baseUrl: track.baseUrl || '',
          name: track.name?.simpleText || track.name?.runs?.[0]?.text || 'Unknown'
        })) : []
      }
    }
  } catch (error) {
    console.error('Content script InnerTube extraction failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Initialize when content script is loaded (handled by Plasmo)
new FluentFlowContentScript()
