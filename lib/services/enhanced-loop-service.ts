import type { SavedLoop } from '../types/fluent-flow-types'
import { AudioCaptureService } from './audio-capture-service'

export interface CreateLoopWithAudioData {
  title: string
  videoId: string
  videoTitle: string
  videoUrl: string
  startTime: number
  endTime: number
  description?: string
  audioRetentionPolicy?: 'temporary' | 'keep' | 'auto-cleanup'
  captureAudio?: boolean
}

export class EnhancedLoopService {
  private audioCaptureService: AudioCaptureService
  private storageService: any // Will be injected

  constructor(storageService: any) {
    this.audioCaptureService = new AudioCaptureService()
    this.storageService = storageService
  }
  /**
   * Helper method to get a single loop by ID
   */
  private async getLoop(loopId: string): Promise<SavedLoop | null> {
    const allLoops = await this.storageService.getAllUserLoops()
    return allLoops.find(loop => loop.id === loopId) || null
  }

  /**
   * Creates a loop with optional audio capture
   */
  async createLoopWithAudio(loopData: CreateLoopWithAudioData): Promise<SavedLoop> {
    // Step 0: Validate input data
    this.validateLoopData(loopData)

    // Step 1: Create basic loop structure
    const loop: SavedLoop = {
      id: this.generateId(),
      title: loopData.title,
      videoId: loopData.videoId,
      videoTitle: loopData.videoTitle,
      videoUrl: loopData.videoUrl,
      startTime: loopData.startTime,
      endTime: loopData.endTime,
      description: loopData.description,
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Initialize audio fields
      hasAudioSegment: false,
      audioRetentionPolicy: loopData.audioRetentionPolicy || 'auto-cleanup',
      questionsGenerated: false,
      totalQuestionsGenerated: 0
    }

    // Step 2: Capture audio if requested and supported
    if (loopData.captureAudio !== false && AudioCaptureService.isSupported()) {
      try {
        const videoElement = this.getVideoElement()
        if (videoElement) {
          console.log(`Capturing audio for loop: ${loop.title} (${loopData.startTime}s - ${loopData.endTime}s)`)
          
          const audioBlob = await this.audioCaptureService.captureVideoSegment(
            videoElement,
            loopData.startTime,
            loopData.endTime
          )

          // Convert to base64 for storage
          const audioBase64 = await this.audioCaptureService.blobToBase64(audioBlob)
          const audioFormat = this.audioCaptureService.getAudioFormat(audioBlob.type)

          // Update loop with audio data
          loop.hasAudioSegment = true
          loop.audioSegmentBlob = audioBase64
          loop.audioFormat = audioFormat
          loop.audioSize = audioBlob.size
          loop.audioCreatedAt = new Date()
          loop.audioLastUsed = new Date()

          console.log(`Audio captured: ${audioFormat}, ${(audioBlob.size / 1024).toFixed(1)}KB`)
        }
      } catch (error) {
        console.warn('Audio capture failed, saving loop without audio:', error)
        // Continue without audio - this is not a fatal error
      }
    }

    // Step 3: Save to storage
    await this.storageService.saveLoop(loop)
    
    return loop
  }

  /**
   * Updates audio retention policy for a loop
   */
  async updateRetentionPolicy(
    loopId: string, 
    policy: 'temporary' | 'keep' | 'auto-cleanup'
  ): Promise<void> {
    const loop = await this.getLoop(loopId)
    if (!loop) {
      throw new Error('Loop not found')
    }

    loop.audioRetentionPolicy = policy
    loop.updatedAt = new Date()

    // If changing to temporary, schedule for cleanup
    if (policy === 'temporary') {
      loop.cleanupScheduledAt = new Date()
    } else if (policy === 'keep') {
      loop.cleanupScheduledAt = undefined
    }

    await this.storageService.saveLoop(loop)
  }

  /**
   * Marks audio as recently used (updates audioLastUsed)
   */
  async markAudioAsUsed(loopId: string): Promise<void> {
    const loop = await this.getLoop(loopId)
    if (loop && loop.hasAudioSegment) {
      loop.audioLastUsed = new Date()
      loop.updatedAt = new Date()
      await this.storageService.saveLoop(loop)
    }
  }

  /**
   * Updates question generation status
   */
  async updateQuestionStatus(
    loopId: string,
    questionsGenerated: boolean,
    totalQuestions: number = 0
  ): Promise<void> {
    const loop = await this.getLoop(loopId)
    if (!loop) {
      throw new Error('Loop not found')
    }

    loop.questionsGenerated = questionsGenerated
    loop.totalQuestionsGenerated = totalQuestions
    loop.questionsGeneratedAt = questionsGenerated ? new Date() : undefined
    loop.updatedAt = new Date()

    // Mark audio as used when questions are generated
    if (questionsGenerated && loop.hasAudioSegment) {
      loop.audioLastUsed = new Date()
    }

    await this.storageService.saveLoop(loop)
  }

  /**
   * Update loop with transcript metadata and status
   */
  async updateLoopTranscript(
    loopId: string, 
    transcriptData: {
      hasTranscript: boolean
      transcriptText: string
      transcriptLanguage: string
      transcriptSegmentCount: number
      questionsGenerated: boolean
      questionCount: number
      lastQuestionGeneration: string
    }
  ): Promise<void> {
    if (!loopId || typeof loopId !== 'string') {
      throw new Error('Valid loop ID is required')
    }

    if (!transcriptData || typeof transcriptData !== 'object') {
      throw new Error('Valid transcript data is required')
    }

    // Validate required fields
    if (typeof transcriptData.hasTranscript !== 'boolean') {
      throw new Error('hasTranscript must be a boolean')
    }

    if (transcriptData.hasTranscript) {
      if (!transcriptData.transcriptText || typeof transcriptData.transcriptText !== 'string') {
        throw new Error('transcriptText is required when hasTranscript is true')
      }

      if (transcriptData.transcriptText.trim().length === 0) {
        throw new Error('transcriptText cannot be empty')
      }
    }

    try {
      const updateData = {
        hasTranscript: transcriptData.hasTranscript,
        transcriptMetadata: transcriptData.hasTranscript ? {
          text: transcriptData.transcriptText,
          language: transcriptData.transcriptLanguage || 'en',
          segmentCount: transcriptData.transcriptSegmentCount || 0,
          lastAnalyzed: new Date().toISOString()
        } : null,
        questionsGenerated: transcriptData.questionsGenerated,
        questionCount: transcriptData.questionCount || 0,
        lastQuestionGeneration: transcriptData.lastQuestionGeneration,
        updatedAt: new Date().toISOString()
      }

      await this.storageService.updateLoop(loopId, updateData)
      
      console.log(`FluentFlow: Updated loop ${loopId} with transcript metadata`)
    } catch (error) {
      console.error('Failed to update loop transcript data:', error)
      throw new Error(`Failed to update loop transcript: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Removes audio data from loop but keeps the loop itself
   */
  async removeAudioFromLoop(loopId: string): Promise<boolean> {
    const loop = await this.getLoop(loopId)
    if (!loop || !loop.hasAudioSegment) {
      return false
    }

    const originalSize = loop.audioSize || 0

    // Remove audio fields
    loop.hasAudioSegment = false
    loop.audioSegmentBlob = undefined
    loop.audioFormat = undefined
    loop.audioSize = undefined
    loop.cleanupScheduledAt = new Date()
    loop.updatedAt = new Date()

    await this.storageService.saveLoop(loop)

    console.log(`Removed audio from loop ${loopId}: freed ${(originalSize / 1024).toFixed(1)}KB`)
    return true
  }

  /**
   * Re-captures audio for an existing loop
   */
  async recaptureAudio(loopId: string): Promise<boolean> {
    const loop = await this.getLoop(loopId)
    if (!loop) {
      throw new Error('Loop not found')
    }

    if (!AudioCaptureService.isSupported()) {
      throw new Error('Audio capture not supported in this browser')
    }

    const videoElement = this.getVideoElement()
    if (!videoElement) {
      throw new Error('No video element found')
    }

    try {
      // Remove old audio data first
      if (loop.hasAudioSegment) {
        await this.removeAudioFromLoop(loopId)
      }

      // Capture new audio
      const audioBlob = await this.audioCaptureService.captureVideoSegment(
        videoElement,
        loop.startTime,
        loop.endTime
      )

      // Convert and store
      const audioBase64 = await this.audioCaptureService.blobToBase64(audioBlob)
      const audioFormat = this.audioCaptureService.getAudioFormat(audioBlob.type)

      // Update loop with new audio
      loop.hasAudioSegment = true
      loop.audioSegmentBlob = audioBase64
      loop.audioFormat = audioFormat
      loop.audioSize = audioBlob.size
      loop.audioCreatedAt = new Date()
      loop.audioLastUsed = new Date()
      loop.cleanupScheduledAt = undefined
      loop.updatedAt = new Date()

      await this.storageService.saveLoop(loop)

      console.log(`Audio recaptured for loop ${loopId}: ${audioFormat}, ${(audioBlob.size / 1024).toFixed(1)}KB`)
      return true
    } catch (error) {
      console.error('Failed to recapture audio:', error)
      throw error
    }
  }

  /**
   * Gets audio blob from loop for analysis
   */
  getAudioBlob(loop: SavedLoop): Blob | null {
    if (!loop.hasAudioSegment || !loop.audioSegmentBlob) {
      return null
    }

    try {
      return this.audioCaptureService.base64ToBlob(loop.audioSegmentBlob)
    } catch (error) {
      console.error('Failed to convert audio data:', error)
      return null
    }
  }

  /**
   * Estimates storage usage for a potential loop
   */
  estimateLoopAudioSize(startTime: number, endTime: number, format: string = 'webm'): number {
    const duration = endTime - startTime
    return this.audioCaptureService.estimateAudioSize(duration, format)
  }

  /**
   * Gets the YouTube video element from the page
   */
  private getVideoElement(): HTMLVideoElement | null {
    // YouTube main video player
    let videoElement = document.querySelector('video#movie_player') as HTMLVideoElement
    
    if (!videoElement) {
      // Fallback to any video element
      videoElement = document.querySelector('video') as HTMLVideoElement
    }

    if (!videoElement) {
      console.error('No video element found on page')
      return null
    }

    // Verify video is ready
    if (videoElement.readyState < 2) {
      console.warn('Video not ready for capture')
      return null
    }

    return videoElement
  }

  /**
   * Generates unique ID for loops
   */
  private generateId(): string {
    return `loop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Validates loop data before creation
   */
  private validateLoopData(data: CreateLoopWithAudioData): void {
    if (!data.title.trim()) {
      throw new Error('Loop title is required')
    }

    if (!data.videoId) {
      throw new Error('Video ID is required')
    }

    if (data.startTime < 0) {
      throw new Error('Start time cannot be negative')
    }

    if (data.endTime <= data.startTime) {
      throw new Error('End time must be greater than start time')
    }

    const duration = data.endTime - data.startTime
    if (duration > 300) { // 5 minutes
      throw new Error('Loop duration cannot exceed 5 minutes')
    }

    if (duration < 1) { // 1 second minimum
      throw new Error('Loop duration must be at least 1 second')
    }
  }

  /**
   * Gets loop creation statistics
   */
  async getLoopStats(): Promise<{
    totalLoops: number
    loopsWithAudio: number
    totalAudioSize: number
    averageAudioSize: number
  }> {
    const allLoops = await this.storageService.getAllUserLoops()
    const loopsWithAudio = allLoops.filter((loop: SavedLoop) => loop.hasAudioSegment)
    
    const totalAudioSize = loopsWithAudio.reduce(
      (sum: number, loop: SavedLoop) => sum + (loop.audioSize || 0), 
      0
    )

    return {
      totalLoops: allLoops.length,
      loopsWithAudio: loopsWithAudio.length,
      totalAudioSize,
      averageAudioSize: loopsWithAudio.length > 0 ? totalAudioSize / loopsWithAudio.length : 0
    }
  }
}

export default EnhancedLoopService