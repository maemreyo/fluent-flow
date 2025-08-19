// FluentFlow Content Script Main Orchestrator
// Clean architecture implementation following Separation of Concerns
// Coordinates between features without mixing business logic

import { ComparisonFeature } from './features/comparison'
import { LoopFeature } from './features/loop'
import { RecordingFeature } from './features/recording'
import { YouTubePlayerService, type VideoInfo } from './integrations/youtube-player'
import { UIUtilities, type ButtonConfig } from './ui/utilities'

import { TimeBasedNotesFeature } from './features/time-based-notes'

export class FluentFlowOrchestrator {
  private loopFeature: LoopFeature
  private recordingFeature: RecordingFeature
  private comparisonFeature: ComparisonFeature
  private timeBasedNotesFeature: TimeBasedNotesFeature
  private playerService: YouTubePlayerService
  private uiUtilities: UIUtilities
  private isApplyingLoop: boolean = false

  constructor() {
    // Initialize services and utilities first
    this.playerService = new YouTubePlayerService()
    this.uiUtilities = UIUtilities.getInstance()

    // Initialize features with their dependencies
    this.loopFeature = new LoopFeature(this.playerService, this.uiUtilities)
    this.recordingFeature = new RecordingFeature(this.uiUtilities, this.playerService)
    this.comparisonFeature = new ComparisonFeature(this.playerService, this.uiUtilities)
    this.timeBasedNotesFeature = new TimeBasedNotesFeature(this.playerService, this.uiUtilities)

    // Start initialization
    this.initialize()
  }

  private async initialize(): Promise<void> {
    console.log('FluentFlow: Initializing content script orchestrator')

    try {
      // Wait for YouTube page to be ready
      await this.waitForYouTubeReady()

      // Setup YouTube integrations
      await this.setupYouTubeIntegrations()

      // Initialize notes for current video
      await this.timeBasedNotesFeature.initializeVideoNotes()

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
      {
        id: 'fluent-flow-loop-export',
        title: 'Export Current Loop (Alt+E)',
        icon: this.uiUtilities.getExportIcon(),
        action: () => this.exportCurrentLoop(),
        rightClick: () => this.exportCurrentLoopWithPrompt(),
        group: 'loop'
      },
      
      // Recording and notes group
      {
        id: 'fluent-flow-record',
        title: 'Voice Recording (Alt+R)', 
        icon: this.uiUtilities.getRecordIcon(),
        action: () => this.toggleRecordingWithNotes(),
        group: 'record'
      },
      {
        id: 'fluent-flow-notes',
        title: 'Add Note (Alt+N)',
        icon: this.uiUtilities.getNotesIcon(),
        action: () => this.timeBasedNotesFeature.toggleNoteTakingMode(),
        rightClick: () => this.timeBasedNotesFeature.showNotesOverlay(),
        group: 'record'
      },
      
      // Other features group
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
            this.toggleRecordingWithNotes()
            break
          case 'n':
            event.preventDefault()
            event.stopPropagation()
            this.timeBasedNotesFeature.toggleNoteTakingMode()
            break
          case 'c':
            event.preventDefault()
            event.stopPropagation()
            this.handleComparisonAction()
            break
          case 'e':
            event.preventDefault()
            event.stopPropagation()
            this.exportCurrentLoop()
            break
          case 'v':
            event.preventDefault()
            event.stopPropagation()
            this.timeBasedNotesFeature.showNotesOverlay()
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
            this.toggleRecordingWithNotes()
            break
          case 'n':
            event.preventDefault()
            event.stopPropagation()
            this.timeBasedNotesFeature.toggleNoteTakingMode()
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
          case 'e':
            event.preventDefault()
            event.stopPropagation()
            this.exportCurrentLoopWithPrompt()
            break
        }
      }

      // Notes shortcuts: Double-tap N for quick note
      if (!useOptionKey && !event.shiftKey && !event.metaKey && !event.ctrlKey && event.key.toLowerCase() === 'n') {
        // Detect double-tap N for quick note
        const now = Date.now()
        const lastNTap = (window as any)._ffLastNTap || 0
        if (now - lastNTap < 500) {
          event.preventDefault()
          event.stopPropagation()
          this.quickAddNote()
        }
        ;(window as any)._ffLastNTap = now
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

        case 'APPLY_LOOP':
          // Set flag from message or default to true when applying loop
          this.isApplyingLoop = message.isApplyingLoop !== undefined ? message.isApplyingLoop : true
          this.loopFeature.applyLoop(message.data)
          // Clear the flag after a delay to ensure loop application is complete
          setTimeout(() => {
            this.isApplyingLoop = false
          }, 1000)
          sendResponse({ success: true })
          return true

        case 'TOGGLE_PANEL':
          this.openSidePanel()
          sendResponse({ success: true })
          return true

        case 'GET_NOTES':
          sendResponse({
            success: true,
            notes: this.timeBasedNotesFeature.getCurrentVideoNotes()
          })
          return true

        case 'EXPORT_NOTES':
          const notesText = this.timeBasedNotesFeature.exportNotesToText()
          sendResponse({
            success: true,
            notesText
          })
          return true

        default:
          return false
      }
    })

    console.log('FluentFlow: Message handlers setup complete')
  }

  private setupVideoChangeDetection(): void {
    let isReInitializing = false

    this.playerService.onVideoChange(async (videoInfo: VideoInfo) => {
      console.log('FluentFlow: Video changed', videoInfo)
      
      // Prevent duplicate re-initialization if already in progress
      if (isReInitializing) {
        console.log('FluentFlow: Skipping video change re-initialization - already in progress')
        return
      }
      
      // Handle notes session for video change
      await this.timeBasedNotesFeature.onVideoChange()
      
      // Reset features for new video, but skip loop clearing if we're applying a loop
      if (!this.isApplyingLoop) {
        this.loopFeature.clearLoop()
      } else {
        console.log('FluentFlow: Skipping loop clear - loop application in progress')
      }
      this.recordingFeature.clearRecording()
      this.comparisonFeature.destroy()
      
      // Check if integrations need re-setup by testing if progress bar is still available
      const progressBarExists = document.querySelector('.ytp-progress-bar')
      const controlsExists = document.querySelector('.ytp-right-controls')
      
      if (!progressBarExists || !controlsExists) {
        console.log('FluentFlow: YouTube player elements missing, re-initializing...')
        isReInitializing = true
        
        // Re-setup integrations after a delay
        setTimeout(async () => {
          try {
            console.log('FluentFlow: Re-initializing for video change')
            await this.setupYouTubeIntegrations()
            await this.timeBasedNotesFeature.initializeVideoNotes()
            
            // Only re-setup UI if buttons are missing
            const buttonContainer = document.querySelector('.fluent-flow-controls')
            if (!buttonContainer) {
              await this.setupUI()
            } else {
              console.log('FluentFlow: UI already exists, skipping re-setup')
            }
            
            console.log('FluentFlow: Video change re-initialization complete')
          } catch (error) {
            console.error('FluentFlow: Failed to re-initialize after video change', error)
          } finally {
            isReInitializing = false
          }
        }, 1000)
      } else {
        console.log('FluentFlow: YouTube player elements present, skipping re-initialization')
        // Just initialize notes for the new video
        await this.timeBasedNotesFeature.initializeVideoNotes()
      }
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

  // Enhanced recording with notes integration
  private async toggleRecordingWithNotes(): Promise<void> {
    if (this.recordingFeature.isRecording()) {
      // Stop recording and notes session
      await this.recordingFeature.stopRecording()
      await this.timeBasedNotesFeature.endNotesSession()
    } else {
      // Start recording and notes session
      this.timeBasedNotesFeature.startNotesSession()
      await this.recordingFeature.startRecording()
    }
  }

  private async quickAddNote(): Promise<void> {
    const noteText = prompt('Quick note at current time:')
    if (noteText && noteText.trim()) {
      await this.timeBasedNotesFeature.addTimestampedNote(noteText.trim())
    }
  }

  private openSidePanel(): void {
    console.log('FluentFlow: Opening side panel')
    chrome.runtime.sendMessage({
      type: 'OPEN_SIDE_PANEL',
      videoInfo: this.playerService.getVideoInfo(),
      notes: this.timeBasedNotesFeature.getCurrentVideoNotes()
    })
  }

  private exportCurrentLoop(): void {
    const exported = this.loopFeature.exportCurrentLoop()
    if (exported) {
      this.uiUtilities.updateButtonState('fluent-flow-loop-export', 'active')
      setTimeout(() => {
        this.uiUtilities.updateButtonState('fluent-flow-loop-export', 'inactive')
      }, 2000)
    }
  }

  private exportCurrentLoopWithPrompt(): void {
    const title = prompt('Enter a title for this loop (optional):')
    const description = prompt('Enter a description for this loop (optional):')
    
    const exported = this.loopFeature.exportCurrentLoop(title || undefined, description || undefined)
    if (exported) {
      this.uiUtilities.updateButtonState('fluent-flow-loop-export', 'active')
      setTimeout(() => {
        this.uiUtilities.updateButtonState('fluent-flow-loop-export', 'inactive')
      }, 2000)
    }
  }

  // Cleanup method for extension unload
  public destroy(): void {
    console.log('FluentFlow: Destroying orchestrator')
    
    this.loopFeature.destroy()
    this.recordingFeature.destroy()
    this.comparisonFeature.destroy()
    this.timeBasedNotesFeature.destroy()

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