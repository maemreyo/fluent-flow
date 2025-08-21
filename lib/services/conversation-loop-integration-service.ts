import type { 
  SavedLoop, 
  ConversationQuestions,
  ConversationPracticeSession,
  StorageStats,
  CleanupResult
} from '../types/fluent-flow-types'
import { EnhancedLoopService, type CreateLoopWithAudioData } from './enhanced-loop-service'
import { ConversationAnalysisService, type GeminiConfig } from './conversation-analysis-service'
import { AudioStorageCleanupService } from './audio-storage-cleanup-service'
import { CleanupSchedulerManager } from './auto-cleanup-scheduler'
import { youtubeTranscriptService, type TranscriptResult, type TranscriptError } from './youtube-transcript-service'

/**
 * Integration service that coordinates all conversation loop features
 */
export class ConversationLoopIntegrationService {
  private loopService: EnhancedLoopService
  private analysisService: ConversationAnalysisService | null = null
  private cleanupService: AudioStorageCleanupService
  private storageService: any

  constructor(storageService: any, geminiConfig?: GeminiConfig) {
    this.storageService = storageService
    this.loopService = new EnhancedLoopService(storageService)
    this.cleanupService = new AudioStorageCleanupService(storageService)
    
    if (geminiConfig) {
      this.analysisService = new ConversationAnalysisService(geminiConfig)
    }

    // Initialize auto cleanup scheduler
    CleanupSchedulerManager.initialize(this.cleanupService)
  }

  /**
   * Creates a new loop with audio capture and optional question generation
   */
  async createConversationLoop(
    loopData: CreateLoopWithAudioData,
    generateQuestions: boolean = false
  ): Promise<{
    loop: SavedLoop
    questions?: ConversationQuestions
    error?: string
  }> {
    // Input validation
    if (!loopData) {
      throw new Error('Loop data is required')
    }

    if (typeof generateQuestions !== 'boolean') {
      throw new Error('generateQuestions must be a boolean')
    }

    // Validate generateQuestions requirement
    if (generateQuestions && !this.analysisService) {
      throw new Error('Gemini API not configured. Cannot generate questions without API credentials.')
    }

    try {
      // Create loop with audio (this will validate loopData internally)
      const loop = await this.loopService.createLoopWithAudio(loopData)
      
      const result: any = { loop }

      // Generate questions if requested and audio was captured
      if (generateQuestions && loop.hasAudioSegment && this.analysisService) {
        try {
          const questions = await this.analysisService.generateQuestions(loop)
          
          // Update loop status
          await this.loopService.updateQuestionStatus(
            loop.id, 
            true, 
            questions.questions.length
          )
          
          result.questions = questions

          // Schedule cleanup for successful question generation (after 7 days)
          await this.cleanupService.scheduleCleanup(loop.id, 7)
          
        } catch (questionError) {
          console.error('Question generation failed:', questionError)
          result.error = `Loop created but question generation failed: ${questionError instanceof Error ? questionError.message : 'Unknown error'}`
          
          // Schedule earlier cleanup for failed question generation (after 2 days)
          await this.cleanupService.scheduleCleanup(loop.id, 2)
        }
      }

      return result
      
    } catch (error) {
      console.error('Failed to create conversation loop:', error)
      throw new Error(`Failed to create loop: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generates questions for an existing loop
   */
  async generateQuestionsForLoop(loopId: string): Promise<ConversationQuestions> {
    if (!this.analysisService) {
      throw new Error('Gemini API not configured. Please provide API credentials.')
    }

    const loop = await this.storageService.getLoop(loopId)
    if (!loop) {
      throw new Error('Loop not found')
    }

    if (!loop.hasAudioSegment) {
      throw new Error('No audio segment available. Please recreate the loop with audio capture enabled.')
    }

    try {
      // Mark audio as recently used
      await this.loopService.markAudioAsUsed(loopId)
      
      // Generate questions
      const questions = await this.analysisService.generateQuestions(loop)
      
      // Update loop status
      await this.loopService.updateQuestionStatus(
        loopId, 
        true, 
        questions.questions.length
      )

      // Schedule cleanup after successful generation
      await this.cleanupService.scheduleCleanup(loopId, 7)

      return questions
      
    } catch (error) {
      console.error('Question generation failed:', error)
      throw new Error(`Question generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate questions using YouTube transcript for a loop
   */
  async generateQuestionsFromTranscript(loopId: string): Promise<ConversationQuestions> {
    if (!this.analysisService) {
      throw new Error('Gemini API not configured. Please provide API credentials.')
    }

    const loop = await this.storageService.getLoop(loopId)
    if (!loop) {
      throw new Error('Loop not found')
    }

    if (!loop.videoId) {
      throw new Error('Video ID not available for transcript extraction')
    }

    try {
      // Extract transcript for the specific time segment
      const transcriptResult = await youtubeTranscriptService.getTranscriptSegment(
        loop.videoId,
        loop.startTime,
        loop.endTime
      )

      if (!transcriptResult.fullText || transcriptResult.fullText.trim().length === 0) {
        throw new Error('No transcript content found for this time segment')
      }

      // Create a temporary loop-like object with transcript content for analysis
      const transcriptLoop = {
        ...loop,
        transcriptText: transcriptResult.fullText,
        transcriptSegments: transcriptResult.segments,
        hasTranscript: true
      }

      // Generate questions using transcript instead of audio
      const questions = await this.analysisService.generateQuestionsFromTranscript(transcriptLoop)
      
      // Update loop with transcript metadata
      await this.loopService.updateLoopTranscript(loopId, {
        hasTranscript: true,
        transcriptText: transcriptResult.fullText,
        transcriptLanguage: transcriptResult.language || 'en',
        transcriptSegmentCount: transcriptResult.segments.length,
        questionsGenerated: true,
        questionCount: questions.questions.length,
        lastQuestionGeneration: new Date().toISOString()
      })

      return questions
      
    } catch (error) {
      // Handle transcript-specific errors
      if (error && typeof error === 'object' && 'code' in error) {
        const transcriptError = error as TranscriptError
        throw new Error(this.getTranscriptErrorMessage(transcriptError))
      }
      
      console.error('Transcript-based question generation failed:', error)
      throw new Error(`Question generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate questions with automatic fallback: transcript first, then audio if available
   */
  async generateQuestions(loopId: string): Promise<ConversationQuestions> {
    if (!this.analysisService) {
      throw new Error('Gemini API not configured. Please provide API credentials.')
    }

    const loop = await this.storageService.getLoop(loopId)
    if (!loop) {
      throw new Error('Loop not found')
    }

    // Try transcript-based generation first (preferred method)
    if (loop.videoId) {
      try {
        console.log(`FluentFlow: Attempting transcript-based question generation for loop ${loopId}`)
        return await this.generateQuestionsFromTranscript(loopId)
      } catch (transcriptError) {
        console.log(`FluentFlow: Transcript method failed, checking audio fallback:`, transcriptError)
        
        // Only fallback to audio if it's available
        if (loop.hasAudioSegment) {
          console.log(`FluentFlow: Falling back to audio-based generation for loop ${loopId}`)
          return await this.generateQuestionsForLoop(loopId)
        } else {
          // No audio available, transcript failed - throw the transcript error
          throw transcriptError
        }
      }
    }

    // No video ID for transcript, try audio if available
    if (loop.hasAudioSegment) {
      console.log(`FluentFlow: Using audio-based generation for loop ${loopId}`)
      return await this.generateQuestionsForLoop(loopId)
    }

    throw new Error('Cannot generate questions: no transcript available and no audio segment captured. Please recreate the loop or check if video has available captions.')
  }

  /**
   * Check if transcript is available for a loop
   */
  async checkTranscriptAvailability(loopId: string): Promise<{
    available: boolean
    languages?: string[]
    error?: string
  }> {
    const loop = await this.storageService.getLoop(loopId)
    if (!loop || !loop.videoId) {
      return { available: false, error: 'Video ID not available' }
    }

    try {
      const isAvailable = await youtubeTranscriptService.isTranscriptAvailable(loop.videoId)
      if (!isAvailable) {
        return { available: false, error: 'No transcript available for this video' }
      }

      const languages = await youtubeTranscriptService.getAvailableLanguages(loop.videoId)
      return { available: true, languages }
    } catch (error) {
      return { 
        available: false, 
        error: error instanceof Error ? error.message : 'Unknown error checking transcript' 
      }
    }
  }

  /**
   * Get user-friendly error message for transcript errors
   */
  private getTranscriptErrorMessage(error: TranscriptError): string {
    switch (error.code) {
      case 'NOT_AVAILABLE':
        return 'Video transcript/captions are not available. Please enable captions on the video or try a different video segment.'
      case 'VIDEO_NOT_FOUND':
        return 'Video not found or is no longer available.'
      case 'PRIVATE_VIDEO':
        return 'Video is private or restricted. Cannot access transcript.'
      case 'REGION_BLOCKED':
        return 'Video is blocked in your region. Cannot access transcript.'
      case 'NETWORK_ERROR':
        return 'Network error while fetching transcript. Please check your connection and try again.'
      case 'PARSE_ERROR':
        return 'Failed to process transcript data. The video may have incompatible caption format.'
      default:
        return `Transcript error: ${error.message}`
    }
  }

  /**
   * Recaptures audio for a loop and optionally regenerates questions
   */
  async recaptureLoopAudio(
    loopId: string, 
    regenerateQuestions: boolean = false
  ): Promise<{
    success: boolean
    questions?: ConversationQuestions
    error?: string
  }> {
    try {
      // Recapture audio
      await this.loopService.recaptureAudio(loopId)
      
      const result: any = { success: true }

      // Regenerate questions if requested
      if (regenerateQuestions && this.analysisService) {
        try {
          const questions = await this.generateQuestionsForLoop(loopId)
          result.questions = questions
        } catch (error) {
          result.error = `Audio recaptured but question regeneration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }

      return result
      
    } catch (error) {
      console.error('Audio recapture failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Updates retention policy for a loop
   */
  async updateLoopRetentionPolicy(
    loopId: string,
    policy: 'temporary' | 'keep' | 'auto-cleanup'
  ): Promise<void> {
    await this.loopService.updateRetentionPolicy(loopId, policy)
  }

  /**
   * Manually removes audio from a loop
   */
  async cleanupLoopAudio(loopId: string): Promise<boolean> {
    return await this.cleanupService.cleanupSpecificLoop(loopId)
  }

  /**
   * Runs storage cleanup
   */
  async runStorageCleanup(): Promise<CleanupResult> {
    return await this.cleanupService.cleanupAudioStorage()
  }

  /**
   * Gets storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    return await this.cleanupService.getStorageStats()
  }

  /**
   * Gets loops scheduled for cleanup
   */
  async getScheduledCleanups(): Promise<SavedLoop[]> {
    return await this.cleanupService.getScheduledCleanups()
  }

  /**
   * Emergency cleanup - removes all temporary and scheduled files
   */
  async emergencyCleanup(): Promise<CleanupResult> {
    return await this.cleanupService.emergencyCleanup()
  }

  /**
   * Bulk update retention policies
   */
  async bulkUpdateRetentionPolicies(
    loopIds: string[],
    policy: 'temporary' | 'keep' | 'auto-cleanup'
  ): Promise<number> {
    return await this.cleanupService.bulkSetRetentionPolicy(loopIds, policy)
  }

  /**
   * Validates Gemini API configuration
   */
  async validateGeminiConfig(): Promise<boolean> {
    if (!this.analysisService) {
      return false
    }
    return await this.analysisService.validateConfiguration()
  }

  /**
   * Updates Gemini API configuration
   */
  updateGeminiConfig(config: GeminiConfig): void {
    // Input validation
    if (!config) {
      throw new Error('Gemini configuration is required')
    }

    if (!config.apiKey || typeof config.apiKey !== 'string') {
      throw new Error('Valid API key is required')
    }

    if (config.apiKey.trim().length === 0) {
      throw new Error('API key cannot be empty')
    }

    // Validate baseURL if provided
    if (config.baseURL && typeof config.baseURL !== 'string') {
      throw new Error('Base URL must be a string')
    }

    if (config.baseURL && !config.baseURL.startsWith('https://')) {
      throw new Error('Base URL must use HTTPS')
    }

    // Validate model if provided
    if (config.model && typeof config.model !== 'string') {
      throw new Error('Model name must be a string')
    }

    try {
      if (this.analysisService) {
        this.analysisService.updateConfig(config)
      } else {
        this.analysisService = new ConversationAnalysisService(config)
      }
    } catch (error) {
      throw new Error(`Failed to update Gemini configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
    return await this.loopService.getLoopStats()
  }

  /**
   * Estimates token usage for question generation
   */
  estimateQuestionGenerationCost(loop: SavedLoop): {
    promptTokens: number
    audioProcessingCost: number
    estimatedResponseTokens: number
  } | null {
    if (!this.analysisService) {
      return null
    }
    return this.analysisService.estimateTokenUsage(loop)
  }

  /**
   * Saves a practice session result
   */
  async savePracticeSession(session: ConversationPracticeSession): Promise<void> {
    // This would integrate with your storage service
    // For now, just log it
    console.log('Practice session completed:', session)
    
    // Mark the loop audio as recently used
    await this.loopService.markAudioAsUsed(session.loopId)
  }

  /**
   * Gets cleanup scheduler status
   */
  getCleanupSchedulerStatus(): {
    isRunning: boolean
    nextCleanupTime: Date | null
    intervalHours: number
  } {
    const scheduler = CleanupSchedulerManager.getInstance()
    return scheduler.getStatus()
  }

  /**
   * Manually triggers cleanup
   */
  async triggerCleanup(): Promise<void> {
    const scheduler = CleanupSchedulerManager.getInstance()
    await scheduler.triggerCleanup()
  }

  /**
   * Gets comprehensive system status
   */
  async getSystemStatus(): Promise<{
    storage: StorageStats
    scheduler: {
      isRunning: boolean
      nextCleanupTime: Date | null
      intervalHours: number
    }
    geminiConfigured: boolean
    loopStats: {
      totalLoops: number
      loopsWithAudio: number
      totalAudioSize: number
      averageAudioSize: number
    }
  }> {
    const [storage, loopStats] = await Promise.all([
      this.getStorageStats(),
      this.getLoopStats()
    ])

    return {
      storage,
      scheduler: this.getCleanupSchedulerStatus(),
      geminiConfigured: !!this.analysisService,
      loopStats
    }
  }

  /**
   * Shutdown cleanup scheduler and services
   */
  shutdown(): void {
    CleanupSchedulerManager.shutdown()
  }
}

export default ConversationLoopIntegrationService