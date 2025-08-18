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
      this.injectFluentFlowButtons()
      this.setupKeyboardShortcuts()
      
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
          // Re-inject buttons for new video
          setTimeout(() => {
            this.injectFluentFlowButtons()
          }, 1000) // Wait for YouTube to finish loading
        }
      }
    }, 1000)
  }

  private async injectFluentFlowButtons() {
    // Wait for YouTube player controls to load
    const waitForControls = () => {
      return new Promise<HTMLElement>((resolve) => {
        const checkForControls = () => {
          const controls = document.querySelector('.ytp-right-controls') as HTMLElement
          if (controls) {
            resolve(controls)
          } else {
            setTimeout(checkForControls, 100)
          }
        }
        checkForControls()
      })
    }

    try {
      const rightControls = await waitForControls()

      if (!document.getElementById('fluent-flow-styles')) {
        const style = document.createElement('style');
        style.id = 'fluent-flow-styles';
        style.textContent = `
          .ytp-right-controls {
            display: flex !important;
            align-items: center;
          }
        `;
        document.head.appendChild(style);
      }
      
      // Check if buttons already exist
      if (document.querySelector('.fluent-flow-controls')) {
        return
      }

      // Create FluentFlow button container
      const buttonContainer = document.createElement('div')
      buttonContainer.className = 'fluent-flow-controls'
      buttonContainer.style.cssText = `
        display: flex;
        align-items: center;
        margin-right: 8px;
      `

      // Create buttons
      const buttons = [
        {
          id: 'fluent-flow-loop',
          title: 'A/B Loop (Alt+L)',
          icon: this.getLoopIcon(),
          action: () => this.toggleLoopMode()
        },
        {
          id: 'fluent-flow-record',
          title: 'Voice Recording (Alt+R)', 
          icon: this.getRecordIcon(),
          action: () => this.toggleRecording()
        },
        {
          id: 'fluent-flow-compare',
          title: 'Audio Compare (Alt+C)',
          icon: this.getCompareIcon(), 
          action: () => this.startComparison()
        },
        {
          id: 'fluent-flow-panel',
          title: 'FluentFlow Panel (Alt+Shift+F)',
          icon: this.getPanelIcon(),
          action: () => this.openSidePanel()
        }
      ]

      buttons.forEach(buttonConfig => {
        const button = this.createYouTubeButton(buttonConfig)
        buttonContainer.appendChild(button)
      })

      // Insert before the settings button
      const settingsButton = rightControls.querySelector('.ytp-settings-button')
      if (settingsButton) {
        rightControls.insertBefore(buttonContainer, settingsButton)
      } else {
        rightControls.appendChild(buttonContainer)
      }

      console.log('FluentFlow buttons injected successfully')
    } catch (error) {
      console.error('Failed to inject FluentFlow buttons:', error)
    }
  }

  private createYouTubeButton(config: {id: string, title: string, icon: string, action: () => void}) {
    const button = document.createElement('button')
    button.className = 'ytp-button fluent-flow-button'
    button.id = config.id
    button.title = config.title
    button.setAttribute('data-tooltip-title', config.title)
    button.setAttribute('aria-label', config.title)
    
    button.style.cssText = `
      width: 48px;
      height: 48px;
      padding: 8px;
      margin: 0 2px;
      background: transparent;
      border: none;
      cursor: pointer;
      color: white;
      opacity: 0.9;
      transition: opacity 0.2s ease;
    `

    button.innerHTML = config.icon
    
    button.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      config.action()
    })

    button.addEventListener('mouseenter', () => {
      button.style.opacity = '1'
    })

    button.addEventListener('mouseleave', () => {
      button.style.opacity = '0.9'
    })

    return button
  }

  private getLoopIcon(): string {
    return `
      <svg height="24" width="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,5V1L7,6L12,11V7A6,6 0 0,1 18,13A6,6 0 0,1 12,19A6,6 0 0,1 6,13H4A8,8 0 0,0 12,21A8,8 0 0,0 20,13A8,8 0 0,0 12,5Z"/>
        <path d="M8,13V15H10V13H8M12,13V15H14V13H12M16,13V15H18V13H16Z"/>
      </svg>
    `
  }

  private getRecordIcon(): string {
    return `
      <svg height="24" width="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
      </svg>
    `
  }

  private getCompareIcon(): string {
    return `
      <svg height="24" width="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9,7H7V17H9V13H11V11H9V9H13V7H9M13,17H15V15H17V13H15V11H17V9H15V7H13V17Z"/>
      </svg>
    `
  }

  private getPanelIcon(): string {
    return `
      <svg height="24" width="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        <text x="8" y="16" font-family="Arial" font-size="8" fill="currentColor">FF</text>
      </svg>
    `
  }

  private setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Only handle shortcuts when not typing in input fields
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          (event.target as HTMLElement)?.isContentEditable) {
        return
      }

      // Detect macOS for future use (currently using Alt for cross-platform compatibility)
      const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0

      // Use Alt for primary shortcuts (cross-platform)
      if (event.altKey && !event.shiftKey) {
        switch (event.key.toLowerCase()) {
          case 'l':
            event.preventDefault()
            this.toggleLoopMode()
            break
          case 'r':
            event.preventDefault()
            this.toggleRecording()
            break
          case 'c':
            event.preventDefault()
            this.startComparison()
            break
        }
      }

      // Alt+Shift for panel toggle
      if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        this.openSidePanel()
      }
    })
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      switch (message.type) {
        case 'GET_VIDEO_INFO':
          sendResponse({ 
            success: true, 
            videoInfo: this.currentVideoInfo 
          })
          return true

        case 'TOGGLE_PANEL':
          this.openSidePanel()
          sendResponse({ success: true })
          return true

        default:
          return false
      }
    })
  }

  // Action methods
  private toggleLoopMode() {
    console.log('FluentFlow: Toggle Loop Mode')
    // TODO: Implement loop functionality
    this.showToast('Loop mode toggled')
  }

  private toggleRecording() {
    console.log('FluentFlow: Toggle Recording')
    // TODO: Implement recording functionality  
    this.showToast('Recording toggled')
  }

  private startComparison() {
    console.log('FluentFlow: Start Audio Comparison')
    // TODO: Implement comparison functionality
    this.showToast('Audio comparison started')
  }

  private openSidePanel() {
    console.log('FluentFlow: Open Side Panel')
    chrome.runtime.sendMessage({
      type: 'OPEN_SIDE_PANEL',
      videoInfo: this.currentVideoInfo
    })
  }

  private showToast(message: string) {
    // Create a simple toast notification
    const toast = document.createElement('div')
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 10000;
      animation: fadeInOut 2s ease-in-out;
    `
    
    toast.textContent = `FluentFlow: ${message}`
    
    // Add animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(100%); }
        20% { opacity: 1; transform: translateX(0); }
        80% { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(100%); }
      }
    `
    document.head.appendChild(style)
    
    document.body.appendChild(toast)
    
    setTimeout(() => {
      toast.remove()
      style.remove()
    }, 2000)
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