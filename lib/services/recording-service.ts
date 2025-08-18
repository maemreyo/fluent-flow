import type {
  AudioRecording,
  FluentFlowError,
  FluentFlowSettings
} from '../types/fluent-flow-types'

export class RecordingService {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null
  private recordingStartTime: number | null = null
  private maxDuration: number = 300000 // 5 minutes default

  constructor(private settings: FluentFlowSettings) {
    this.maxDuration = settings.maxRecordingDuration * 1000
  }

  public async initialize(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.getOptimalSampleRate(),
          channelCount: 1 // Mono for language learning
        }
      })
    } catch (error) {
      throw this.createError('PERMISSION_DENIED', `Microphone access denied: ${error}`)
    }
  }

  private getOptimalSampleRate(): number {
    switch (this.settings.audioQuality) {
      case 'low': return 16000
      case 'medium': return 22050
      case 'high': return 44100
      default: return 22050
    }
  }

  private getMimeType(): string {
    const possibleTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ]

    for (const type of possibleTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }

    return '' // Let browser choose
  }

  public async startRecording(videoId: string): Promise<void> {
    if (!this.stream) {
      await this.initialize()
    }

    if (this.mediaRecorder?.state === 'recording') {
      throw this.createError('RECORDING_FAILED', 'Recording already in progress')
    }

    try {
      this.audioChunks = []
      this.recordingStartTime = Date.now()

      const mimeType = this.getMimeType()
      this.mediaRecorder = new MediaRecorder(this.stream!, {
        mimeType: mimeType || undefined,
        audioBitsPerSecond: this.getAudioBitrate()
      })

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        throw this.createError('RECORDING_FAILED', 'Recording failed due to media recorder error')
      }

      // Auto-stop after max duration
      setTimeout(() => {
        if (this.mediaRecorder?.state === 'recording') {
          this.mediaRecorder.stop()
        }
      }, this.maxDuration)

      this.mediaRecorder.start(250) // Collect data every 250ms

    } catch (error) {
      throw this.createError('RECORDING_FAILED', `Failed to start recording: ${error}`)
    }
  }

  private getAudioBitrate(): number {
    switch (this.settings.audioQuality) {
      case 'low': return 32000   // 32 kbps
      case 'medium': return 64000 // 64 kbps
      case 'high': return 128000  // 128 kbps
      default: return 64000
    }
  }

  public async stopRecording(videoId: string, segmentId?: string): Promise<AudioRecording> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(this.createError('RECORDING_FAILED', 'No active recording to stop'))
        return
      }

      this.mediaRecorder.onstop = () => {
        try {
          const audioBlob = new Blob(this.audioChunks, {
            type: this.mediaRecorder?.mimeType || 'audio/webm'
          })

          const duration = this.recordingStartTime 
            ? (Date.now() - this.recordingStartTime) / 1000
            : 0

          const recording: AudioRecording = {
            id: `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            segmentId,
            videoId,
            audioData: audioBlob,
            duration,
            createdAt: new Date()
          }

          // Clean up
          this.cleanup()

          resolve(recording)
        } catch (error) {
          reject(this.createError('RECORDING_FAILED', `Failed to create recording: ${error}`))
        }
      }

      this.mediaRecorder.stop()
    })
  }

  public pauseRecording(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.pause()
    }
  }

  public resumeRecording(): void {
    if (this.mediaRecorder?.state === 'paused') {
      this.mediaRecorder.resume()
    }
  }

  public isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording'
  }

  public isPaused(): boolean {
    return this.mediaRecorder?.state === 'paused'
  }

  public getRecordingDuration(): number {
    if (!this.recordingStartTime) return 0
    return (Date.now() - this.recordingStartTime) / 1000
  }

  public async createAudioURL(recording: AudioRecording): Promise<string> {
    return URL.createObjectURL(recording.audioData)
  }

  public revokeAudioURL(url: string): void {
    URL.revokeObjectURL(url)
  }

  public async playRecording(recording: AudioRecording): Promise<HTMLAudioElement> {
    const audioURL = await this.createAudioURL(recording)
    const audio = new Audio(audioURL)
    
    audio.onended = () => {
      this.revokeAudioURL(audioURL)
    }

    return audio
  }

  public async exportRecording(recording: AudioRecording, format: 'wav' | 'mp3' = 'wav'): Promise<Blob> {
    if (format === 'wav') {
      return this.convertToWav(recording.audioData)
    }
    
    // For MP3, would need additional library like lamejs
    // For now, return original blob
    return recording.audioData
  }

  private async convertToWav(audioBlob: Blob): Promise<Blob> {
    // This is a simplified WAV conversion
    // In a real implementation, you'd want to use Web Audio API for proper conversion
    const arrayBuffer = await audioBlob.arrayBuffer()
    
    // For WebM/Opus audio, we'll return as-is since proper conversion requires more complex processing
    // In production, consider using libraries like ffmpeg.wasm for format conversion
    return audioBlob
  }

  public cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
    
    this.mediaRecorder = null
    this.audioChunks = []
    this.recordingStartTime = null
  }

  public async checkMicrophonePermission(): Promise<boolean> {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      return result.state === 'granted'
    } catch {
      // Fallback: try to access microphone
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach(track => track.stop())
        return true
      } catch {
        return false
      }
    }
  }

  public async requestMicrophonePermission(): Promise<boolean> {
    try {
      await this.initialize()
      return true
    } catch {
      return false
    }
  }

  private createError(code: FluentFlowError['code'], message: string): FluentFlowError {
    const error = new Error(message) as FluentFlowError
    error.code = code
    error.context = {
      mediaRecorderState: this.mediaRecorder?.state,
      hasStream: !!this.stream,
      recordingDuration: this.getRecordingDuration()
    }
    return error
  }
}