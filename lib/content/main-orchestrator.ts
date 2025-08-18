// FluentFlow Content Script Main Orchestrator
// Clean architecture implementation following Separation of Concerns
// Coordinates between features without mixing business logic

import { LoopFeature } from './features/loop'
import { RecordingFeature } from './features/recording'  
import { ComparisonFeature } from './features/comparison'
import { YouTubePlayerService, VideoInfo } from './integrations/youtube-player'
import { UIUtilities, ButtonConfig } from './ui/utilities'

export class FluentFlowOrchestrator {
  private loopFeature: LoopFeature
  private recordingFeature: RecordingFeature
  private comparisonFeature: ComparisonFeature
  private playerService: YouTubePlayerService
  private uiUtilities: UIUtilities

  constructor() {
    // Initialize services and utilities first
    this.playerService = new YouTubePlayerService()
    this.uiUtilities = UIUtilities.getInstance()

    // Initialize features with their dependencies
    this.loopFeature = new LoopFeature(this.playerService, this.uiUtilities)
    this.recordingFeature = new RecordingFeature(this.uiUtilities)
    this.comparisonFeature = new ComparisonFeature(this.playerService, this.uiUtilities)

    // Start initialization
    this.initialize()
  }

  private async initialize(): void {
    console.log('FluentFlow: Initializing content script orchestrator')

    try {
      // Wait for YouTube page to be ready
      await this.waitForYouTubeReady()

      // Setup YouTube integrations
      await this.setupYouTubeIntegrations()

      // Setup UI components
      await this.setupUI()

      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts()

      // Setup message handlers
      this.setupMessageHandlers()

      // Setup video change detection
      this.setupVideoChangeDetection()

      console.log('FluentFlow: Orchestrator initialization complete')

    } catch (error) {
      console.error('FluentFlow: Failed to initialize orchestrator', error)
    }
  }

  private async waitForYouTubeReady(): Promise<void> {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (document.querySelector('#movie_player') && document.querySelector('.ytp-right-controls')) {
          resolve()
        } else {
          setTimeout(checkReady, 100)
        }
      }
      checkReady()
    })
  }

  private async setupYouTubeIntegrations(): Promise<void> {
    // Setup progress bar integration for loop feature
    const progressBar = await this.playerService.waitForProgressBar()
    this.loopFeature.setupProgressBarIntegration(progressBar)
    
    // Start loop monitoring
    this.loopFeature.startLoopMonitoring()

    console.log('FluentFlow: YouTube integrations setup complete')
  }

  private async setupUI(): Promise<void> {
    // Define button configurations
    const buttonConfigs: ButtonConfig[] = [
      // Loop control group
      {
        id: 'fluent-flow-loop-start',
        title: 'Set Loop Start (Alt+Shift+1)',
        icon: this.uiUtilities.getLoopStartIcon(),
        action: () => this.loopFeature.setLoopStart(),
        group: 'loop'
      },
      {
        id: 'fluent-flow-loop-toggle',
        title: 'Play/Pause Loop (Alt+L)',
        icon: this.uiUtilities.getLoopPlayIcon(),
        action: () => this.loopFeature.toggleLoopPlayback(),
        group: 'loop'
      },
      {
        id: 'fluent-flow-loop-end',
        title: 'Set Loop End (Alt+Shift+2)',
        icon: this.uiUtilities.getLoopEndIcon(),
        action: () => this.loopFeature.setLoopEnd(),
        group: 'loop'
      },
      
      // Other features group
      {
        id: 'fluent-flow-record',
        title: 'Voice Recording (Alt+R)', 
        icon: this.uiUtilities.getRecordIcon(),
        action: () => this.recordingFeature.toggleRecording(),
        group: 'other'
      },
      {
        id: 'fluent-flow-compare',
        title: 'Audio Compare (Alt+C)',
        icon: this.uiUtilities.getCompareIcon(), 
        action: () => this.handleComparisonAction(),
        group: 'other'
      },
      {
        id: 'fluent-flow-panel',
        title: 'FluentFlow Panel (Alt+Shift+F)',
        icon: this.uiUtilities.getPanelIcon(),
        action: () => this.openSidePanel(),
        group: 'other'
      }
    ]

    // Create button container
    await this.uiUtilities.createButtonContainer(buttonConfigs)

    console.log('FluentFlow: UI setup complete')
  }

  private setupKeyboardShortcuts(): void {
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
            this.loopFeature.toggleLoopMode()
            break
          case 'r':
            event.preventDefault()
            event.stopPropagation()
            this.recordingFeature.toggleRecording()
            break
          case 'c':
            event.preventDefault()
            event.stopPropagation()
            this.handleComparisonAction()
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
            this.loopFeature.toggleLoopMode()
            break
          case 'r':
            event.preventDefault()
            event.stopPropagation()
            this.recordingFeature.toggleRecording()
            break
        }
      }

      // Loop-specific shortcuts
      if (useOptionKey && event.shiftKey) {
        switch (event.key.toLowerCase()) {
          case '1':
            event.preventDefault()
            event.stopPropagation()
            this.loopFeature.setLoopStart()
            break
          case '2':
            event.preventDefault()
            event.stopPropagation()
            this.loopFeature.setLoopEnd()
            break
          case 'x':
            event.preventDefault()
            event.stopPropagation()
            this.loopFeature.clearLoop()
            break
        }
      }
    })

    console.log('FluentFlow: Keyboard shortcuts setup complete')
  }

  private setupMessageHandlers(): void {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      switch (message.type) {
        case 'GET_VIDEO_INFO':
          sendResponse({ 
            success: true, 
            videoInfo: this.playerService.getVideoInfo()
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

    console.log('FluentFlow: Message handlers setup complete')
  }

  private setupVideoChangeDetection(): void {
    this.playerService.onVideoChange((videoInfo: VideoInfo) => {
      console.log('FluentFlow: Video changed', videoInfo)
      
      // Reset features for new video
      this.loopFeature.clearLoop()
      this.recordingFeature.clearRecording()
      this.comparisonFeature.destroy()
      
      // Re-setup integrations after a delay
      setTimeout(async () => {
        await this.setupYouTubeIntegrations()
        await this.setupUI()
      }, 1000)
    })

    console.log('FluentFlow: Video change detection setup complete')
  }

  // Feature orchestration methods
  private async handleComparisonAction(): Promise<void> {
    if (this.comparisonFeature.isActive()) {
      // If comparison is active, stop it
      this.comparisonFeature.stopComparison()
    } else {
      // If comparison is not active, start it with current recording
      const recordingBlob = this.recordingFeature.getRecordingBlob()
      if (recordingBlob) {
        await this.comparisonFeature.startComparison(recordingBlob)
      } else {
        this.uiUtilities.showToast('No recording available. Record audio first.')
      }
    }
  }

  private openSidePanel(): void {
    console.log('FluentFlow: Opening side panel')
    chrome.runtime.sendMessage({
      type: 'OPEN_SIDE_PANEL',
      videoInfo: this.playerService.getVideoInfo()
    })
  }

  // Cleanup method for extension unload
  public destroy(): void {
    console.log('FluentFlow: Destroying orchestrator')
    
    this.loopFeature.destroy()
    this.recordingFeature.destroy()
    this.comparisonFeature.destroy()

    // Clean up UI elements
    const fluentFlowControls = document.querySelector('.fluent-flow-controls')
    if (fluentFlowControls) {
      fluentFlowControls.remove()
    }

    const fluentFlowStyles = document.getElementById('fluent-flow-styles')
    if (fluentFlowStyles) {
      fluentFlowStyles.remove()
    }
  }
}

// Initialize FluentFlow when ready
function initializeFluentFlow() {
  // Check if we're on a YouTube watch page
  if (window.location.hostname === 'www.youtube.com' && 
      window.location.pathname === '/watch') {
    
    new FluentFlowOrchestrator()
  }
}

// Initialize immediately if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFluentFlow)
} else {
  initializeFluentFlow()
}