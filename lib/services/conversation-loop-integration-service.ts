import { supabaseService } from '../stores/fluent-flow-supabase-store'
import type {
  ConversationPracticeSession,
  ConversationQuestions,
  SavedLoop
} from '../types/fluent-flow-types'
import { ConversationAnalysisService, type GeminiConfig } from './conversation-analysis-service'
import { EnhancedLoopService, type CreateLoopData } from './enhanced-loop-service'
import { youtubeTranscriptService, type TranscriptError } from './youtube-transcript-service'

/**
 * Integration service that coordinates all conversation loop features
 */
export class ConversationLoopIntegrationService {
  private loopService: EnhancedLoopService
  private analysisService: ConversationAnalysisService | null = null
  private storageService: any

  constructor(storageService: any, geminiConfig?: GeminiConfig) {
    this.storageService = storageService
    this.loopService = new EnhancedLoopService(storageService)
    if (geminiConfig) {
      this.analysisService = new ConversationAnalysisService('google')
    }
  }

  /**
   * Creates a new loop with audio capture and optional question generation
   */
  async createConversationLoop(
    loopData: CreateLoopData,
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
      throw new Error(
        'Gemini API not configured. Cannot generate questions without API credentials.'
      )
    }

    try {
      // Create loop (this will validate loopData internally)
      const loop = await this.loopService.createLoop(loopData)

      const result: any = { loop }

      // Generate questions if requested - use smart caching system
      if (generateQuestions && this.analysisService) {
        try {
          // Use the smart question generation that checks cache first
          const questions = await this.generateQuestions(loop.id)

          result.questions = questions
        } catch (questionError) {
          console.error('Question generation failed:', questionError)
          result.error = `Loop created but question generation failed: ${questionError instanceof Error ? questionError.message : 'Unknown error'}`
        }
      }

      return result
    } catch (error) {
      console.error('Loop creation failed:', error)
      throw new Error(
        `Loop creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Generates questions for an existing loop
   */
  async generateQuestionsForLoop(loopId: string): Promise<ConversationQuestions> {
    if (!this.analysisService) {
      throw new Error('Gemini API not configured. Please provide API credentials.')
    }

    // Get all loops and find the specific one
    const allLoops = await this.storageService.getAllUserLoops()
    const loop = allLoops.find(l => l.id === loopId)

    if (!loop) {
      throw new Error('Loop not found')
    }

    // First check if questions already exist in database using dynamic import
    try {
      const cachedQuestions = await supabaseService.getQuestions(loopId)
      if (cachedQuestions && Array.isArray(cachedQuestions) && cachedQuestions.length > 0) {
        console.log(`FluentFlow: Using cached questions for loop ${loopId}`)
        return {
          loopId,
          questions: cachedQuestions,
          metadata: {
            totalQuestions: cachedQuestions.length,
            analysisDate: new Date().toISOString(),
            canRegenerateQuestions: true
          }
        }
      }
    } catch (cacheError) {
      console.log(`FluentFlow: Cache check failed for loop ${loopId}:`, cacheError)
      // Continue with generation if cache check fails
    }

    // Generate questions based on loop content
    const questions = await this.analysisService.generateQuestions(loop)

    // Save questions to database for future caching using dynamic import
    try {
      await supabaseService.saveQuestions(loopId, questions.questions, {
        generatedFromLoop: true,
        loopDuration: loop.endTime - loop.startTime,
        generatedAt: new Date().toISOString()
      })
    } catch (saveError) {
      console.log(`FluentFlow: Failed to save questions for loop ${loopId}:`, saveError)
      // Continue even if saving fails
    }

    return questions
  }

  /**
   * Generate questions using YouTube transcript for a loop
   */
  async generateQuestionsFromTranscript(loopId: string): Promise<ConversationQuestions> {
    if (!this.analysisService) {
      throw new Error('Gemini API not configured. Please provide API credentials.')
    }

    // Get all loops and find the specific one
    const allLoops = await this.storageService.getAllUserLoops()
    const loop = allLoops.find(l => l.id === loopId)

    if (!loop) {
      throw new Error('Loop not found')
    }

    if (!loop.videoId) {
      throw new Error('Video ID not available for transcript extraction')
    }

    try {
      // First check if questions already exist in database using dynamic import
      try {
        const cachedQuestions = await supabaseService.getQuestions(loopId)
        if (cachedQuestions && Array.isArray(cachedQuestions) && cachedQuestions.length > 0) {
          console.log(`FluentFlow: Using cached questions for loop ${loopId}`)
          return {
            loopId,
            questions: cachedQuestions,
            metadata: {
              totalQuestions: cachedQuestions.length,
              analysisDate: new Date().toISOString(),
              generatedFromTranscript: true,
              canRegenerateQuestions: true
            }
          }
        }
      } catch (cacheError) {
        console.log(`FluentFlow: Cache check failed for loop ${loopId}:`, cacheError)
        // Continue with generation if cache check fails
      }

      let transcriptResult: {
        segments: any[]
        fullText: string
        videoId: string
        language?: string | undefined
      }

      // Check if transcript is already available in the database using dynamic import
      let cachedTranscript = null
      try {
        cachedTranscript = await supabaseService.getTranscript(
          loop.videoId,
          loop.startTime,
          loop.endTime
        )
      } catch (transcriptCacheError) {
        console.log(
          `FluentFlow: Transcript cache check failed for loop ${loopId}:`,
          transcriptCacheError
        )
        // Continue without cached transcript
      }

      if (cachedTranscript) {
        console.log(`FluentFlow: Using cached transcript for loop ${loopId}`)
        transcriptResult = {
          segments: cachedTranscript.segments as any[],
          fullText: cachedTranscript.fullText,
          videoId: loop.videoId,
          language: cachedTranscript.language
        }
      } else if (loop.hasTranscript && loop.transcriptMetadata?.text) {
        // Use existing transcript metadata if available
        console.log(`FluentFlow: Using loop metadata transcript for loop ${loopId}`)
        transcriptResult = {
          segments: [],
          fullText: loop.transcriptMetadata.text,
          videoId: loop.videoId,
          language: loop.transcriptMetadata.language
        }
      } else {
        // Extract transcript from external service and save to database
        transcriptResult = await youtubeTranscriptService.getTranscriptSegment(
          loop.videoId,
          loop.startTime,
          loop.endTime
        )

        // Save transcript to database for future use using dynamic import
        try {
          await supabaseService.saveTranscript(
            loop.videoId,
            loop.startTime,
            loop.endTime,
            transcriptResult.segments,
            transcriptResult.fullText,
            transcriptResult.language || 'en'
          )
        } catch (saveTranscriptError) {
          console.log(
            `FluentFlow: Failed to save transcript for loop ${loopId}:`,
            saveTranscriptError
          )
          // Continue even if saving transcript fails
        }
      }

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
      const questions = await this.analysisService.generateQuestionsFromTranscript(
        transcriptLoop,
        transcriptResult.fullText || ''
      )

      // Save questions to database for future caching using dynamic import
      try {
        await supabaseService.saveQuestions(loopId, questions.questions, {
          generatedFromTranscript: true,
          transcriptLength: transcriptResult.fullText.length,
          transcriptLanguage: transcriptResult.language || 'en',
          segmentCount: transcriptResult.segments.length,
          generatedAt: new Date().toISOString()
        })
      } catch (saveQuestionsError) {
        console.log(`FluentFlow: Failed to save questions for loop ${loopId}:`, saveQuestionsError)
        // Continue even if saving questions fails
      }

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
      throw new Error(
        `Question generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Generate questions with automatic fallback: transcript first, then audio if available
   */
  async generateQuestions(loopId: string): Promise<ConversationQuestions> {
    // First try to use cached questions
    try {
      const cachedQuestions = await supabaseService.getQuestions(loopId)
      if (cachedQuestions && Array.isArray(cachedQuestions) && cachedQuestions.length > 0) {
        console.log(`FluentFlow: Using cached questions for loop ${loopId}`)
        return {
          loopId,
          questions: cachedQuestions,
          metadata: {
            totalQuestions: cachedQuestions.length,
            analysisDate: new Date().toISOString(),
            canRegenerateQuestions: true
          }
        }
      }
    } catch (cacheError) {
      console.log(`FluentFlow: Cache check failed for loop ${loopId}:`, cacheError)
      // Continue with generation if cache check fails
    }

    // Get all loops and find the specific one
    const allLoops = await this.storageService.getAllUserLoops()
    const loop = allLoops.find(l => l.id === loopId)

    if (!loop) {
      throw new Error('Loop not found')
    }

    console.log(`FluentFlow: Attempting transcript-based question generation for loop ${loopId}`)

    try {
      return await this.generateQuestionsFromTranscript(loopId)
    } catch (transcriptError) {
      console.log(`FluentFlow: Transcript method failed:`, transcriptError)
    }
  }

  /**
   * Public API for React Query: Generate questions with intelligent caching
   * This method is designed to be used by React Query hooks and UI components
   */
  async getQuestionsWithCaching(loopId: string): Promise<ConversationQuestions> {
    // This method wraps generateQuestions with additional React Query optimizations
    try {
      const questions = await this.generateQuestions(loopId)

      // Mark this as a successful generation for analytics
      console.log(
        `FluentFlow: Successfully generated/retrieved ${questions.questions.length} questions for loop ${loopId}`
      )

      return questions
    } catch (error) {
      // Enhanced error handling for React Query
      console.error(`FluentFlow: Question generation failed for loop ${loopId}:`, error)

      // Re-throw with enhanced context for React Query error boundaries
      throw new Error(
        `Question generation failed for loop ${loopId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Public API for React Query: Get transcript with intelligent caching
   * This method is designed to be used by React Query hooks and UI components
   */
  async getTranscriptWithCaching(
    videoId: string,
    startTime: number,
    endTime: number,
    language?: string
  ): Promise<{
    id?: string
    segments: any[]
    fullText: string
    language: string
    videoId: string
  }> {
    try {
      // First check if transcript exists in database using dynamic import
      let cachedTranscript = null
      try {
        cachedTranscript = await supabaseService.getTranscript(videoId, startTime, endTime)
      } catch (cacheError) {
        console.log(`FluentFlow: Transcript cache check failed for video ${videoId}:`, cacheError)
        // Continue without cached transcript
      }

      if (cachedTranscript) {
        console.log(
          `FluentFlow: Using cached transcript for video ${videoId} (${startTime}s-${endTime}s)`
        )
        return {
          id: cachedTranscript.id,
          segments: cachedTranscript.segments as any[],
          fullText: cachedTranscript.fullText,
          language: cachedTranscript.language,
          videoId
        }
      }

      // Fetch from external service
      const transcriptResult = await youtubeTranscriptService.getTranscriptSegment(
        videoId,
        startTime,
        endTime,
        language
      )

      // Save to database for future caching using dynamic import
      let savedTranscript = null
      try {
        savedTranscript = await supabaseService.saveTranscript(
          videoId,
          startTime,
          endTime,
          transcriptResult.segments,
          transcriptResult.fullText,
          transcriptResult.language || 'en'
        )
      } catch (saveError) {
        console.log(`FluentFlow: Failed to save transcript for video ${videoId}:`, saveError)
        // Continue even if saving fails
      }

      console.log(`FluentFlow: Successfully fetched and cached transcript for video ${videoId}`)

      return {
        id: savedTranscript?.id,
        segments: transcriptResult.segments,
        fullText: transcriptResult.fullText,
        language: transcriptResult.language || 'en',
        videoId
      }
    } catch (error) {
      console.error(`FluentFlow: Transcript fetching failed for video ${videoId}:`, error)

      // Handle transcript-specific errors
      if (error && typeof error === 'object' && 'code' in error) {
        const transcriptError = error as TranscriptError
        throw new Error(this.getTranscriptErrorMessage(transcriptError))
      }

      throw new Error(
        `Transcript fetching failed for video ${videoId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Check if transcript is available for a loop
   */
  async checkTranscriptAvailability(loopId: string): Promise<{
    available: boolean
    languages?: string[]
    error?: string
  }> {
    // Get all loops and find the specific one
    const allLoops = await this.storageService.getAllUserLoops()
    const loop = allLoops.find(l => l.id === loopId)

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
        this.analysisService = new ConversationAnalysisService('google')
      }
    } catch (error) {
      throw new Error(
        `Failed to update Gemini configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Gets loop creation statistics
   */
  async getLoopStats(): Promise<{
    totalLoops: number
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
    const loopText = `${loop.title} ${loop.description || ''} ${loop.videoTitle}`
    const estimatedTokens = this.analysisService.estimateTokenUsage(loopText)
    return {
      promptTokens: estimatedTokens,
      audioProcessingCost: 0, // Audio processing disabled
      estimatedResponseTokens: Math.ceil(estimatedTokens * 0.3) // Rough estimate
    }
  }

  /**
   * Saves a practice session result
   */
  async savePracticeSession(session: ConversationPracticeSession): Promise<void> {
    // This would integrate with your storage service
    // For now, just log it
    console.log('Practice session completed:', session)
  }

  /**
   * Gets cleanup scheduler status
   */
  getCleanupSchedulerStatus(): {
    isRunning: boolean
    nextCleanupTime: Date | null
    intervalHours: number
  } {
    // Audio cleanup scheduler removed
    return {
      isRunning: false,
      nextCleanupTime: null,
      intervalHours: 24
    }
  }

  /**
   * Manually triggers cleanup
   */
  async triggerCleanup(): Promise<void> {
    // Audio cleanup scheduler removed
    // No-op since audio cleanup is disabled
  }

  /**
   * Gets comprehensive system status
   */
  async getSystemStatus(): Promise<{
    scheduler: {
      isRunning: boolean
      nextCleanupTime: Date | null
      intervalHours: number
    }
    geminiConfigured: boolean
    loopStats: {
      totalLoops: number
    }
  }> {
    const [loopStats] = await Promise.all([this.getLoopStats()])

    return {
      scheduler: this.getCleanupSchedulerStatus(),
      geminiConfigured: !!this.analysisService,
      loopStats
    }
  }
}

export default ConversationLoopIntegrationService
