import type { PlasmoContentScript } from "plasmo"
import { YouTubeService } from './lib/services/youtube-service'
import { RecordingService } from './lib/services/recording-service'
import { AudioComparisonService } from './lib/services/audio-comparison-service'
import { useFluentFlowStore } from './lib/stores/fluent-flow-store'
import type {
  FluentFlowMessage,
  YouTubeVideoInfo,
  LoopSegment,
  AudioRecording,
  FluentFlowError
} from './lib/types/fluent-flow-types'

export const config: PlasmoContentScript = {
  matches: [
    "https://www.youtube.com/watch*",
    "https://youtube.com/watch*"
  ],
  run_at: "document_end"
}

class FluentFlowContentScript {
  private youtubeService: YouTubeService
  private recordingService: RecordingService
  private comparisonService: AudioComparisonService
  private isInitialized = false
  private panelContainer: HTMLElement | null = null
  private loopInterval: NodeJS.Timeout | null = null

  constructor() {
    this.youtubeService = new YouTubeService()
    
    // Initialize services after store is ready
    this.initializeServices()
  }

  private async initializeServices() {
    try {
      // Wait for the store to be available
      const settings = useFluentFlowStore.getState().settings
      
      this.recordingService = new RecordingService(settings)
      this.comparisonService = new AudioComparisonService(this.youtubeService)
      
      await this.init()
    } catch (error) {
      console.error('Failed to initialize FluentFlow services:', error)
    }
  }

  private async init() {
    if (this.isInitialized) return
    
    // Only run on YouTube watch pages
    if (!this.isYouTubeWatchPage()) return

    try {
      await this.setupYouTubeIntegration()
      this.setupMessageListener()
      this.setupKeyboardShortcuts()
      this.injectFluentFlowUI()
      this.setupStoreSubscription()
      
      this.isInitialized = true
      console.log('FluentFlow initialized successfully')
    } catch (error) {
      console.error('Failed to initialize FluentFlow:', error)
    }
  }

  private isYouTubeWatchPage(): boolean {
    return window.location.hostname === 'www.youtube.com' && 
           window.location.pathname === '/watch'
  }

  private async setupYouTubeIntegration() {
    // Wait for YouTube player to be ready
    await this.youtubeService.waitForAPI()
    await this.youtubeService.initializePlayer()
    
    // Get current video info and initialize store
    const videoInfo = this.youtubeService.getCurrentVideoInfo()
    if (videoInfo) {
      useFluentFlowStore.getState().initializePlayer(videoInfo)
      await useFluentFlowStore.getState().loadSession(videoInfo.videoId)
    }

    // Set up player state monitoring
    this.startPlayerStateMonitoring()
  }

  private startPlayerStateMonitoring() {
    setInterval(async () => {
      try {
        const playerState = await this.youtubeService.getPlayerState()
        useFluentFlowStore.getState().updatePlayerState(playerState)
        
        // Handle loop functionality
        const { loopState } = useFluentFlowStore.getState()
        if (loopState.isActive && loopState.isLooping && playerState.isPlaying) {
          this.handleLoopPlayback(playerState.currentTime, loopState)
        }
      } catch (error) {
        console.warn('Error monitoring player state:', error)
      }
    }, 250) // Check every 250ms
  }

  private handleLoopPlayback(currentTime: number, loopState: any) {
    if (loopState.endTime && currentTime >= loopState.endTime) {
      this.youtubeService.seekTo(loopState.startTime || 0)
    }
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message: FluentFlowMessage, sender, sendResponse) => {
      switch (message.type) {
        case 'INIT_PLAYER':
          this.handleInitPlayer(sendResponse)
          return true

        case 'SET_LOOP_SEGMENT':
          this.handleSetLoopSegment(message.payload, sendResponse)
          return true

        case 'START_RECORDING':
          this.handleStartRecording(sendResponse)
          return true

        case 'STOP_RECORDING':
          this.handleStopRecording(sendResponse)
          return true

        case 'COMPARE_AUDIO':
          this.handleCompareAudio(message.payload, sendResponse)
          return true

        case 'TOGGLE_PANEL':
          this.handleTogglePanel(sendResponse)
          return true

        default:
          return false
      }
    })
  }

  private setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      const { settings } = useFluentFlowStore.getState()
      
      // Toggle Loop (Alt+L)
      if (event.altKey && event.key.toLowerCase() === 'l') {
        event.preventDefault()
        this.toggleLoopMode()
      }

      // Toggle Recording (Alt+R)
      if (event.altKey && event.key.toLowerCase() === 'r') {
        event.preventDefault()
        this.toggleRecording()
      }

      // Compare Audio (Alt+C)
      if (event.altKey && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        this.startAudioComparison()
      }

      // Toggle Panel (Alt+Shift+F)
      if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        useFluentFlowStore.getState().togglePanel()
      }

      // Set Loop Start (Alt+1)
      if (event.altKey && event.key === '1') {
        event.preventDefault()
        this.setLoopStart()
      }

      // Set Loop End (Alt+2)
      if (event.altKey && event.key === '2') {
        event.preventDefault()
        this.setLoopEnd()
      }

      // Play/Pause (Alt+Space)
      if (event.altKey && event.code === 'Space') {
        event.preventDefault()
        this.togglePlayPause()
      }
    })
  }

  private async injectFluentFlowUI() {
    // Find YouTube player container
    const playerContainer = document.querySelector('#movie_player') || 
                           document.querySelector('.html5-video-player')
    
    if (!playerContainer) {
      console.warn('Could not find YouTube player container')
      return
    }

    // Create FluentFlow panel container
    this.panelContainer = document.createElement('div')
    this.panelContainer.id = 'fluent-flow-panel'
    this.panelContainer.className = 'fluent-flow-panel'
    
    // Add styles
    this.injectStyles()
    
    // Position panel
    this.updatePanelPosition()
    
    // Insert into page
    document.body.appendChild(this.panelContainer)
    
    // Create React mount point for the panel
    this.createReactMountPoint()
  }

  private injectStyles() {
    const style = document.createElement('style')
    style.id = 'fluent-flow-styles'
    style.textContent = `
      .fluent-flow-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 320px;
        min-height: 200px;
        background: rgba(0, 0, 0, 0.9);
        border-radius: 12px;
        padding: 16px;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 9999;
        display: none;
        animation: fadeIn 0.3s ease;
      }

      .fluent-flow-panel.visible {
        display: block;
      }

      .fluent-flow-panel.expanded {
        width: 400px;
        min-height: 300px;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .fluent-flow-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .fluent-flow-title {
        font-size: 16px;
        font-weight: 600;
        color: #60a5fa;
      }

      .fluent-flow-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
      }

      .fluent-flow-tab {
        padding: 6px 12px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s ease;
      }

      .fluent-flow-tab.active {
        background: #3b82f6;
      }

      .fluent-flow-tab:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .fluent-flow-content {
        min-height: 120px;
      }

      .fluent-flow-button {
        background: #3b82f6;
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
        margin: 4px;
      }

      .fluent-flow-button:hover {
        background: #2563eb;
      }

      .fluent-flow-button.recording {
        background: #ef4444;
      }

      .fluent-flow-button.recording:hover {
        background: #dc2626;
      }

      .fluent-flow-loop-controls {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .fluent-flow-time-display {
        font-family: monospace;
        font-size: 12px;
        color: #94a3b8;
      }

      .fluent-flow-recording-status {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        background: rgba(239, 68, 68, 0.1);
        border-radius: 6px;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }

      .fluent-flow-recording-dot {
        width: 8px;
        height: 8px;
        background: #ef4444;
        border-radius: 50%;
        animation: pulse 1.5s infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `
    
    document.head.appendChild(style)
  }

  private createReactMountPoint() {
    // This would be where we mount a React component for the UI
    // For now, create a basic HTML structure
    if (!this.panelContainer) return

    this.panelContainer.innerHTML = `
      <div class="fluent-flow-header">
        <div class="fluent-flow-title">FluentFlow</div>
        <button class="fluent-flow-button" id="close-panel">×</button>
      </div>
      
      <div class="fluent-flow-tabs">
        <button class="fluent-flow-tab active" data-tab="loop">Loop</button>
        <button class="fluent-flow-tab" data-tab="record">Record</button>
        <button class="fluent-flow-tab" data-tab="compare">Compare</button>
      </div>
      
      <div class="fluent-flow-content" id="fluent-flow-content">
        <div class="fluent-flow-loop-controls">
          <button class="fluent-flow-button" id="set-loop-start">Set Start (Alt+1)</button>
          <button class="fluent-flow-button" id="set-loop-end">Set End (Alt+2)</button>
          <button class="fluent-flow-button" id="toggle-loop">Start Loop</button>
          <div class="fluent-flow-time-display" id="loop-display">
            Start: --:-- | End: --:--
          </div>
        </div>
      </div>
    `

    // Add event listeners
    this.setupPanelEventListeners()
  }

  private setupPanelEventListeners() {
    if (!this.panelContainer) return

    // Close button
    const closeBtn = this.panelContainer.querySelector('#close-panel')
    closeBtn?.addEventListener('click', () => {
      useFluentFlowStore.getState().togglePanel()
    })

    // Tab buttons
    const tabs = this.panelContainer.querySelectorAll('.fluent-flow-tab')
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        const tabName = target.dataset.tab
        this.switchTab(tabName as 'loop' | 'record' | 'compare')
      })
    })

    // Loop controls
    const setStartBtn = this.panelContainer.querySelector('#set-loop-start')
    setStartBtn?.addEventListener('click', () => this.setLoopStart())

    const setEndBtn = this.panelContainer.querySelector('#set-loop-end')
    setEndBtn?.addEventListener('click', () => this.setLoopEnd())

    const toggleLoopBtn = this.panelContainer.querySelector('#toggle-loop')
    toggleLoopBtn?.addEventListener('click', () => this.toggleLoopMode())
  }

  private switchTab(tab: 'loop' | 'record' | 'compare') {
    if (!this.panelContainer) return

    // Update active tab
    const tabs = this.panelContainer.querySelectorAll('.fluent-flow-tab')
    tabs.forEach(t => t.classList.remove('active'))
    
    const activeTab = this.panelContainer.querySelector(`[data-tab="${tab}"]`)
    activeTab?.classList.add('active')

    // Update content
    const content = this.panelContainer.querySelector('#fluent-flow-content')
    if (!content) return

    switch (tab) {
      case 'loop':
        content.innerHTML = this.getLoopTabContent()
        break
      case 'record':
        content.innerHTML = this.getRecordTabContent()
        break
      case 'compare':
        content.innerHTML = this.getCompareTabContent()
        break
    }

    // Re-setup event listeners for new content
    this.setupPanelEventListeners()
  }

  private getLoopTabContent(): string {
    const { loopState } = useFluentFlowStore.getState()
    return `
      <div class="fluent-flow-loop-controls">
        <button class="fluent-flow-button" id="set-loop-start">Set Start (Alt+1)</button>
        <button class="fluent-flow-button" id="set-loop-end">Set End (Alt+2)</button>
        <button class="fluent-flow-button" id="toggle-loop">
          ${loopState.isLooping ? 'Stop Loop' : 'Start Loop'}
        </button>
        <div class="fluent-flow-time-display" id="loop-display">
          Start: ${this.formatTime(loopState.startTime)} | End: ${this.formatTime(loopState.endTime)}
        </div>
      </div>
    `
  }

  private getRecordTabContent(): string {
    const { recordingState } = useFluentFlowStore.getState()
    return `
      <div class="fluent-flow-recording-controls">
        ${recordingState.isRecording ? 
          '<div class="fluent-flow-recording-status"><div class="fluent-flow-recording-dot"></div>Recording...</div>' : 
          ''
        }
        <button class="fluent-flow-button ${recordingState.isRecording ? 'recording' : ''}" id="toggle-recording">
          ${recordingState.isRecording ? 'Stop Recording' : 'Start Recording'} (Alt+R)
        </button>
        <div id="recordings-list">
          <!-- Recordings list would go here -->
        </div>
      </div>
    `
  }

  private getCompareTabContent(): string {
    return `
      <div class="fluent-flow-compare-controls">
        <button class="fluent-flow-button" id="start-comparison">Compare Audio (Alt+C)</button>
        <div id="comparison-controls" style="margin-top: 12px;">
          <!-- Comparison controls would go here -->
        </div>
      </div>
    `
  }

  private formatTime(seconds: number | null): string {
    if (seconds === null) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  private updatePanelPosition() {
    if (!this.panelContainer) return
    
    const { settings, uiState } = useFluentFlowStore.getState()
    
    // Update position based on settings
    switch (settings.panelPosition) {
      case 'top-right':
        this.panelContainer.style.top = '20px'
        this.panelContainer.style.right = '20px'
        this.panelContainer.style.left = 'auto'
        this.panelContainer.style.bottom = 'auto'
        break
      case 'top-left':
        this.panelContainer.style.top = '20px'
        this.panelContainer.style.left = '20px'
        this.panelContainer.style.right = 'auto'
        this.panelContainer.style.bottom = 'auto'
        break
      case 'bottom-right':
        this.panelContainer.style.bottom = '20px'
        this.panelContainer.style.right = '20px'
        this.panelContainer.style.top = 'auto'
        this.panelContainer.style.left = 'auto'
        break
      case 'bottom-left':
        this.panelContainer.style.bottom = '20px'
        this.panelContainer.style.left = '20px'
        this.panelContainer.style.top = 'auto'
        this.panelContainer.style.right = 'auto'
        break
    }
  }

  private setupStoreSubscription() {
    // Subscribe to store changes
    useFluentFlowStore.subscribe((state, prevState) => {
      // Update panel visibility
      if (state.uiState.isPanelVisible !== prevState.uiState.isPanelVisible) {
        this.updatePanelVisibility(state.uiState.isPanelVisible)
      }

      // Update panel position
      if (state.settings.panelPosition !== prevState.settings.panelPosition) {
        this.updatePanelPosition()
      }

      // Update UI content when state changes
      this.updatePanelContent()
    })
  }

  private updatePanelVisibility(isVisible: boolean) {
    if (!this.panelContainer) return
    
    if (isVisible) {
      this.panelContainer.classList.add('visible')
    } else {
      this.panelContainer.classList.remove('visible')
    }
  }

  private updatePanelContent() {
    // Update the current tab content with fresh state
    const activeTab = this.panelContainer?.querySelector('.fluent-flow-tab.active') as HTMLElement
    const tabName = activeTab?.dataset.tab as 'loop' | 'record' | 'compare'
    
    if (tabName) {
      this.switchTab(tabName)
    }
  }

  // Action methods
  private async setLoopStart() {
    try {
      const currentTime = (await this.youtubeService.getPlayerState()).currentTime
      const { loopState } = useFluentFlowStore.getState()
      
      if (loopState.endTime && currentTime >= loopState.endTime) {
        throw new Error('Start time cannot be after end time')
      }

      // Update loop state
      useFluentFlowStore.setState((state) => ({
        loopState: {
          ...state.loopState,
          startTime: currentTime,
          mode: loopState.endTime ? 'complete' : 'setting-end'
        }
      }))

      this.updatePanelContent()
    } catch (error) {
      console.error('Failed to set loop start:', error)
    }
  }

  private async setLoopEnd() {
    try {
      const currentTime = (await this.youtubeService.getPlayerState()).currentTime
      const { loopState } = useFluentFlowStore.getState()
      
      if (loopState.startTime && currentTime <= loopState.startTime) {
        throw new Error('End time cannot be before start time')
      }

      // Update loop state and create segment
      if (loopState.startTime !== null) {
        useFluentFlowStore.getState().setLoopSegment(loopState.startTime, currentTime)
      } else {
        useFluentFlowStore.setState((state) => ({
          loopState: {
            ...state.loopState,
            endTime: currentTime,
            mode: 'setting-start'
          }
        }))
      }

      this.updatePanelContent()
    } catch (error) {
      console.error('Failed to set loop end:', error)
    }
  }

  private toggleLoopMode() {
    const { loopState } = useFluentFlowStore.getState()
    
    if (loopState.startTime !== null && loopState.endTime !== null) {
      useFluentFlowStore.setState((state) => ({
        loopState: {
          ...state.loopState,
          isLooping: !state.loopState.isLooping
        }
      }))
      
      this.updatePanelContent()
    } else {
      console.warn('Cannot start loop: both start and end times must be set')
    }
  }

  private async toggleRecording() {
    const { recordingState, currentVideo } = useFluentFlowStore.getState()
    
    if (!currentVideo) {
      console.error('No current video available')
      return
    }

    try {
      if (recordingState.isRecording) {
        const recording = await useFluentFlowStore.getState().stopRecording()
        await useFluentFlowStore.getState().saveRecording(recording)
        console.log('Recording saved:', recording.id)
      } else {
        await useFluentFlowStore.getState().startRecording()
        console.log('Recording started')
      }
      
      this.updatePanelContent()
    } catch (error) {
      console.error('Recording error:', error)
    }
  }

  private async startAudioComparison() {
    const { currentSession, loopState } = useFluentFlowStore.getState()
    
    if (!currentSession?.recordings.length) {
      console.warn('No recordings available for comparison')
      return
    }

    if (loopState.startTime === null || loopState.endTime === null) {
      console.warn('No loop segment defined for comparison')
      return
    }

    try {
      const latestRecording = currentSession.recordings[currentSession.recordings.length - 1]
      const segment: LoopSegment = {
        id: 'temp_segment',
        startTime: loopState.startTime,
        endTime: loopState.endTime,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      useFluentFlowStore.getState().startComparison(latestRecording, segment)
      await this.comparisonService.startComparison(latestRecording, segment, 'alternating')
      
      console.log('Audio comparison started')
    } catch (error) {
      console.error('Comparison error:', error)
    }
  }

  private async togglePlayPause() {
    try {
      const playerState = await this.youtubeService.getPlayerState()
      
      if (playerState.isPlaying) {
        await this.youtubeService.pause()
      } else {
        await this.youtubeService.play()
      }
    } catch (error) {
      console.error('Failed to toggle play/pause:', error)
    }
  }

  // Message handlers
  private async handleInitPlayer(sendResponse: (response: any) => void) {
    try {
      await this.setupYouTubeIntegration()
      sendResponse({ success: true })
    } catch (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  private async handleSetLoopSegment(payload: { startTime: number; endTime: number }, sendResponse: (response: any) => void) {
    try {
      useFluentFlowStore.getState().setLoopSegment(payload.startTime, payload.endTime)
      sendResponse({ success: true })
    } catch (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  private async handleStartRecording(sendResponse: (response: any) => void) {
    try {
      await useFluentFlowStore.getState().startRecording()
      sendResponse({ success: true })
    } catch (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  private async handleStopRecording(sendResponse: (response: any) => void) {
    try {
      const recording = await useFluentFlowStore.getState().stopRecording()
      await useFluentFlowStore.getState().saveRecording(recording)
      sendResponse({ success: true, recording })
    } catch (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  private async handleCompareAudio(payload: { recording: AudioRecording; segment: LoopSegment }, sendResponse: (response: any) => void) {
    try {
      useFluentFlowStore.getState().startComparison(payload.recording, payload.segment)
      await this.comparisonService.startComparison(payload.recording, payload.segment, 'alternating')
      sendResponse({ success: true })
    } catch (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  private handleTogglePanel(sendResponse: (response: any) => void) {
    useFluentFlowStore.getState().togglePanel()
    sendResponse({ success: true })
  }

  public destroy() {
    this.comparisonService?.destroy()
    this.recordingService?.cleanup()
    this.youtubeService?.destroy()
    
    if (this.loopInterval) {
      clearInterval(this.loopInterval)
    }
    
    if (this.panelContainer) {
      this.panelContainer.remove()
    }
    
    const styles = document.querySelector('#fluent-flow-styles')
    if (styles) {
      styles.remove()
    }
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

// Handle navigation changes (YouTube SPA)
let currentUrl = window.location.href
setInterval(() => {
  if (currentUrl !== window.location.href) {
    currentUrl = window.location.href
    initializeFluentFlow()
  }
}, 1000)