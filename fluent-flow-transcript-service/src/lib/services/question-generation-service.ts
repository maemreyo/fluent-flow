import { createAIService, type AIConfig, type DifficultyPreset, type SavedLoop, type GeneratedQuestions } from './ai-service'
import { createSharedQuestionsService, type SharedQuestionSet } from './shared-questions-service'
import { NextRequest } from 'next/server'

/**
 * Question Generation Service
 * High-level service for generating and managing AI-generated questions
 */

export interface QuestionGenerationRequest {
  transcript: string
  loop: SavedLoop
  preset?: DifficultyPreset
  aiProvider?: 'openai' | 'anthropic' | 'google'
  saveToDatabase?: boolean
  groupId?: string
  sessionId?: string
}

export interface YouTubeGenerationRequest {
  videoUrl: string
  startTime?: number
  endTime?: number
  preset?: DifficultyPreset
  aiProvider?: 'openai' | 'anthropic' | 'google'
  saveToDatabase?: boolean
  groupId?: string
  sessionId?: string
}

export interface GenerationResult {
  questions: GeneratedQuestions
  metadata: {
    processingTimeMs: number
    aiProvider: string
    transcriptStats: {
      length: number
      wordCount: number
    }
    loop?: {
      id: string
      duration: number
    }
    video?: {
      title: string
      url: string
      id: string
      duration: number
    }
  }
  shareToken?: string
  shareUrl?: string
}

export interface GenerationHistory {
  id: string
  userId: string
  inputType: 'transcript' | 'youtube_url' | 'text'
  inputData: any
  questions: any[]
  generationSettings: any
  aiProvider: string
  processingTimeMs: number
  createdAt: string
}

export class QuestionGenerationService {
  constructor(private request?: NextRequest) {}

  /**
   * Generate questions from transcript text
   */
  async generateFromTranscript(requestData: QuestionGenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now()
    
    try {
      // Initialize AI service
      const aiService = createAIService(
        requestData.aiProvider ? { provider: requestData.aiProvider } : undefined
      )

      // Generate questions
      const questions = await aiService.generateConversationQuestions(
        requestData.loop,
        requestData.transcript,
        requestData.preset
      )

      const processingTime = Date.now() - startTime

      // Prepare result
      const result: GenerationResult = {
        questions,
        metadata: {
          processingTimeMs: processingTime,
          aiProvider: requestData.aiProvider || process.env.AI_PROVIDER || 'google',
          transcriptStats: {
            length: requestData.transcript.length,
            wordCount: requestData.transcript.split(/\s+/).length
          },
          loop: {
            id: requestData.loop.id,
            duration: requestData.loop.endTime - requestData.loop.startTime
          }
        }
      }

      // Save to database if requested
      if (requestData.saveToDatabase && this.request) {
        const saveResult = await this.saveToDatabase({
          title: requestData.loop.videoTitle || `Generated Questions - ${new Date().toLocaleDateString()}`,
          questions: questions.questions,
          transcript: requestData.transcript,
          videoTitle: requestData.loop.videoTitle,
          startTime: requestData.loop.startTime,
          endTime: requestData.loop.endTime,
          groupId: requestData.groupId,
          sessionId: requestData.sessionId,
          metadata: {
            ...result.metadata,
            preset: questions.preset,
            actualDistribution: questions.actualDistribution,
            generatedAt: new Date().toISOString(),
            source: 'transcript'
          }
        })

        result.shareToken = saveResult.shareToken
        result.shareUrl = saveResult.shareUrl
      }

      return result
    } catch (error) {
      console.error('Question generation from transcript failed:', error)
      throw error
    }
  }

  /**
   * Generate questions from YouTube URL
   */
  async generateFromYouTubeUrl(requestData: YouTubeGenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now()

    try {
      // Extract transcript from YouTube
      const { transcript, videoTitle, videoId, duration } = await this.fetchYouTubeTranscript(
        requestData.videoUrl,
        requestData.startTime,
        requestData.endTime
      )

      // Create synthetic loop for AI service
      const loop: SavedLoop = {
        id: `youtube_${videoId}_${Date.now()}`,
        videoTitle,
        startTime: requestData.startTime || 0,
        endTime: requestData.endTime || duration
      }

      // Generate questions using transcript method
      const transcriptRequest: QuestionGenerationRequest = {
        transcript,
        loop,
        preset: requestData.preset,
        aiProvider: requestData.aiProvider,
        saveToDatabase: requestData.saveToDatabase,
        groupId: requestData.groupId,
        sessionId: requestData.sessionId
      }

      const result = await this.generateFromTranscript(transcriptRequest)

      // Add video metadata to result
      result.metadata.video = {
        title: videoTitle,
        url: requestData.videoUrl,
        id: videoId,
        duration
      }

      return result
    } catch (error) {
      console.error('Question generation from YouTube URL failed:', error)
      throw error
    }
  }

  /**
   * Save generated questions to database
   */
  private async saveToDatabase(data: {
    title: string
    questions: any[]
    transcript?: string
    videoTitle?: string
    videoUrl?: string
    startTime?: number
    endTime?: number
    groupId?: string
    sessionId?: string
    metadata: any
  }): Promise<{ shareToken: string; shareUrl: string }> {
    if (!this.request) {
      throw new Error('Request context required for database operations')
    }

    const sharedService = createSharedQuestionsService(this.request)
    
    const questionSet = await sharedService.createSharedQuestionSet({
      title: data.title,
      questions: data.questions,
      transcript: data.transcript,
      video_title: data.videoTitle,
      video_url: data.videoUrl,
      start_time: data.startTime,
      end_time: data.endTime,
      group_id: data.groupId,
      session_id: data.sessionId,
      is_public: !!data.groupId,
      expires_hours: 24,
      metadata: data.metadata
    })

    // Generate share URL
    const baseUrl = process.env.NEXTAUTH_URL || 
      `${this.request.nextUrl.protocol}//${this.request.nextUrl.host}`
    
    let shareUrl = `${baseUrl}/questions/${questionSet.share_token}`
    if (data.groupId) {
      shareUrl += `?groupId=${data.groupId}`
      if (data.sessionId) {
        shareUrl += `&sessionId=${data.sessionId}`
      }
    } else if (data.sessionId) {
      shareUrl += `?sessionId=${data.sessionId}`
    }

    return {
      shareToken: questionSet.share_token,
      shareUrl
    }
  }

  /**
   * Extract YouTube transcript
   */
  private async fetchYouTubeTranscript(
    videoUrl: string, 
    startTime?: number, 
    endTime?: number
  ): Promise<{
    transcript: string
    videoTitle: string
    videoId: string
    duration: number
  }> {
    // Extract video ID
    const videoId = this.extractYouTubeVideoId(videoUrl)
    if (!videoId) {
      throw new Error('Invalid YouTube URL')
    }

    try {
      // Import YouTubei.js dynamically
      const { Innertube } = await import('youtubei.js')
      const youtube = await Innertube.create()
      
      // Get video info and transcript
      const videoInfo = await youtube.getInfo(videoId)
      const title = videoInfo.basic_info.title || 'YouTube Video'
      const videoDuration = (videoInfo.basic_info.duration as any)?.seconds_total || 0
      
      const transcriptData = await videoInfo.getTranscript()
      
      if (!transcriptData || !(transcriptData as any).content) {
        throw new Error('No transcript available for this video')
      }

      // Process transcript segments
      let segments = (transcriptData as any).content.body.initial_segments
      
      // Apply time filtering if specified
      if (startTime !== undefined || endTime !== undefined) {
        segments = segments.filter((segment: any) => {
          const segmentStart = segment.start_time_ms / 1000
          const segmentEnd = segmentStart + (segment.duration_ms / 1000)
          
          if (startTime !== undefined && segmentEnd < startTime) return false
          if (endTime !== undefined && segmentStart > endTime) return false
          return true
        })
      }
      
      const transcript = segments.map((segment: any) => segment.snippet.text).join(' ')

      return {
        transcript,
        videoTitle: title,
        videoId,
        duration: videoDuration
      }
    } catch (error) {
      console.error('YouTube transcript extraction error:', error)
      throw new Error(`Failed to extract transcript: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract video ID from YouTube URL
   */
  private extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    
    return null
  }

  /**
   * Get AI service status and capabilities
   */
  async getServiceStatus(): Promise<{
    status: 'ready' | 'error'
    aiProvider: string
    model: string
    capabilities: string[]
    limits: {
      maxTokens: number
      maxTranscriptLength: number
      supportedPresets: {
        min: DifficultyPreset
        max: DifficultyPreset
      }
    }
    error?: string
  }> {
    try {
      const aiService = createAIService()
      const capabilities = await aiService.getCapabilities()
      const config = aiService.getConfig()

      return {
        status: 'ready',
        aiProvider: config.provider,
        model: config.model,
        capabilities,
        limits: {
          maxTokens: config.maxTokens || 4000,
          maxTranscriptLength: 50000, // Rough estimate
          supportedPresets: {
            min: { easy: 1, medium: 1, hard: 1 },
            max: { easy: 10, medium: 10, hard: 10 }
          }
        }
      }
    } catch (error) {
      return {
        status: 'error',
        aiProvider: 'unknown',
        model: 'unknown',
        capabilities: [],
        limits: {
          maxTokens: 0,
          maxTranscriptLength: 0,
          supportedPresets: {
            min: { easy: 0, medium: 0, hard: 0 },
            max: { easy: 0, medium: 0, hard: 0 }
          }
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Validate generation request
   */
  validateRequest(data: any, type: 'transcript' | 'youtube'): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (type === 'transcript') {
      if (!data.transcript || typeof data.transcript !== 'string' || data.transcript.length < 10) {
        errors.push('Transcript must be at least 10 characters long')
      }

      if (!data.loop || !data.loop.id || !data.loop.startTime || !data.loop.endTime) {
        errors.push('Loop information is required (id, startTime, endTime)')
      }
    }

    if (type === 'youtube') {
      if (!data.videoUrl || typeof data.videoUrl !== 'string') {
        errors.push('Video URL is required')
      } else if (!this.extractYouTubeVideoId(data.videoUrl)) {
        errors.push('Invalid YouTube URL')
      }
    }

    // Common validations
    if (data.preset) {
      if (typeof data.preset !== 'object') {
        errors.push('Preset must be an object')
      } else {
        if (typeof data.preset.easy !== 'number' || data.preset.easy < 0 || data.preset.easy > 20) {
          errors.push('Preset easy count must be between 0-20')
        }
        if (typeof data.preset.medium !== 'number' || data.preset.medium < 0 || data.preset.medium > 20) {
          errors.push('Preset medium count must be between 0-20')
        }
        if (typeof data.preset.hard !== 'number' || data.preset.hard < 0 || data.preset.hard > 20) {
          errors.push('Preset hard count must be between 0-20')
        }
      }
    }

    if (data.aiProvider && !['openai', 'anthropic', 'google'].includes(data.aiProvider)) {
      errors.push('AI provider must be one of: openai, anthropic, google')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

/**
 * Factory function to create Question Generation Service
 */
export function createQuestionGenerationService(request?: NextRequest): QuestionGenerationService {
  return new QuestionGenerationService(request)
}