import type { PlasmoCSConfig } from "plasmo"
import type {
  YouTubeVideoInfo
} from './lib/types/fluent-flow-types'

export const config: PlasmoCSConfig = {
  matches: [
    "https://www.youtube.com/watch*",
    "https://youtube.com/watch*"
  ],
  run_at: "document_end"
}

class FluentFlowContentScript {
  private isInitialized = false
  private currentVideoInfo: YouTubeVideoInfo | null = null
  private loopState = {
    isActive: false,
    isLooping: false,
    startTime: null as number | null,
    endTime: null as number | null
  }

  constructor() {
    this.init()
  }

  private async init() {
    if (this.isInitialized) return
    
    // Only run on YouTube watch pages
    if (!this.isYouTubeWatchPage()) return

    try {
      this.setupMessageListener()
      this.setupVideoInfoDetection()
      
      this.isInitialized = true
      console.log('FluentFlow content script initialized')
    } catch (error) {
      console.error('Failed to initialize FluentFlow:', error)
    }
  }

  private isYouTubeWatchPage(): boolean {
    return window.location.hostname === 'www.youtube.com' && 
           window.location.pathname === '/watch'
  }

  private setupVideoInfoDetection() {
    // Extract video info from current page
    this.updateVideoInfo()
    
    // Monitor for navigation changes
    this.setupNavigationMonitoring()
  }

  private updateVideoInfo() {
    const videoId = new URLSearchParams(window.location.search).get('v')
    if (!videoId) return

    // Get video title from page
    const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string') || 
                        document.querySelector('h1.title')
    const title = titleElement?.textContent || 'Unknown Video'

    this.currentVideoInfo = {
      videoId,
      title,
      duration: 0, // Will be updated when player is available
      url: window.location.href
    } as any

    console.log('FluentFlow detected video:', this.currentVideoInfo)
  }

  private setupNavigationMonitoring() {
    // YouTube is a SPA, so we need to monitor for navigation
    let currentUrl = window.location.href
    setInterval(() => {
      if (currentUrl !== window.location.href) {
        currentUrl = window.location.href
        if (this.isYouTubeWatchPage()) {
          this.updateVideoInfo()
        }
      }
    }, 1000)
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'GET_VIDEO_INFO':
          sendResponse({ 
            success: true, 
            videoInfo: this.currentVideoInfo 
          })
          return true

        case 'TOGGLE_PANEL':
          // Send message to background to open sidepanel
          chrome.runtime.sendMessage({
            type: 'OPEN_SIDE_PANEL',
            videoInfo: this.currentVideoInfo
          })
          sendResponse({ success: true })
          return true

        default:
          return false
      }
    })
  }

}

// Initialize FluentFlow when ready
function initializeFluentFlow() {
  // Check if we're on a YouTube watch page
  if (window.location.hostname === 'www.youtube.com' && 
      window.location.pathname === '/watch') {
    
    new FluentFlowContentScript()
  }
}

// Initialize immediately if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFluentFlow)
} else {
  initializeFluentFlow()
}