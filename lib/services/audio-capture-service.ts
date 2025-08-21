// Audio capture service for YouTube video segments

export class AudioCaptureService {
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private isCapturing = false

  /**
   * Captures audio segment from YouTube video element
   */
  async captureVideoSegment(
    videoElement: HTMLVideoElement,
    startTime: number,
    endTime: number
  ): Promise<Blob> {
    // Input validation
    if (!videoElement) {
      throw new Error('Video element is required')
    }

    if (!(videoElement instanceof HTMLVideoElement)) {
      throw new Error('Invalid video element provided')
    }

    if (typeof startTime !== 'number' || startTime < 0) {
      throw new Error('Start time must be a non-negative number')
    }

    if (typeof endTime !== 'number' || endTime < 0) {
      throw new Error('End time must be a non-negative number')
    }

    if (this.isCapturing) {
      throw new Error('Audio capture already in progress')
    }

    if (startTime >= endTime) {
      throw new Error('Invalid time range: startTime must be less than endTime')
    }

    const duration = endTime - startTime
    if (duration > 300) { // 5 minutes max
      throw new Error('Audio segment too long (max 5 minutes)')
    }

    if (duration < 0.1) { // 100ms minimum
      throw new Error('Audio segment too short (min 100ms)')
    }

    // Check if video is loaded enough
    if (videoElement.readyState < HTMLMediaElement.HAVE_METADATA) {
      throw new Error('Video not ready for capture (no metadata loaded)')
    }

    if (videoElement.duration && endTime > videoElement.duration) {
      throw new Error('End time exceeds video duration')
    }

    this.isCapturing = true
    this.recordedChunks = []

    try {
      // Step 1: Get video stream with audio
      const stream = this.getVideoStream(videoElement)
      
      // Step 2: Create MediaRecorder for audio only
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.getSupportedMimeType()
      })

      // Step 3: Set up recording promise
      const audioBlob = await this.recordSegment(videoElement, startTime, duration)
      
      return audioBlob
    } catch (error) {
      console.error('Audio capture failed:', error)
      throw new Error(`Failed to capture audio: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      this.cleanup()
      this.isCapturing = false
    }
  }

  /**
   * Gets video stream from YouTube video element
   */
  private getVideoStream(videoElement: HTMLVideoElement): MediaStream {
    try {
      // Try to get stream from video element
      if ((videoElement as any).captureStream) {
        return (videoElement as any).captureStream()
      }
      
      // Fallback for older browsers
      if ((videoElement as any).mozCaptureStream) {
        return (videoElement as any).mozCaptureStream()
      }

      throw new Error('Video stream capture not supported in this browser')
    } catch (error) {
      throw new Error('Failed to access video stream. Make sure video is playing.')
    }
  }

  /**
   * Gets best supported MIME type for recording
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }

    // Fallback
    return 'audio/webm'
  }

  /**
   * Records audio segment with precise timing
   */
  private async recordSegment(
    videoElement: HTMLVideoElement,
    startTime: number,
    duration: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'))
        return
      }

      let recordingTimeout: NodeJS.Timeout
      let seekTimeout: NodeJS.Timeout

      // Set up data collection
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }

      // Handle recording completion
      this.mediaRecorder.onstop = () => {
        clearTimeout(recordingTimeout)
        clearTimeout(seekTimeout)

        if (this.recordedChunks.length === 0) {
          reject(new Error('No audio data captured'))
          return
        }

        const audioBlob = new Blob(this.recordedChunks, { 
          type: this.mediaRecorder!.mimeType 
        })
        
        resolve(audioBlob)
      }

      // Handle errors
      this.mediaRecorder.onerror = (event) => {
        clearTimeout(recordingTimeout)
        clearTimeout(seekTimeout)
        reject(new Error(`Recording failed: ${event}`))
      }

      // Seek to start time and begin recording
      const originalTime = videoElement.currentTime
      const wasPlaying = !videoElement.paused

      try {
        // Seek to start position
        videoElement.currentTime = startTime
        
        // Wait a bit for seek to complete, then start recording
        seekTimeout = setTimeout(() => {
          if (!videoElement.paused) {
            videoElement.pause()
          }
          
          videoElement.play().then(() => {
            // Start recording after video starts playing
            setTimeout(() => {
              if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
                this.mediaRecorder.start(100) // Collect data every 100ms
                
                // Stop recording after duration
                recordingTimeout = setTimeout(() => {
                  if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                    this.mediaRecorder.stop()
                  }
                  
                  // Restore original playback state
                  videoElement.currentTime = originalTime
                  if (!wasPlaying) {
                    videoElement.pause()
                  }
                }, duration * 1000)
              }
            }, 200) // Small delay for video to start
          }).catch(reject)
        }, 100) // Wait for seek

      } catch (error) {
        clearTimeout(recordingTimeout)
        clearTimeout(seekTimeout)
        reject(error)
      }
    })
  }

  /**
   * Converts Blob to Base64 string for storage
   */
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        resolve(result)
      }
      reader.onerror = () => reject(new Error('Failed to convert blob to base64'))
      reader.readAsDataURL(blob)
    })
  }

  /**
   * Converts Base64 string back to Blob
   */
  base64ToBlob(base64: string): Blob {
    // Input validation
    if (!base64 || typeof base64 !== 'string') {
      throw new Error('Base64 string is required')
    }

    if (!base64.includes(',')) {
      throw new Error('Invalid base64 format: missing data URL header')
    }

    try {
      const [header, data] = base64.split(',')
      
      if (!header || !data) {
        throw new Error('Invalid base64 format: malformed data URL')
      }

      if (!header.startsWith('data:')) {
        throw new Error('Invalid base64 format: missing data URL prefix')
      }

      const mimeType = header.match(/:(.*?);/)?.[1] || 'audio/webm'
      
      // Validate it's an audio MIME type
      if (!mimeType.startsWith('audio/')) {
        throw new Error('Invalid MIME type: expected audio format')
      }

      const byteCharacters = atob(data)
      const byteNumbers = new Array(byteCharacters.length)

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }

      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: mimeType })

      // Additional validation
      if (blob.size === 0) {
        throw new Error('Converted blob is empty')
      }

      return blob
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Invalid base64 audio data')
    }
  }

  /**
   * Gets audio format from blob or MIME type
   */
  getAudioFormat(mimeType: string): 'webm' | 'wav' | 'mp3' {
    if (mimeType.includes('webm')) return 'webm'
    if (mimeType.includes('wav')) return 'wav'
    if (mimeType.includes('mp3')) return 'mp3'
    return 'webm' // default
  }

  /**
   * Estimates audio quality and size
   */
  estimateAudioSize(duration: number, format: string = 'webm'): number {
    // Rough estimates in bytes per second
    const bitrates = {
      'webm': 16000, // ~128kbps
      'wav': 176400, // ~1411kbps (CD quality)
      'mp3': 16000   // ~128kbps
    }
    
    const rate = bitrates[format as keyof typeof bitrates] || bitrates.webm
    return Math.round(duration * rate)
  }

  /**
   * Cleanup resources
   */
  private cleanup() {
    if (this.mediaRecorder) {
      this.mediaRecorder.ondataavailable = null
      this.mediaRecorder.onstop = null
      this.mediaRecorder.onerror = null
      this.mediaRecorder = null
    }
    this.recordedChunks = []
  }

  /**
   * Check if browser supports audio capture
   */
  static isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getDisplayMedia &&
      window.MediaRecorder &&
      (HTMLVideoElement.prototype as any).captureStream
    )
  }

  /**
   * Get supported audio formats
   */
  static getSupportedFormats(): string[] {
    const formats = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ]

    return formats.filter(format => MediaRecorder.isTypeSupported(format))
  }
}

export default AudioCaptureService