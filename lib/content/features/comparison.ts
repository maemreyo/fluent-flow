// Audio Comparison Feature Module - Compare original vs recorded audio
// Clean separation from other features following SoC principles

interface ComparisonState {
  isActive: boolean
  originalAudio: HTMLAudioElement | null
  recordedAudio: HTMLAudioElement | null
  isPlayingOriginal: boolean
  isPlayingRecorded: boolean
  comparisonMode: 'off' | 'original' | 'recorded' | 'simultaneous'
}

export interface UIUtilities {
  showToast(message: string): void
  updateButtonState(buttonId: string, state: 'inactive' | 'active' | 'setting' | 'paused'): void
  formatTime(seconds: number | null): string
}

export interface YouTubePlayerIntegration {
  getCurrentTime(): number | null
  seekTo(time: number): boolean
  isPlaying(): boolean
}

export class ComparisonFeature {
  private comparisonState: ComparisonState = {
    isActive: false,
    originalAudio: null,
    recordedAudio: null,
    isPlayingOriginal: false,
    isPlayingRecorded: false,
    comparisonMode: 'off'
  }

  constructor(
    private player: YouTubePlayerIntegration,
    private ui: UIUtilities
  ) {}

  // Public API methods
  public async startComparison(recordingBlob?: Blob): Promise<void> {
    if (!recordingBlob) {
      this.ui.showToast('No recording available for comparison')
      return
    }

    try {
      // Create audio elements for comparison
      await this.setupComparisonAudio(recordingBlob)
      
      this.comparisonState.isActive = true
      this.ui.updateButtonState('fluent-flow-compare', 'active')
      
      this.showComparisonUI()
      this.ui.showToast('Audio comparison ready - Use controls to compare')
      
    } catch (error) {
      console.error('FluentFlow: Failed to start comparison', error)
      this.ui.showToast('Failed to setup audio comparison')
      this.ui.updateButtonState('fluent-flow-compare', 'inactive')
    }
  }

  public async playOriginal(): Promise<void> {
    if (!this.comparisonState.isActive) {
      this.ui.showToast('Start comparison first')
      return
    }

    try {
      // Stop any existing playback
      await this.stopAllPlayback()

      // Play original video audio (use YouTube player)
      const currentTime = this.player.getCurrentTime()
      if (currentTime !== null) {
        // Get the video element to play original audio
        const video = document.querySelector('video')
        if (video) {
          video.muted = false
          if (!this.player.isPlaying()) {
            video.play()
          }
          this.comparisonState.isPlayingOriginal = true
          this.comparisonState.comparisonMode = 'original'
          this.ui.showToast('Playing original audio')
        }
      }
    } catch (error) {
      console.error('FluentFlow: Failed to play original audio', error)
      this.ui.showToast('Failed to play original audio')
    }
  }

  public async playRecorded(): Promise<void> {
    if (!this.comparisonState.recordedAudio) {
      this.ui.showToast('No recorded audio available')
      return
    }

    try {
      // Stop any existing playback
      await this.stopAllPlayback()

      // Play recorded audio
      await this.comparisonState.recordedAudio.play()
      this.comparisonState.isPlayingRecorded = true
      this.comparisonState.comparisonMode = 'recorded'
      this.ui.showToast('Playing recorded audio')
      
    } catch (error) {
      console.error('FluentFlow: Failed to play recorded audio', error)
      this.ui.showToast('Failed to play recorded audio')
    }
  }

  public async playSimultaneous(): Promise<void> {
    if (!this.comparisonState.recordedAudio) {
      this.ui.showToast('No recorded audio available')
      return
    }

    try {
      // Stop any existing playback
      await this.stopAllPlayback()

      // Play both original and recorded simultaneously
      const video = document.querySelector('video')
      if (video) {
        video.muted = false
        if (!this.player.isPlaying()) {
          video.play()
        }
        await this.comparisonState.recordedAudio.play()
        
        this.comparisonState.isPlayingOriginal = true
        this.comparisonState.isPlayingRecorded = true
        this.comparisonState.comparisonMode = 'simultaneous'
        this.ui.showToast('Playing both audios simultaneously')
      }
    } catch (error) {
      console.error('FluentFlow: Failed to play simultaneous audio', error)
      this.ui.showToast('Failed to play simultaneous audio')
    }
  }

  public async stopAllPlayback(): Promise<void> {
    // Stop original video
    const video = document.querySelector('video')
    if (video && this.comparisonState.isPlayingOriginal) {
      video.pause()
    }

    // Stop recorded audio
    if (this.comparisonState.recordedAudio && this.comparisonState.isPlayingRecorded) {
      this.comparisonState.recordedAudio.pause()
      this.comparisonState.recordedAudio.currentTime = 0
    }

    this.comparisonState.isPlayingOriginal = false
    this.comparisonState.isPlayingRecorded = false
    this.comparisonState.comparisonMode = 'off'
  }

  public stopComparison(): void {
    this.stopAllPlayback()
    this.hideComparisonUI()
    this.comparisonState.isActive = false
    this.ui.updateButtonState('fluent-flow-compare', 'inactive')
    this.ui.showToast('Audio comparison stopped')
  }

  // State getters
  public isActive(): boolean {
    return this.comparisonState.isActive
  }

  public getComparisonState(): Readonly<ComparisonState> {
    return { ...this.comparisonState }
  }

  // Cleanup method
  public destroy(): void {
    this.stopAllPlayback()
    this.hideComparisonUI()
    
    if (this.comparisonState.originalAudio) {
      this.comparisonState.originalAudio.remove()
    }
    
    if (this.comparisonState.recordedAudio) {
      this.comparisonState.recordedAudio.remove()
    }

    this.comparisonState = {
      isActive: false,
      originalAudio: null,
      recordedAudio: null,
      isPlayingOriginal: false,
      isPlayingRecorded: false,
      comparisonMode: 'off'
    }
  }

  // Private methods
  private async setupComparisonAudio(recordingBlob: Blob): Promise<void> {
    // Create audio element for recorded audio
    this.comparisonState.recordedAudio = new Audio(URL.createObjectURL(recordingBlob))
    
    // Set up event handlers
    this.comparisonState.recordedAudio.addEventListener('ended', () => {
      this.comparisonState.isPlayingRecorded = false
      if (this.comparisonState.comparisonMode === 'recorded') {
        this.comparisonState.comparisonMode = 'off'
      }
    })

    this.comparisonState.recordedAudio.addEventListener('error', (error) => {
      console.error('FluentFlow: Recorded audio error', error)
      this.ui.showToast('Error with recorded audio')
    })

    // Prepare audio for playback
    this.comparisonState.recordedAudio.preload = 'auto'
  }

  private showComparisonUI(): void {
    // Remove existing comparison UI
    const existingUI = document.getElementById('fluent-flow-comparison-ui')
    if (existingUI) {
      existingUI.remove()
    }

    // Create comparison control panel
    const comparisonPanel = document.createElement('div')
    comparisonPanel.id = 'fluent-flow-comparison-ui'
    comparisonPanel.style.cssText = `
      position: fixed;
      top: 120px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      padding: 16px;
      z-index: 10001;
      font-family: Arial, sans-serif;
      font-size: 14px;
      color: white;
      min-width: 200px;
      backdrop-filter: blur(10px);
    `

    comparisonPanel.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 12px; text-align: center;">
        Audio Comparison
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button id="ff-play-original" class="ff-comparison-btn">
          🎵 Play Original
        </button>
        <button id="ff-play-recorded" class="ff-comparison-btn">
          🎤 Play Recording
        </button>
        <button id="ff-play-both" class="ff-comparison-btn">
          🎵🎤 Play Both
        </button>
        <button id="ff-stop-comparison" class="ff-comparison-btn">
          ⏹️ Stop
        </button>
        <button id="ff-close-comparison" class="ff-comparison-btn" style="background: rgba(239, 68, 68, 0.2);">
          ✕ Close
        </button>
      </div>
    `

    // Add button styles
    const style = document.createElement('style')
    style.textContent = `
      .ff-comparison-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        color: white;
        padding: 8px 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 12px;
      }
      
      .ff-comparison-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.02);
      }
      
      .ff-comparison-btn:active {
        transform: scale(0.98);
      }
    `
    document.head.appendChild(style)

    // Add event handlers
    comparisonPanel.querySelector('#ff-play-original')?.addEventListener('click', () => {
      this.playOriginal()
    })

    comparisonPanel.querySelector('#ff-play-recorded')?.addEventListener('click', () => {
      this.playRecorded()
    })

    comparisonPanel.querySelector('#ff-play-both')?.addEventListener('click', () => {
      this.playSimultaneous()
    })

    comparisonPanel.querySelector('#ff-stop-comparison')?.addEventListener('click', () => {
      this.stopAllPlayback()
      this.ui.showToast('Playback stopped')
    })

    comparisonPanel.querySelector('#ff-close-comparison')?.addEventListener('click', () => {
      this.stopComparison()
    })

    document.body.appendChild(comparisonPanel)

    // Auto-hide panel after 10 seconds of inactivity
    let hideTimer = setTimeout(() => {
      comparisonPanel.style.opacity = '0.7'
    }, 10000)

    comparisonPanel.addEventListener('mouseenter', () => {
      clearTimeout(hideTimer)
      comparisonPanel.style.opacity = '1'
    })

    comparisonPanel.addEventListener('mouseleave', () => {
      hideTimer = setTimeout(() => {
        comparisonPanel.style.opacity = '0.7'
      }, 10000)
    })
  }

  private hideComparisonUI(): void {
    const comparisonPanel = document.getElementById('fluent-flow-comparison-ui')
    if (comparisonPanel) {
      comparisonPanel.remove()
    }
  }
}