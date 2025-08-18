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
  private youtubePlayer: any = null
  private loopState = {
    isActive: false,
    isLooping: false,
    startTime: null as number | null,
    endTime: null as number | null,
    mode: 'none' as 'none' | 'setting-start' | 'setting-end' | 'complete'
  }
  private loopInterval: NodeJS.Timeout | null = null
  private currentButtonStates = {
    loop: 'inactive',
    record: 'inactive',
    compare: 'inactive',
    panel: 'inactive'
  }
  private progressBar: HTMLElement | null = null
  private videoDuration: number = 0

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
      this.setupYouTubePlayerIntegration()
      this.setupProgressBarIntegration()
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
          this.resetLoopState()
          this.updateVideoInfo()
          // Re-inject buttons for new video
          setTimeout(() => {
            this.setupYouTubePlayerIntegration()
            this.setupProgressBarIntegration()
            this.injectFluentFlowButtons()
          }, 1000) // Wait for YouTube to finish loading
        }
      }
    }, 1000)
  }

  private setupYouTubePlayerIntegration() {
    // Get YouTube player instance
    const waitForPlayer = () => {
      return new Promise<any>((resolve) => {
        const checkForPlayer = () => {
          // Try multiple ways to get the player
          const player = (window as any).yt?.player?.getPlayerByElement?.(document.querySelector('#movie_player')) ||
                        document.querySelector('#movie_player') ||
                        document.querySelector('.html5-video-player')
          
          if (player && player.getCurrentTime) {
            resolve(player)
          } else if (player) {
            // If we have the element but not the API, try to get the video element
            const video = player.querySelector('video')
            if (video) {
              resolve(video)
            } else {
              setTimeout(checkForPlayer, 100)
            }
          } else {
            setTimeout(checkForPlayer, 100)
          }
        }
        checkForPlayer()
      })
    }

    waitForPlayer().then(player => {
      this.youtubePlayer = player
      console.log('FluentFlow: YouTube player connected')
      this.startLoopMonitoring()
    }).catch(error => {
      console.error('FluentFlow: Failed to connect to YouTube player', error)
    })
  }

  private startLoopMonitoring() {
    if (this.loopInterval) {
      clearInterval(this.loopInterval)
    }

    this.loopInterval = setInterval(() => {
      if (this.loopState.isLooping && this.loopState.startTime !== null && this.loopState.endTime !== null) {
        const currentTime = this.getCurrentTime()
        if (currentTime !== null && currentTime >= this.loopState.endTime) {
          this.seekTo(this.loopState.startTime)
        }
      }
    }, 100) // Check every 100ms for precise looping
  }

  private getCurrentTime(): number | null {
    try {
      if (this.youtubePlayer) {
        if (typeof this.youtubePlayer.getCurrentTime === 'function') {
          // YouTube API player
          return this.youtubePlayer.getCurrentTime()
        } else if (this.youtubePlayer.currentTime !== undefined) {
          // HTML5 video element
          return this.youtubePlayer.currentTime
        }
      }
      
      // Fallback: try to find video element directly
      const video = document.querySelector('video')
      if (video) {
        return video.currentTime
      }
    } catch (error) {
      console.warn('FluentFlow: Error getting current time', error)
    }
    return null
  }

  private seekTo(time: number): boolean {
    try {
      if (this.youtubePlayer) {
        if (typeof this.youtubePlayer.seekTo === 'function') {
          // YouTube API player
          this.youtubePlayer.seekTo(time, true)
          return true
        } else if (this.youtubePlayer.currentTime !== undefined) {
          // HTML5 video element
          this.youtubePlayer.currentTime = time
          return true
        }
      }
      
      // Fallback: try to find video element directly
      const video = document.querySelector('video')
      if (video) {
        video.currentTime = time
        return true
      }
    } catch (error) {
      console.warn('FluentFlow: Error seeking to time', error)
    }
    return false
  }

  private isPlaying(): boolean {
    try {
      if (this.youtubePlayer) {
        if (typeof this.youtubePlayer.getPlayerState === 'function') {
          // YouTube API player (1 = playing)
          return this.youtubePlayer.getPlayerState() === 1
        } else if (this.youtubePlayer.paused !== undefined) {
          // HTML5 video element
          return !this.youtubePlayer.paused
        }
      }
      
      // Fallback: try to find video element directly
      const video = document.querySelector('video')
      if (video) {
        return !video.paused
      }
    } catch (error) {
      console.warn('FluentFlow: Error checking play state', error)
    }
    return false
  }

  private setupProgressBarIntegration() {
    const waitForProgressBar = () => {
      return new Promise<HTMLElement>((resolve) => {
        const checkForProgressBar = () => {
          const progressBar = document.querySelector('.ytp-progress-bar') as HTMLElement
          if (progressBar) {
            resolve(progressBar)
          } else {
            setTimeout(checkForProgressBar, 100)
          }
        }
        checkForProgressBar()
      })
    }

    waitForProgressBar().then(progressBar => {
      this.progressBar = progressBar
      console.log('FluentFlow: Progress bar connected')
      this.getVideoDuration()
      this.injectProgressMarkers()
      this.setupProgressBarClickHandler()
    }).catch(error => {
      console.error('FluentFlow: Failed to connect to progress bar', error)
    })
  }

  private getVideoDuration(): number {
    try {
      if (this.youtubePlayer) {
        if (typeof this.youtubePlayer.getDuration === 'function') {
          // YouTube API player
          this.videoDuration = this.youtubePlayer.getDuration()
          return this.videoDuration
        } else if (this.youtubePlayer.duration !== undefined) {
          // HTML5 video element
          this.videoDuration = this.youtubePlayer.duration
          return this.videoDuration
        }
      }
      
      // Fallback: try to find video element directly
      const video = document.querySelector('video')
      if (video && video.duration) {
        this.videoDuration = video.duration
        return this.videoDuration
      }
    } catch (error) {
      console.warn('FluentFlow: Error getting video duration', error)
    }
    
    // Try to get from progress bar attributes
    const progressBar = document.querySelector('.ytp-progress-bar')
    if (progressBar) {
      const max = progressBar.getAttribute('aria-valuemax')
      if (max) {
        this.videoDuration = parseInt(max)
        return this.videoDuration
      }
    }
    
    return 0
  }

  private injectProgressMarkers() {
    if (!this.progressBar) return

    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.fluent-flow-marker')
    existingMarkers.forEach(marker => marker.remove())

    // Create container for markers
    let markerContainer = document.querySelector('.fluent-flow-markers') as HTMLElement
    if (!markerContainer) {
      markerContainer = document.createElement('div')
      markerContainer.className = 'fluent-flow-markers'
      markerContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10;
      `
      this.progressBar.appendChild(markerContainer)
    }

    this.updateProgressMarkers()
  }

  private updateProgressMarkers() {
    const markerContainer = document.querySelector('.fluent-flow-markers')
    if (!markerContainer) return

    // Clear existing markers
    markerContainer.innerHTML = ''

    const duration = this.getVideoDuration()
    if (duration <= 0) return

    // Create start marker
    if (this.loopState.startTime !== null) {
      const startMarker = this.createProgressMarker('start', this.loopState.startTime, duration)
      markerContainer.appendChild(startMarker)
    }

    // Create end marker
    if (this.loopState.endTime !== null) {
      const endMarker = this.createProgressMarker('end', this.loopState.endTime, duration)
      markerContainer.appendChild(endMarker)
    }

    // Create loop region highlight
    if (this.loopState.startTime !== null && this.loopState.endTime !== null) {
      const loopRegion = this.createLoopRegion(this.loopState.startTime, this.loopState.endTime, duration)
      markerContainer.appendChild(loopRegion)
    }
  }

  private createProgressMarker(type: 'start' | 'end', time: number, duration: number): HTMLElement {
    const marker = document.createElement('div')
    marker.className = `fluent-flow-marker fluent-flow-marker-${type}`
    
    const percentage = (time / duration) * 100
    const color = type === 'start' ? '#22c55e' : '#ef4444' // Green for start, red for end
    const label = type === 'start' ? 'START' : 'END'
    
    // Create tooltip-style marker
    marker.style.cssText = `
      position: absolute;
      left: ${percentage}%;
      bottom: 120%;
      transform: translateX(-50%);
      background: ${color};
      color: white;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: bold;
      white-space: nowrap;
      cursor: pointer;
      pointer-events: auto;
      z-index: 15;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      transition: all 0.2s ease;
      user-select: none;
    `

    // Add content with time
    marker.innerHTML = `
      <div style="text-align: center;">
        <div>${label}</div>
        <div style="font-size: 10px; opacity: 0.9;">${this.formatTime(time)}</div>
      </div>
    `

    // Add arrow pointing down
    const arrow = document.createElement('div')
    arrow.style.cssText = `
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid ${color};
    `
    marker.appendChild(arrow)

    // Add hover effect
    marker.addEventListener('mouseenter', () => {
      marker.style.transform = 'translateX(-50%) scale(1.1)'
      marker.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)'
    })

    marker.addEventListener('mouseleave', () => {
      marker.style.transform = 'translateX(-50%) scale(1)'
      marker.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)'
    })

    // Add click to seek
    marker.addEventListener('click', (e) => {
      e.stopPropagation()
      this.seekTo(time)
      this.showToast(`Jumped to ${type}: ${this.formatTime(time)}`)
    })

    // Add vertical line connecting to progress bar
    const line = document.createElement('div')
    line.style.cssText = `
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      width: 2px;
      height: 20px;
      background: ${color};
      opacity: 0.7;
    `
    marker.appendChild(line)

    return marker
  }

  private createLoopRegion(startTime: number, endTime: number, duration: number): HTMLElement {
    const region = document.createElement('div')
    region.className = 'fluent-flow-loop-region'
    
    const startPercent = (startTime / duration) * 100
    const endPercent = (endTime / duration) * 100
    const width = endPercent - startPercent
    
    region.style.cssText = `
      position: absolute;
      left: ${startPercent}%;
      top: 0;
      width: ${width}%;
      height: 100%;
      background: rgba(34, 197, 94, 0.2);
      border: 1px solid rgba(34, 197, 94, 0.5);
      pointer-events: none;
      z-index: 5;
    `

    return region
  }

  private setupProgressBarClickHandler() {
    if (!this.progressBar) return

    this.progressBar.addEventListener('click', (e) => {
      // Only handle clicks when in setting mode
      if (this.loopState.mode === 'setting-start' || this.loopState.mode === 'setting-end') {
        e.stopPropagation()
        
        const rect = this.progressBar!.getBoundingClientRect()
        const clickX = e.clientX - rect.left
        const percentage = clickX / rect.width
        const duration = this.getVideoDuration()
        const clickTime = percentage * duration

        if (this.loopState.mode === 'setting-start') {
          this.setLoopTimeDirectly('start', clickTime)
        } else if (this.loopState.mode === 'setting-end') {
          this.setLoopTimeDirectly('end', clickTime)
        }
      }
    })
  }

  private setLoopTimeDirectly(type: 'start' | 'end', time: number) {
    if (type === 'start') {
      if (this.loopState.endTime && time >= this.loopState.endTime) {
        this.showToast('Start time cannot be after end time')
        return
      }
      this.loopState.startTime = time
      this.showToast(`Loop start set: ${this.formatTime(time)}`)
    } else {
      if (this.loopState.startTime && time <= this.loopState.startTime) {
        this.showToast('End time cannot be before start time')
        return
      }
      this.loopState.endTime = time
      this.showToast(`Loop end set: ${this.formatTime(time)}`)
    }

    // Update state machine
    if (this.loopState.startTime !== null && this.loopState.endTime !== null) {
      this.loopState.mode = 'complete'
      this.loopState.isLooping = true
      this.loopState.isActive = true
      this.currentButtonStates.loop = 'active'
      this.updateButtonState('fluent-flow-loop', 'active')
    }

    this.updateProgressMarkers()
    this.updateLoopButton()
  }

  private resetLoopState() {
    this.loopState = {
      isActive: false,
      isLooping: false,
      startTime: null,
      endTime: null,
      mode: 'none'
    }
    if (this.loopInterval) {
      clearInterval(this.loopInterval)
      this.loopInterval = null
    }
    this.updateProgressMarkers()
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
        // Loop control group
        {
          id: 'fluent-flow-loop-start',
          title: 'Set Loop Start (Alt+Shift+1)',
          icon: this.getLoopStartIcon(),
          action: () => this.setLoopStart(),
          group: 'loop'
        },
        {
          id: 'fluent-flow-loop-toggle',
          title: 'Play/Pause Loop (Alt+L)',
          icon: this.getLoopPlayIcon(),
          action: () => this.toggleLoopPlayback(),
          group: 'loop'
        },
        {
          id: 'fluent-flow-loop-end',
          title: 'Set Loop End (Alt+Shift+2)',
          icon: this.getLoopEndIcon(),
          action: () => this.setLoopEnd(),
          group: 'loop'
        },
        // Other controls
        {
          id: 'fluent-flow-record',
          title: 'Voice Recording (Alt+R)', 
          icon: this.getRecordIcon(),
          action: () => this.toggleRecording(),
          group: 'other'
        },
        {
          id: 'fluent-flow-compare',
          title: 'Audio Compare (Alt+C)',
          icon: this.getCompareIcon(), 
          action: () => this.startComparison(),
          group: 'other'
        },
        {
          id: 'fluent-flow-panel',
          title: 'FluentFlow Panel (Alt+Shift+F)',
          icon: this.getPanelIcon(),
          action: () => this.openSidePanel(),
          group: 'other'
        }
      ]

      // Group buttons by type
      let currentGroup = ''
      buttons.forEach((buttonConfig, index) => {
        // Add separator between groups
        if (buttonConfig.group !== currentGroup && index > 0) {
          const separator = document.createElement('div')
          separator.style.cssText = `
            width: 1px;
            height: 20px;
            background: rgba(255, 255, 255, 0.3);
            margin: 0 4px;
          `
          buttonContainer.appendChild(separator)
        }
        currentGroup = buttonConfig.group
        
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
      const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
      console.log("isMac1", isMac)
      console.log('FluentFlow buttons injected successfully')
    } catch (error) {
      console.error('Failed to inject FluentFlow buttons:', error)
    }
  }

  private createYouTubeButton(config: {id: string, title: string, icon: string, action: () => void, rightClick?: () => void, group?: string}) {
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

    if (config.rightClick) {
      button.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        e.stopPropagation()
        config.rightClick!()
      })
    }

    button.addEventListener('mouseenter', () => {
      button.style.opacity = '1'
    })

    button.addEventListener('mouseleave', () => {
      button.style.opacity = '0.9'
    })

    return button
  }

  private getLoopStartIcon(): string {
    return `
      <svg height="20" width="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4,6V18H6V6H4M8,6V18L18,12L8,6Z"/>
      </svg>
    `
  }

  private getLoopPlayIcon(): string {
    return `
      <svg height="20" width="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,5V1L7,6L12,11V7A6,6 0 0,1 18,13A6,6 0 0,1 12,19A6,6 0 0,1 6,13H4A8,8 0 0,0 12,21A8,8 0 0,0 20,13A8,8 0 0,0 12,5Z"/>
      </svg>
    `
  }

  private getLoopEndIcon(): string {
    return `
      <svg height="20" width="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6,6V18L16,12L6,6M18,6V18H20V6H18Z"/>
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

      // Detect macOS and use appropriate modifier keys
      const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
      const useOptionKey = isMac ? event.altKey : event.altKey
      const useCommandKey = isMac ? event.metaKey : event.ctrlKey

      // Primary shortcuts: Option+Key on macOS, Alt+Key on Windows/Linux
      if (useOptionKey && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          case 'l':
            event.preventDefault()
            event.stopPropagation()
            this.toggleLoopMode()
            break
          case 'r':
            event.preventDefault()
            event.stopPropagation()
            this.toggleRecording()
            break
          case 'c':
            event.preventDefault()
            event.stopPropagation()
            this.startComparison()
            break
        }
      }

      // Panel toggle: Option+Shift+F on macOS, Alt+Shift+F on Windows/Linux
      if (useOptionKey && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        event.stopPropagation()
        this.openSidePanel()
      }

      // Additional macOS-specific shortcuts using Command key
      if (isMac && useCommandKey && event.shiftKey) {
        switch (event.key.toLowerCase()) {
          case 'l':
            event.preventDefault()
            event.stopPropagation()
            this.toggleLoopMode()
            break
          case 'r':
            event.preventDefault()
            event.stopPropagation()
            this.toggleRecording()
            break
        }
      }

      // Loop-specific shortcuts
      if (useOptionKey && event.shiftKey) {
        switch (event.key.toLowerCase()) {
          case '1':
            event.preventDefault()
            event.stopPropagation()
            this.setLoopStart()
            break
          case '2':
            event.preventDefault()
            event.stopPropagation()
            this.setLoopEnd()
            break
          case 'x':
            event.preventDefault()
            event.stopPropagation()
            this.clearLoop()
            break
        }
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
    const currentTime = this.getCurrentTime()
    if (currentTime === null) {
      this.showToast('Cannot access video player')
      return
    }

    switch (this.loopState.mode) {
      case 'none':
        // Enter setting mode - user can click on progress bar or use current time
        this.loopState.mode = 'setting-start'
        this.loopState.isActive = true
        this.currentButtonStates.loop = 'setting'
        this.updateButtonState('fluent-flow-loop', 'setting')
        this.showToast('Click on progress bar to set loop start, or click button to use current time')
        break

      case 'setting-start':
        // Set start point at current time and move to setting end
        this.loopState.startTime = currentTime
        this.loopState.mode = 'setting-end'
        this.currentButtonStates.loop = 'setting'
        this.updateButtonState('fluent-flow-loop', 'setting')
        this.updateProgressMarkers()
        this.showToast(`Loop start set: ${this.formatTime(currentTime)}. Now set end point.`)
        break

      case 'setting-end':
        // Set end point and complete loop setup
        if (currentTime <= this.loopState.startTime!) {
          this.showToast('End time must be after start time')
          return
        }
        this.loopState.endTime = currentTime
        this.loopState.mode = 'complete'
        this.loopState.isLooping = true
        this.currentButtonStates.loop = 'active'
        this.updateButtonState('fluent-flow-loop', 'active')
        this.updateProgressMarkers()
        this.showToast(`Loop activated: ${this.formatTime(this.loopState.startTime!)} - ${this.formatTime(currentTime)}`)
        break

      case 'complete':
        // Toggle loop on/off
        this.loopState.isLooping = !this.loopState.isLooping
        this.currentButtonStates.loop = this.loopState.isLooping ? 'active' : 'paused'
        this.updateButtonState('fluent-flow-loop', this.loopState.isLooping ? 'active' : 'paused')
        this.showToast(this.loopState.isLooping ? 'Loop resumed' : 'Loop paused')
        break
    }

    this.updateLoopButton()
  }

  private setLoopStart() {
    const currentTime = this.getCurrentTime()
    if (currentTime === null) {
      this.showToast('Cannot access video player')
      return
    }

    if (this.loopState.endTime && currentTime >= this.loopState.endTime) {
      this.showToast('Start time cannot be after end time')
      return
    }

    this.loopState.startTime = currentTime
    this.loopState.isActive = true
    
    if (this.loopState.endTime) {
      this.loopState.mode = 'complete'
      this.loopState.isLooping = true
      this.currentButtonStates.loop = 'active'
      this.updateButtonState('fluent-flow-loop', 'active')
    } else {
      this.loopState.mode = 'setting-end'
      this.currentButtonStates.loop = 'setting-start'
      this.updateButtonState('fluent-flow-loop', 'setting')
    }

    this.updateLoopButton()
    this.updateProgressMarkers()
    this.showToast(`Loop start: ${this.formatTime(currentTime)}`)
  }

  private setLoopEnd() {
    const currentTime = this.getCurrentTime()
    if (currentTime === null) {
      this.showToast('Cannot access video player')
      return
    }

    if (this.loopState.startTime && currentTime <= this.loopState.startTime) {
      this.showToast('End time cannot be before start time')
      return
    }

    this.loopState.endTime = currentTime
    this.loopState.isActive = true
    
    if (this.loopState.startTime) {
      this.loopState.mode = 'complete'
      this.loopState.isLooping = true
      this.currentButtonStates.loop = 'active'
      this.updateButtonState('fluent-flow-loop', 'active')
    } else {
      this.loopState.mode = 'setting-start'
      this.currentButtonStates.loop = 'setting'
      this.updateButtonState('fluent-flow-loop', 'setting')
    }

    this.updateLoopButton()
    this.updateProgressMarkers()
    this.showToast(`Loop end: ${this.formatTime(currentTime)}`)
  }

  private clearLoop() {
    this.resetLoopState()
    this.currentButtonStates.loop = 'inactive'
    this.updateButtonState('fluent-flow-loop', 'inactive')
    this.updateLoopButton()
    this.showToast('Loop cleared')
  }

  private updateLoopButton() {
    const button = document.getElementById('fluent-flow-loop')
    if (!button) return

    let tooltip = 'A/B Loop'

    switch (this.loopState.mode) {
      case 'none':
        tooltip = 'Click to start setting loop points'
        break
      case 'setting-start':
        tooltip = 'Setting loop start - Click button for current time or click progress bar'
        break
      case 'setting-end':
        tooltip = `Start: ${this.formatTime(this.loopState.startTime)} | Setting end - Click button for current time or click progress bar`
        break
      case 'complete':
        const status = this.loopState.isLooping ? 'Active' : 'Paused'
        tooltip = `Loop ${status}: ${this.formatTime(this.loopState.startTime)} - ${this.formatTime(this.loopState.endTime)} | Click to ${this.loopState.isLooping ? 'pause' : 'resume'}`
        break
    }

    button.title = tooltip
    button.setAttribute('data-tooltip-title', tooltip)
    button.setAttribute('aria-label', tooltip)
  }

  private updateButtonState(buttonId: string, state: 'inactive' | 'active' | 'setting' | 'paused') {
    const button = document.getElementById(buttonId)
    if (!button) return

    // Remove all state classes
    button.classList.remove('ff-inactive', 'ff-active', 'ff-setting', 'ff-paused')
    
    // Add new state class
    button.classList.add(`ff-${state}`)

    // Update button appearance based on state
    let backgroundColor = 'transparent'
    let opacity = '0.9'

    switch (state) {
      case 'active':
        backgroundColor = 'rgba(34, 197, 94, 0.2)' // Green background
        opacity = '1'
        break
      case 'setting':
        backgroundColor = 'rgba(251, 191, 36, 0.2)' // Yellow background  
        opacity = '1'
        break
      case 'paused':
        backgroundColor = 'rgba(239, 68, 68, 0.2)' // Red background
        opacity = '1'
        break
      case 'inactive':
      default:
        backgroundColor = 'transparent'
        opacity = '0.9'
        break
    }

    (button as HTMLElement).style.backgroundColor = backgroundColor;
    (button as HTMLElement).style.opacity = opacity
  }

  private formatTime(seconds: number | null): string {
    if (seconds === null) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
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

  private showLoopContextMenu() {
    // Remove existing context menu
    const existingMenu = document.getElementById('fluent-flow-context-menu')
    if (existingMenu) {
      existingMenu.remove()
    }

    const menu = document.createElement('div')
    menu.id = 'fluent-flow-context-menu'
    menu.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 8px;
      z-index: 10001;
      font-family: Arial, sans-serif;
      font-size: 14px;
      color: white;
      min-width: 200px;
    `

    const menuItems = [
      { text: 'Set Loop Start (Alt+Shift+1)', action: () => this.setLoopStart() },
      { text: 'Set Loop End (Alt+Shift+2)', action: () => this.setLoopEnd() },
      { text: 'Clear Loop (Alt+Shift+X)', action: () => this.clearLoop() },
      { text: '─────────────────', action: null },
      { 
        text: `Current: ${this.formatTime(this.getCurrentTime())}`, 
        action: null,
        disabled: true 
      }
    ]

    if (this.loopState.mode !== 'none') {
      menuItems.splice(-2, 0, {
        text: `Start: ${this.formatTime(this.loopState.startTime)}`,
        action: () => this.seekTo(this.loopState.startTime!),
        disabled: this.loopState.startTime === null
      })
      
      if (this.loopState.endTime !== null) {
        menuItems.splice(-2, 0, {
          text: `End: ${this.formatTime(this.loopState.endTime)}`,
          action: () => this.seekTo(this.loopState.endTime!),
          disabled: false
        })
      }
    }

    menuItems.forEach(item => {
      if (item.text === '─────────────────') {
        const separator = document.createElement('div')
        separator.style.cssText = `
          height: 1px;
          background: rgba(255, 255, 255, 0.2);
          margin: 4px 0;
        `
        menu.appendChild(separator)
        return
      }

      const menuItem = document.createElement('div')
      menuItem.style.cssText = `
        padding: 8px 12px;
        cursor: ${item.action && !item.disabled ? 'pointer' : 'default'};
        border-radius: 4px;
        transition: background 0.2s;
        opacity: ${item.disabled ? '0.6' : '1'};
      `
      
      menuItem.textContent = item.text
      
      if (item.action && !item.disabled) {
        menuItem.addEventListener('mouseenter', () => {
          menuItem.style.background = 'rgba(255, 255, 255, 0.1)'
        })
        
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.background = 'transparent'
        })
        
        menuItem.addEventListener('click', () => {
          item.action!()
          menu.remove()
        })
      }
      
      menu.appendChild(menuItem)
    })

    document.body.appendChild(menu)

    // Close menu when clicking outside
    const closeMenu = (e: Event) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove()
        document.removeEventListener('click', closeMenu)
        document.removeEventListener('keydown', closeMenuOnEscape)
      }
    }

    const closeMenuOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        menu.remove()
        document.removeEventListener('click', closeMenu)
        document.removeEventListener('keydown', closeMenuOnEscape)
      }
    }

    setTimeout(() => {
      document.addEventListener('click', closeMenu)
      document.addEventListener('keydown', closeMenuOnEscape)
    }, 100)
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