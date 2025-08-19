// Recording Feature Module - Voice recording functionality
// Clean separation from other features following SoC principles

interface RecordingState {
  isRecording: boolean
  isActive: boolean
  recordingStartTime: number | null
  audioBlob: Blob | null
  mediaRecorder: MediaRecorder | null
}

export interface RecordingButtonStates {
  record: 'inactive' | 'recording' | 'completed' | 'error'
}

export interface UIUtilities {
  showToast(message: string): void
  updateButtonState(buttonId: string, state: 'inactive' | 'active' | 'setting' | 'paused'): void
  formatTime(seconds: number | null): string
}

export class RecordingFeature {
  private recordingState: RecordingState = {
    isRecording: false,
    isActive: false,
    recordingStartTime: null,
    audioBlob: null,
    mediaRecorder: null
  }

  private audioStream: MediaStream | null = null
  private recordingTimer: NodeJS.Timeout | null = null

  constructor(
    private ui: UIUtilities,
    private playerService?: { getVideoInfo(): { id: string | null, title: string | null, url: string | null } }
  ) {}

  // Public API methods
  public async toggleRecording(): Promise<void> {
    if (!this.recordingState.isRecording) {
      await this.startRecording()
    } else {
      await this.stopRecording()
    }
  }

  public async startRecording(): Promise<void> {
    try {
      // Request microphone access with better quality settings
      this.audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000, // Higher sample rate for better quality
          channelCount: 1 // Mono recording for smaller file size
        } 
      })

      // Wait for microphone to stabilize to prevent initial crackling
      await new Promise(resolve => setTimeout(resolve, 200))

      // Create MediaRecorder with better settings
      this.recordingState.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: this.getSupportedMimeType(),
        audioBitsPerSecond: 128000 // 128kbps for good quality
      })

      const audioChunks: Blob[] = []
      let isFirstChunk = true

      this.recordingState.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Skip the first chunk to avoid initial crackling
          if (isFirstChunk) {
            console.log('FluentFlow: Skipping first audio chunk to prevent crackling')
            isFirstChunk = false
            return
          }
          audioChunks.push(event.data)
        }
      }

      this.recordingState.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { 
          type: this.getSupportedMimeType() 
        })
        
        this.recordingState.audioBlob = audioBlob
        
        // Save recording to background script
        await this.saveRecordingToStorage(audioBlob)
        
        // Clean up audio stream
        if (this.audioStream) {
          this.audioStream.getTracks().forEach(track => track.stop())
          this.audioStream = null
        }
      }

      this.recordingState.mediaRecorder.onerror = (event) => {
        console.error('FluentFlow: Recording error', event)
        this.ui.showToast('Recording error occurred')
        this.ui.updateButtonState('fluent-flow-record', 'inactive')
        this.resetRecordingState()
      }

      // Start recording with smaller intervals for smoother data collection
      this.recordingState.mediaRecorder.start(250) // Collect data every 250ms
      this.recordingState.isRecording = true
      this.recordingState.isActive = true
      this.recordingState.recordingStartTime = Date.now()

      this.ui.updateButtonState('fluent-flow-record', 'active')
      this.ui.showToast('Recording started...')
      
      // Start recording timer for visual feedback
      this.startRecordingTimer()

    } catch (error) {
      console.error('FluentFlow: Failed to start recording', error)
      this.ui.showToast('Failed to access microphone')
      this.ui.updateButtonState('fluent-flow-record', 'inactive')
      this.resetRecordingState()
    }
  }

  public async stopRecording(): Promise<void> {
    if (!this.recordingState.isRecording || !this.recordingState.mediaRecorder) {
      return
    }

    try {
      this.recordingState.mediaRecorder.stop()
      this.recordingState.isRecording = false
      
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer)
        this.recordingTimer = null
      }

      this.updateRecordingButton()
      
    } catch (error) {
      console.error('FluentFlow: Failed to stop recording', error)
      this.ui.showToast('Failed to stop recording')
      this.resetRecordingState()
    }
  }

  private async saveRecordingToStorage(audioBlob: Blob): Promise<void> {
    try {
      const duration = this.getRecordingDuration() / 1000 // Convert to seconds
      
      // Get video info if player service is available
      let videoInfo = { id: 'unknown', title: 'Unknown Video', url: window.location.href }
      if (this.playerService) {
        const playerVideoInfo = this.playerService.getVideoInfo()
        videoInfo = {
          id: playerVideoInfo.id || 'unknown',
          title: playerVideoInfo.title || 'Unknown Video',
          url: playerVideoInfo.url || window.location.href
        }
      }

      // Convert Blob to base64 for message passing
      const audioDataBase64 = await this.blobToBase64(audioBlob)

      // Save recording via background script
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_RECORDING',
        data: {
          audioDataBase64, // Send base64 instead of Blob
          audioSize: audioBlob.size,
          videoId: videoInfo.id,
          duration,
          title: `Recording from ${videoInfo.title}`,
          timestamp: Date.now()
        }
      })

      if (response.success) {
        this.ui.showToast(`Recording saved (${this.formatRecordingDuration()})`)
        this.ui.updateButtonState('fluent-flow-record', 'inactive')
        console.log('FluentFlow: Recording saved successfully', response.data)
      } else {
        throw new Error(response.error || 'Failed to save recording')
      }

    } catch (error) {
      console.error('FluentFlow: Failed to save recording', error)
      this.ui.showToast('Recording failed to save')
      this.ui.updateButtonState('fluent-flow-record', 'inactive')
    }
  }

  public getRecordingBlob(): Blob | null {
    return this.recordingState.audioBlob
  }

  public hasRecording(): boolean {
    return this.recordingState.audioBlob !== null
  }

  public async playRecording(): Promise<void> {
    if (!this.recordingState.audioBlob) {
      this.ui.showToast('No recording available')
      return
    }

    try {
      const audio = new Audio(URL.createObjectURL(this.recordingState.audioBlob))
      await audio.play()
      this.ui.showToast('Playing recording...')
    } catch (error) {
      console.error('FluentFlow: Failed to play recording', error)
      this.ui.showToast('Failed to play recording')
    }
  }

  public clearRecording(): void {
    this.resetRecordingState()
    this.ui.updateButtonState('fluent-flow-record', 'inactive')
    this.ui.showToast('Recording cleared')
  }

  // Methods for loading saved recordings
  public async loadSavedRecordings(videoId?: string): Promise<any[]> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'LIST_RECORDINGS',
        data: { videoId }
      })

      if (response.success) {
        return response.data || []
      } else {
        console.error('Failed to load recordings:', response.error)
        return []
      }
    } catch (error) {
      console.error('FluentFlow: Failed to load saved recordings', error)
      return []
    }
  }

  public async deleteRecording(recordingId: string): Promise<boolean> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_RECORDING',
        data: { id: recordingId }
      })

      if (response.success) {
        this.ui.showToast('Recording deleted')
        return true
      } else {
        this.ui.showToast('Failed to delete recording')
        return false
      }
    } catch (error) {
      console.error('FluentFlow: Failed to delete recording', error)
      this.ui.showToast('Failed to delete recording')
      return false
    }
  }

  public async loadRecording(recordingId: string): Promise<Blob | null> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'LOAD_RECORDING',
        data: { id: recordingId }
      })

      if (response.success && response.data) {
        return response.data.audioData
      } else {
        console.error('Failed to load recording:', response.error)
        return null
      }
    } catch (error) {
      console.error('FluentFlow: Failed to load recording', error)
      return null
    }
  }

  // State getters
  public isRecording(): boolean {
    return this.recordingState.isRecording
  }

  public getRecordingState(): Readonly<RecordingState> {
    return { ...this.recordingState }
  }

  public getRecordingDuration(): number {
    if (!this.recordingState.recordingStartTime) return 0
    return Date.now() - this.recordingState.recordingStartTime
  }

  // Cleanup method
  public destroy(): void {
    if (this.recordingState.isRecording) {
      this.stopRecording()
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop())
      this.audioStream = null
    }

    if (this.recordingTimer) {
      clearInterval(this.recordingTimer)
      this.recordingTimer = null
    }

    this.resetRecordingState()
  }

  // Private methods
  private resetRecordingState(): void {
    this.recordingState = {
      isRecording: false,
      isActive: false,
      recordingStartTime: null,
      audioBlob: null,
      mediaRecorder: null
    }

    if (this.recordingTimer) {
      clearInterval(this.recordingTimer)
      this.recordingTimer = null
    }
  }

  private getSupportedMimeType(): string {
    // Try different audio formats in order of preference
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ]

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType
      }
    }

    // Fallback to default
    return 'audio/webm'
  }

  private formatRecordingDuration(): string {
    const duration = this.getRecordingDuration()
    const seconds = Math.floor(duration / 1000)
    return this.ui.formatTime(seconds)
  }

  private startRecordingTimer(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer)
    }

    this.recordingTimer = setInterval(() => {
      if (this.recordingState.isRecording) {
        this.updateRecordingButton()
      }
    }, 1000) // Update every second
  }

  private updateRecordingButton(): void {
    const button = document.getElementById('fluent-flow-record')
    if (!button) return

    let tooltip = 'Voice Recording (Alt+R)'

    if (this.recordingState.isRecording) {
      const duration = this.formatRecordingDuration()
      tooltip = `Recording... ${duration} (Alt+R to stop)`
      // Add pulsing effect during recording
      button.style.animation = 'pulse 1s infinite'
    } else if (this.recordingState.audioBlob) {
      const duration = this.formatRecordingDuration()
      tooltip = `Recording saved: ${duration} (Alt+R for new recording)`
      button.style.animation = ''
    } else {
      tooltip = 'Voice Recording (Alt+R)'
      button.style.animation = ''
    }

    button.title = tooltip
    button.setAttribute('data-tooltip-title', tooltip)
    button.setAttribute('aria-label', tooltip)

    // Add pulse animation styles if not already present
    if (!document.getElementById('recording-pulse-styles')) {
      const style = document.createElement('style')
      style.id = 'recording-pulse-styles'
      style.textContent = `
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `
      document.head.appendChild(style)
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix (data:audio/webm;base64,)
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }
}