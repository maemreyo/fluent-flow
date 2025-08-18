import type {
  AudioRecording,
  LoopSegment,
  AudioComparisonState,
  FluentFlowError
} from '../types/fluent-flow-types'
import { YouTubeService } from './youtube-service'

export class AudioComparisonService {
  private youtubeService: YouTubeService
  private currentAudio: HTMLAudioElement | null = null
  private comparisonInterval: NodeJS.Timeout | null = null
  private isComparing = false

  constructor(youtubeService: YouTubeService) {
    this.youtubeService = youtubeService
  }

  public async startComparison(
    recording: AudioRecording,
    segment: LoopSegment,
    mode: 'original' | 'recorded' | 'alternating' = 'alternating'
  ): Promise<void> {
    if (this.isComparing) {
      this.stopComparison()
    }

    this.isComparing = true

    try {
      switch (mode) {
        case 'original':
          await this.playOriginal(segment)
          break
        case 'recorded':
          await this.playRecording(recording)
          break
        case 'alternating':
          await this.playAlternating(recording, segment)
          break
      }
    } catch (error) {
      this.isComparing = false
      throw this.createError('RECORDING_FAILED', `Comparison failed: ${error}`)
    }
  }

  public stopComparison(): void {
    this.isComparing = false
    
    if (this.comparisonInterval) {
      clearInterval(this.comparisonInterval)
      this.comparisonInterval = null
    }

    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio = null
    }

    this.youtubeService.pause()
  }

  private async playOriginal(segment: LoopSegment): Promise<void> {
    await this.youtubeService.seekTo(segment.startTime)
    await this.youtubeService.play()

    // Auto-stop at end time
    const duration = (segment.endTime - segment.startTime) * 1000
    setTimeout(() => {
      if (this.isComparing) {
        this.youtubeService.pause()
      }
    }, duration)
  }

  private async playRecording(recording: AudioRecording): Promise<void> {
    const audioURL = URL.createObjectURL(recording.audioData)
    this.currentAudio = new Audio(audioURL)

    this.currentAudio.onended = () => {
      URL.revokeObjectURL(audioURL)
      this.currentAudio = null
    }

    this.currentAudio.onerror = () => {
      URL.revokeObjectURL(audioURL)
      this.currentAudio = null
      throw this.createError('RECORDING_FAILED', 'Failed to play recording')
    }

    await this.currentAudio.play()
  }

  private async playAlternating(recording: AudioRecording, segment: LoopSegment): Promise<void> {
    const segmentDuration = (segment.endTime - segment.startTime) * 1000
    const playbackInterval = Math.min(segmentDuration, 3000) // Max 3 seconds per cycle
    
    let isPlayingOriginal = true
    let cycleCount = 0
    const maxCycles = 6 // 3 cycles of each

    const playNext = async () => {
      if (!this.isComparing || cycleCount >= maxCycles) {
        this.stopComparison()
        return
      }

      try {
        if (isPlayingOriginal) {
          // Stop any current audio
          if (this.currentAudio) {
            this.currentAudio.pause()
            this.currentAudio = null
          }

          // Play original segment
          await this.youtubeService.seekTo(segment.startTime)
          await this.youtubeService.play()

          // Stop YouTube after segment duration
          setTimeout(async () => {
            if (this.isComparing) {
              await this.youtubeService.pause()
            }
          }, playbackInterval)

        } else {
          // Pause YouTube
          await this.youtubeService.pause()

          // Play recording
          await this.playRecording(recording)

          // Auto-stop recording after interval
          setTimeout(() => {
            if (this.currentAudio && this.isComparing) {
              this.currentAudio.pause()
              this.currentAudio = null
            }
          }, Math.min(playbackInterval, recording.duration * 1000))
        }

        isPlayingOriginal = !isPlayingOriginal
        cycleCount++

        // Schedule next playback
        setTimeout(playNext, playbackInterval + 500) // 500ms gap between switches

      } catch (error) {
        console.error('Error in alternating playback:', error)
        this.stopComparison()
      }
    }

    // Start the alternating playback
    await playNext()
  }

  public async playSegmentLoop(segment: LoopSegment, loops: number = 3): Promise<void> {
    let currentLoop = 0

    const playLoop = async () => {
      if (currentLoop >= loops || !this.isComparing) {
        return
      }

      await this.youtubeService.seekTo(segment.startTime)
      await this.youtubeService.play()

      const duration = (segment.endTime - segment.startTime) * 1000

      setTimeout(async () => {
        if (this.isComparing) {
          await this.youtubeService.pause()
          currentLoop++
          
          // Brief pause between loops
          setTimeout(playLoop, 500)
        }
      }, duration)
    }

    this.isComparing = true
    await playLoop()
  }

  public async playRecordingLoop(recording: AudioRecording, loops: number = 3): Promise<void> {
    let currentLoop = 0

    const playLoop = async () => {
      if (currentLoop >= loops || !this.isComparing) {
        return
      }

      await this.playRecording(recording)

      // Wait for recording to finish, then play again
      if (this.currentAudio) {
        this.currentAudio.onended = () => {
          currentLoop++
          if (currentLoop < loops && this.isComparing) {
            setTimeout(playLoop, 500) // Brief pause between loops
          }
        }
      }
    }

    this.isComparing = true
    await playLoop()
  }

  public async analyzeDifferences(
    recording: AudioRecording,
    segment: LoopSegment
  ): Promise<{
    durationDifference: number
    suggestedImprovements: string[]
  }> {
    const segmentDuration = segment.endTime - segment.startTime
    const durationDifference = Math.abs(recording.duration - segmentDuration)

    const suggestedImprovements: string[] = []

    // Duration analysis
    if (durationDifference > 0.5) {
      if (recording.duration > segmentDuration) {
        suggestedImprovements.push('Try speaking faster to match the original pace')
      } else {
        suggestedImprovements.push('Try speaking slower and more clearly')
      }
    }

    // Additional suggestions based on common language learning issues
    if (recording.duration < 1) {
      suggestedImprovements.push('Try recording a longer segment for better practice')
    }

    if (segment.endTime - segment.startTime > 10) {
      suggestedImprovements.push('Consider breaking down longer segments into smaller parts')
    }

    return {
      durationDifference,
      suggestedImprovements
    }
  }

  public isCurrentlyComparing(): boolean {
    return this.isComparing
  }

  public async createAudioVisualization(recording: AudioRecording): Promise<number[]> {
    // This would require Web Audio API for proper audio analysis
    // For MVP, return a simplified visualization
    const duration = recording.duration
    const sampleCount = Math.min(100, Math.max(10, Math.floor(duration * 10)))
    
    // Generate mock waveform data
    const waveform: number[] = []
    for (let i = 0; i < sampleCount; i++) {
      // Simple sine wave with some randomness for demo
      const t = (i / sampleCount) * Math.PI * 2
      const amplitude = Math.sin(t) * 0.5 + Math.random() * 0.3
      waveform.push(Math.max(0, Math.min(1, amplitude)))
    }

    return waveform
  }

  private createError(code: FluentFlowError['code'], message: string): FluentFlowError {
    const error = new Error(message) as FluentFlowError
    error.code = code
    error.context = {
      isComparing: this.isComparing,
      hasCurrentAudio: !!this.currentAudio,
      youtubePlayerReady: this.youtubeService.isPlayerReady()
    }
    return error
  }

  public destroy(): void {
    this.stopComparison()
  }
}