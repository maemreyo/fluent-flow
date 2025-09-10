// FluentFlow Content Script Main Orchestrator
// Clean architecture implementation following Separation of Concerns
// Coordinates between features without mixing business logic

import { ComparisonFeature } from './features/comparison'
import { MultipleLoopsFeature } from './features/multiple-loops'
import { RecordingFeature } from './features/recording'
import { TimeBasedNotesFeature } from './features/time-based-notes'
import { YouTubePlayerService, type VideoInfo } from './integrations/youtube-player'
import { UIUtilities, type ButtonConfig } from './ui/utilities'
import { QuestionOverlayService } from '../services/question-overlay-service'

export class FluentFlowOrchestrator {
  private multipleLoopsFeature: MultipleLoopsFeature
  private recordingFeature: RecordingFeature
  private comparisonFeature: ComparisonFeature
  private timeBasedNotesFeature: TimeBasedNotesFeature
  private playerService: YouTubePlayerService
  private uiUtilities: UIUtilities
  private questionOverlayService: QuestionOverlayService
  private isApplyingLoop: boolean = false
  private keyboardEventHandler: ((event: KeyboardEvent) => void) | null = null

  constructor() {
    // Initialize services and utilities first
    this.playerService = new YouTubePlayerService()
    this.uiUtilities = UIUtilities.getInstance()
    this.questionOverlayService = new QuestionOverlayService()

    // Initialize features with their dependencies
    this.multipleLoopsFeature = new MultipleLoopsFeature(this.playerService, this.uiUtilities)
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
    return new Promise(resolve => {
      const checkReady = () => {
        if (
          document.querySelector('#movie_player') &&
          document.querySelector('.ytp-right-controls')
        ) {
          resolve()
        } else {
          setTimeout(checkReady, 100)
        }
      }
      checkReady()
    })
  }

  private async setupYouTubeIntegrations(): Promise<void> {
    // Setup progress bar integration for multiple loops feature
    const progressBar = await this.playerService.waitForProgressBar()
    this.multipleLoopsFeature.setupProgressBarIntegration(progressBar)

    console.log('FluentFlow: YouTube integrations setup complete')
  }

  private async setupUI(): Promise<void> {
    // Define button configurations for sidebar
    const buttonConfigs: ButtonConfig[] = [
      // Loop control group
      {
        id: 'fluent-flow-loop-start',
        title: 'Set Loop Start',
        icon: this.uiUtilities.getLoopStartIcon(),
        action: () => this.multipleLoopsFeature.setLoopStart(),
        group: 'loop'
      },
      {
        id: 'fluent-flow-loop-toggle',
        title: 'Play/Pause Loop',
        icon: this.uiUtilities.getLoopPlayIcon(),
        action: () => this.multipleLoopsFeature.toggleLoopPlayback(),
        group: 'loop'
      },
      {
        id: 'fluent-flow-loop-end',
        title: 'Set Loop End',
        icon: this.uiUtilities.getLoopEndIcon(),
        action: () => this.multipleLoopsFeature.setLoopEnd(),
        group: 'loop'
      },
      {
        id: 'fluent-flow-loop-clear',
        title: 'Clear All Loops',
        icon: this.uiUtilities.getClearIcon(),
        action: () => this.multipleLoopsFeature.clearAllLoops(),
        group: 'loop'
      },
      {
        id: 'fluent-flow-loop-export',
        title: 'Export Current Loops',
        icon: this.uiUtilities.getExportIcon(),
        action: async () => await this.exportCurrentLoops(),
        rightClick: async () => await this.exportCurrentLoopsWithPrompt(),
        group: 'loop'
      },

      // Recording and notes group
      // {
      //   id: 'fluent-flow-record',
      //   title: 'Voice Recording',
      //   icon: this.uiUtilities.getRecordIcon(),
      //   action: () => this.toggleRecordingWithNotes(),
      //   group: 'recording'
      // },
      {
        id: 'fluent-flow-notes',
        title: 'Add Note',
        icon: this.uiUtilities.getNotesIcon(),
        action: () => this.timeBasedNotesFeature.toggleNoteTakingMode(),
        rightClick: () => this.timeBasedNotesFeature.showNotesOverlay(),
        group: 'notes'
      },

      // // Other features group
      // {
      //   id: 'fluent-flow-compare',
      //   title: 'Audio Compare',
      //   icon: this.uiUtilities.getCompareIcon(),
      //   action: () => this.handleComparisonAction(),
      //   group: 'other'
      // },
      {
        id: 'fluent-flow-panel',
        title: 'Chrome Extension Panel',
        icon: this.uiUtilities.getPanelIcon(),
        action: () => this.openSidePanel(),
        group: 'other'
      }
    ]

    // Create sidebar with buttons and minimal YouTube toggle
    await this.uiUtilities.createButtonContainer(buttonConfigs)

    console.log('FluentFlow: UI setup complete with sidebar')
  }

  private setupKeyboardShortcuts(): void {
    // Create the keyboard event handler and store it for cleanup
    this.keyboardEventHandler = (event: KeyboardEvent) => {
      // Prevent repeated events from holding down a key
      if (event.repeat) {
        return
      }

      // Only handle shortcuts when not typing in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement)?.isContentEditable
      ) {
        return
      }

      // Debug logging for macOS
      const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0

      // Use event.code instead of event.key to avoid macOS character transformations
      // Primary shortcuts: Option+Key (Alt+Key) on all platforms
      if (event.altKey && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
        console.log(`FluentFlow: Option+${event.code} detected (key: ${event.key})`)
        switch (event.code.toLowerCase()) {
          case 'keyl':
            event.preventDefault()
            event.stopPropagation()
            console.log('FluentFlow: Toggle loop playback')
            this.multipleLoopsFeature.toggleLoopPlayback()
            break
          case 'keyr':
            event.preventDefault()
            event.stopPropagation()
            console.log('FluentFlow: Toggle recording')
            this.toggleRecordingWithNotes()
            break
          case 'keyn':
            event.preventDefault()
            event.stopPropagation()
            console.log('FluentFlow: Toggle notes')
            this.timeBasedNotesFeature.toggleNoteTakingMode()
            break
          case 'keyc':
            event.preventDefault()
            event.stopPropagation()
            console.log('FluentFlow: Comparison action')
            this.handleComparisonAction()
            break
          case 'keyv':
            event.preventDefault()
            event.stopPropagation()
            console.log('FluentFlow: Show notes overlay')
            this.timeBasedNotesFeature.showNotesOverlay()
            break
          case 'keyf':
            // Alt+F: Toggle sidebar (main shortcut)
            event.preventDefault()
            event.stopPropagation()
            console.log('FluentFlow: Toggle sidebar')
            this.toggleSidebar()
            break
        }
      }

      // Panel toggle: Option+F (Alt+F)
      if (
        event.altKey &&
        event.shiftKey &&
        event.code.toLowerCase() === 'keyf' &&
        !event.metaKey &&
        !event.ctrlKey
      ) {
        event.preventDefault()
        event.stopPropagation()
        console.log('FluentFlow: Open side panel')
        this.openSidePanel()
      }

      // Loop-specific shortcuts: Option+Key (Alt+Key)
      // if (event.altKey && event.shiftKey && !event.metaKey && !event.ctrlKey) {
      if (event.altKey && !event.metaKey && !event.ctrlKey) {
        console.log(`FluentFlow: Option+${event.code} detected (key: ${event.key})`)
        switch (event.code.toLowerCase()) {
          case 'digit1':
            event.preventDefault()
            event.stopPropagation()
            console.log('FluentFlow: Set loop start')
            this.multipleLoopsFeature.setLoopStart()
            break
          case 'digit2':
            event.preventDefault()
            event.stopPropagation()
            console.log('FluentFlow: Set loop end')
            this.multipleLoopsFeature.setLoopEnd()
            break
          case 'keyx':
            event.preventDefault()
            event.stopPropagation()
            console.log('FluentFlow: Clear all loops')
            this.multipleLoopsFeature.clearAllLoops()
            break
          case 'keye':
            event.preventDefault()
            event.stopPropagation()
            console.log('FluentFlow: Export loops with prompt')
            this.exportCurrentLoopsWithPrompt().catch(error => {
              console.error('FluentFlow: Export with prompt failed:', error)
            })
            break
        }
      }

      // Additional macOS Command+Shift shortcuts for compatibility
      if (isMac && event.metaKey && event.shiftKey && !event.altKey && !event.ctrlKey) {
        console.log(`FluentFlow: Cmd+Shift+${event.code} detected (macOS)`)
        switch (event.code.toLowerCase()) {
          case 'keyl':
            event.preventDefault()
            event.stopPropagation()
            console.log('FluentFlow: Toggle loop playback (Cmd+Shift)')
            this.multipleLoopsFeature.toggleLoopPlayback()
            break
          case 'keyr':
            event.preventDefault()
            event.stopPropagation()
            console.log('FluentFlow: Toggle recording (Cmd+Shift)')
            this.toggleRecordingWithNotes()
            break
          case 'digit1':
            event.preventDefault()
            event.stopPropagation()
            console.log('FluentFlow: Set loop start (Cmd+Shift)')
            this.multipleLoopsFeature.setLoopStart()
            break
          case 'digit2':
            event.preventDefault()
            event.stopPropagation()
            console.log('FluentFlow: Set loop end (Cmd+Shift)')
            this.multipleLoopsFeature.setLoopEnd()
            break
        }
      }

      // Notes shortcuts: Double-tap N for quick note
      if (
        !event.altKey &&
        !event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        event.code.toLowerCase() === 'keyn'
      ) {
        // Detect double-tap N for quick note
        const now = Date.now()
        const lastNTap = (window as any)._ffLastNTap || 0
        if (now - lastNTap < 500) {
          event.preventDefault()
          event.stopPropagation()
          console.log('FluentFlow: Quick add note')
          this.quickAddNote()
        }
        ;(window as any)._ffLastNTap = now
      }
    }

    // Add the event listener
    document.addEventListener('keydown', this.keyboardEventHandler)

    console.log(
      'FluentFlow: Keyboard shortcuts setup complete for',
      navigator.userAgent.toUpperCase().indexOf('MAC') >= 0 ? 'macOS' : 'other OS'
    )
    console.log(
      'FluentFlow: Using event.code for keyboard detection to avoid macOS character transformations'
    )
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
          // Import loop as a single saved loop to multiple loops system
          if (message.data) {
            this.multipleLoopsFeature.importLoops([message.data])
          }
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

        case 'EXTRACT_YOUTUBE_DATA':
          this.handleYouTubeDataExtraction(message.videoId, sendResponse)
          return true

        case 'SHOW_QUESTION_OVERLAY':
          if (message.questions) {
            this.questionOverlayService.showQuestions(message.questions)
            sendResponse({ success: true })
          } else {
            sendResponse({ success: false, error: 'No questions provided' })
          }
          return true

        case 'HIDE_QUESTION_OVERLAY':
          this.questionOverlayService.hideOverlay()
          sendResponse({ success: true })
          return true

        case 'TOGGLE_QUESTION_OVERLAY':
          if (this.questionOverlayService.isOverlayVisible()) {
            this.questionOverlayService.hideOverlay()
          } else if (message.questions) {
            this.questionOverlayService.showQuestions(message.questions)
          }
          sendResponse({ success: true })
          return true

        default:
          return false
      }
    })

    console.log('FluentFlow: Message handlers setup complete')
  }

  private handleYouTubeDataExtraction(videoId: string, sendResponse: (response: any) => void): void {
    try {
      // Get window objects for YouTube data
      const playerResponse = (window as any).ytInitialPlayerResponse
      const initialData = (window as any).ytInitialData

      if (!playerResponse) {
        sendResponse({
          success: false,
          error: 'ytInitialPlayerResponse not found in window'
        })
        return
      }

      // Extract basic video metadata
      const videoDetails = playerResponse.videoDetails || {}
      const streamingData = playerResponse.streamingData || {}
      const captions = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks || []

      // Parse captions
      const parsedCaptions = captions.map((caption: any) => ({
        languageCode: caption.languageCode,
        languageName: caption.name?.simpleText || caption.name?.runs?.[0]?.text || caption.languageCode,
        baseUrl: caption.baseUrl,
        isTranslatable: caption.isTranslatable || false
      }))

      // Extract metadata
      const metadata = {
        videoId: videoId,
        title: videoDetails.title || 'Unknown Title',
        author: videoDetails.author || 'Unknown Channel',
        channelId: videoDetails.channelId || '',
        duration: parseInt(videoDetails.lengthSeconds || '0', 10),
        viewCount: videoDetails.viewCount || '0',
        description: videoDetails.shortDescription || '',
        thumbnails: videoDetails.thumbnail?.thumbnails || [],
        captions: parsedCaptions.length > 0 ? parsedCaptions : undefined
      }

      sendResponse({
        success: true,
        data: metadata
      })
    } catch (error) {
      console.error('FluentFlow: YouTube data extraction failed:', error)
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
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
        this.multipleLoopsFeature.clearAllLoops()
      } else {
        console.log('FluentFlow: Skipping loop clear - loop application in progress')
      }
      this.recordingFeature.clearRecording()
      this.comparisonFeature.destroy()

      // Hide question overlay on video change
      if (this.questionOverlayService.isOverlayVisible()) {
        this.questionOverlayService.hideOverlay()
      }

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

  private toggleSidebar(): void {
    // Add debouncing to prevent double-triggering
    const now = Date.now()
    const lastToggle = (this as any)._lastSidebarToggle || 0

    if (now - lastToggle < 300) {
      // 300ms debounce
      console.log('FluentFlow: Sidebar toggle debounced (too quick)')
      return
    }

    ;(this as any)._lastSidebarToggle = now
    console.log('FluentFlow: Toggling sidebar')
    this.uiUtilities.toggleSidebar()
  }

  private async exportCurrentLoops(): Promise<void> {
    console.log('🚀 FluentFlow: Export button clicked - starting export process...')
    
    try {
      console.log('🔄 FluentFlow: Calling multipleLoopsFeature.exportCurrentLoops()...')
      const exported = await this.multipleLoopsFeature.exportCurrentLoops()
      console.log('✅ FluentFlow: Export completed, received loops:', exported?.length || 0)
      
      if (exported && exported.length > 0) {
        console.log('💾 FluentFlow: Sending loops to background script for storage...')
        console.log('📦 FluentFlow: Message payload:', {
          type: 'SAVE_LOOPS',
          loopCount: exported.length,
          loops: exported.map(l => ({ id: l.id, title: l.title, hasTranscript: l.hasTranscript }))
        })
        
        // Save exported loops to storage
        chrome.runtime.sendMessage({
          type: 'SAVE_LOOPS',
          loops: exported
        }, (response) => {
          console.log('📬 FluentFlow: Background script response:', response)
          if (chrome.runtime.lastError) {
            console.error('❌ FluentFlow: Chrome runtime error:', chrome.runtime.lastError)
          }
        })
        
        // Request background script to open sidepanel (using correct message type)
        console.log('🔄 FluentFlow: Requesting sidepanel to open...')
        chrome.runtime.sendMessage({
          type: 'OPEN_SIDE_PANEL'
        }, (response) => {
          console.log('📬 FluentFlow: Sidepanel open response:', response)
          if (chrome.runtime.lastError) {
            console.warn('⚠️ FluentFlow: Failed to request sidepanel open:', chrome.runtime.lastError)
          }
        })
        
        this.uiUtilities.updateButtonState('fluent-flow-loop-export', 'active')
        this.uiUtilities.showToast(`Exported ${exported.length} loop(s) - Opening sidepanel`)
        console.log(`🎉 FluentFlow: Successfully exported ${exported.length} loop(s)`)
        
        setTimeout(() => {
          this.uiUtilities.updateButtonState('fluent-flow-loop-export', 'inactive')
        }, 2000)
      } else {
        console.log('⚠️ FluentFlow: No loops to export')
        this.uiUtilities.showToast('No loops to export')
      }
    } catch (error) {
      console.error('💥 FluentFlow: Export failed with error:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      })
      this.uiUtilities.showToast('Export failed - check console for details')
    }
  }

  private async exportCurrentLoopsWithPrompt(): Promise<void> {
    console.log('🚀 FluentFlow: Export with prompt triggered...')
    
    const loops = this.multipleLoopsFeature.getActiveLoops()
    console.log('📊 FluentFlow: Active loops for export:', loops.length)
    
    if (loops.length === 0) {
      console.log('⚠️ FluentFlow: No loops to export')
      this.uiUtilities.showToast('No loops to export')
      return
    }

    console.log('💬 FluentFlow: Prompting user for description...')
    const description = prompt(`Export ${loops.length} loop(s)? Enter optional description:`)
    console.log('📝 FluentFlow: User description input:', description !== null ? `"${description}"` : 'cancelled')
    
    if (description !== null) {
      try {
        console.log('🔄 FluentFlow: Calling multipleLoopsFeature.exportCurrentLoops()...')
        const exported = await this.multipleLoopsFeature.exportCurrentLoops()
        console.log('✅ FluentFlow: Export completed, received loops:', exported?.length || 0)
        
        if (exported && exported.length > 0) {
          // Add description to all loops if provided
          if (description.trim()) {
            console.log('📝 FluentFlow: Adding description to all loops:', description.trim())
            exported.forEach(loop => {
              loop.description = description.trim()
            })
          }

          console.log('💾 FluentFlow: Sending loops to background script for storage...')
          console.log('📦 FluentFlow: Message payload:', {
            type: 'SAVE_LOOPS',
            loopCount: exported.length,
            loops: exported.map(l => ({ 
              id: l.id, 
              title: l.title, 
              description: l.description,
              hasTranscript: l.hasTranscript 
            }))
          })

          chrome.runtime.sendMessage({
            type: 'SAVE_LOOPS',
            loops: exported
          }, (response) => {
            console.log('📬 FluentFlow: Background script response:', response)
            if (chrome.runtime.lastError) {
              console.error('❌ FluentFlow: Chrome runtime error:', chrome.runtime.lastError)
            }
          })
          
          // Request background script to open sidepanel (using correct message type)
          console.log('🔄 FluentFlow: Requesting sidepanel to open...')
          chrome.runtime.sendMessage({
            type: 'OPEN_SIDE_PANEL'
          }, (response) => {
            console.log('📬 FluentFlow: Sidepanel open response:', response)
            if (chrome.runtime.lastError) {
              console.warn('⚠️ FluentFlow: Failed to request sidepanel open:', chrome.runtime.lastError)
            }
          })
          
          this.uiUtilities.updateButtonState('fluent-flow-loop-export', 'active')
          this.uiUtilities.showToast(`Exported ${exported.length} loop(s) - Opening sidepanel`)
          console.log(`🎉 FluentFlow: Successfully exported ${exported.length} loop(s) with description`)
          
          setTimeout(() => {
            this.uiUtilities.updateButtonState('fluent-flow-loop-export', 'inactive')
          }, 2000)
        } else {
          console.log('⚠️ FluentFlow: No loops received from export')
        }
      } catch (error) {
        console.error('💥 FluentFlow: Export with prompt failed:', {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined
        })
        this.uiUtilities.showToast('Export failed - check console for details')
      }
    } else {
      console.log('❌ FluentFlow: Export cancelled by user')
    }
  }

  // Cleanup method for extension unload
  public destroy(): void {
    console.log('FluentFlow: Destroying orchestrator')

    // Remove keyboard event listener first
    if (this.keyboardEventHandler) {
      document.removeEventListener('keydown', this.keyboardEventHandler)
      this.keyboardEventHandler = null
      console.log('FluentFlow: Keyboard event listener removed')
    }

    this.multipleLoopsFeature.destroy()
    this.recordingFeature.destroy()
    this.comparisonFeature.destroy()
    this.timeBasedNotesFeature.destroy()
    this.questionOverlayService.destroy()

    // Clean up UI elements including sidebar
    this.uiUtilities.destroy()

    const fluentFlowStyles = document.getElementById('fluent-flow-styles')
    if (fluentFlowStyles) {
      fluentFlowStyles.remove()
    }
  }
}

