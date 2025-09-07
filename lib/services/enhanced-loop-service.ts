import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import type { SavedLoop } from '../types/fluent-flow-types';


export interface CreateLoopData {
  title: string
  videoId: string
  videoTitle: string
  videoUrl: string
  startTime: number
  endTime: number
  description?: string
  transcript?: string
  segments?: Array<{
    text: string
    start: number
    duration: number
  }>
  language?: string
}

export class EnhancedLoopService {
  private storageService: any // Will be injected

  constructor(storageService: any) {
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
   * Creates a loop
   */
  async createLoop(loopData: CreateLoopData): Promise<SavedLoop> {
    this.validateLoopData(loopData)
    
    const existingLoops = await this.storageService.getAllUserLoops()
    const duplicateLoop = existingLoops.find((loop: SavedLoop) => 
      loop.videoId === loopData.videoId && 
      Math.abs(loop.startTime - loopData.startTime) < 1 && 
      Math.abs(loop.endTime - loopData.endTime) < 1
    )
    
    if (duplicateLoop) {
      throw new Error('A loop with the same video and time range already exists')
    }

    // Create base loop object
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
      // Set transcript and segments if provided
      transcript: loopData.transcript || '',
      segments: loopData.segments || [],
      language: loopData.language || 'auto',
      // Set transcript status based on whether data is provided
      hasTranscript: !!(loopData.transcript && loopData.transcript.trim()),
      questionsGenerated: false
    }

    // Save the loop
    await this.storageService.updateUserLoop(loop)
    
    console.log(`Loop created successfully: ${loop.title} (${loopData.startTime}s - ${loopData.endTime}s)`)
    
    return loop
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
      const loop = await this.getLoop(loopId);
      if (!loop) {
        throw new Error('Loop not found');
      }

      // Update loop properties
      loop.hasTranscript = transcriptData.hasTranscript;
      loop.transcriptMetadata = transcriptData.hasTranscript ? {
          text: transcriptData.transcriptText,
          language: transcriptData.transcriptLanguage || 'en',
          segmentCount: transcriptData.transcriptSegmentCount || 0,
          lastAnalyzed: new Date().toISOString()
        } : undefined;
      loop.questionsGenerated = transcriptData.questionsGenerated;
      loop.totalQuestionsGenerated = transcriptData.questionCount || 0;
      loop.questionsGeneratedAt = transcriptData.questionsGenerated ? new Date() : undefined;
      loop.updatedAt = new Date();

      await this.storageService.saveLoop(loop)
      
      console.log(`FluentFlow: Updated loop ${loopId} with transcript metadata`)
    } catch (error) {
      console.error('Failed to update loop transcript data:', error)
      throw new Error(`Failed to update loop transcript: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Sync transcript data to existing loops (for sidepanel transcript loading)
   */
  async syncLoopWithTranscript(
    loopId: string,
    transcriptData: {
      transcript: string
      segments: Array<{
        text: string
        start: number
        duration: number
      }>
      language: string
    }
  ): Promise<void> {
    if (!loopId || typeof loopId !== 'string') {
      throw new Error('Valid loop ID is required')
    }

    if (!transcriptData || typeof transcriptData !== 'object') {
      throw new Error('Valid transcript data is required')
    }

    try {
      const loop = await this.getLoop(loopId)
      if (!loop) {
        throw new Error('Loop not found')
      }

      // Update loop with actual transcript data (not just metadata)
      loop.transcript = transcriptData.transcript || ''
      loop.segments = transcriptData.segments || []
      loop.language = transcriptData.language || 'auto'
      loop.hasTranscript = !!(transcriptData.transcript && transcriptData.transcript.trim())
      loop.updatedAt = new Date()

      // Also update transcriptMetadata for consistency
      if (loop.hasTranscript) {
        loop.transcriptMetadata = {
          text: transcriptData.transcript,
          language: transcriptData.language || 'en',
          segmentCount: transcriptData.segments?.length || 0,
          lastAnalyzed: new Date().toISOString()
        }
      }

      await this.storageService.saveLoop(loop)
      
      console.log(`FluentFlow: Synced transcript data to loop ${loopId}:`, {
        hasTranscript: loop.hasTranscript,
        segmentCount: loop.segments?.length || 0,
        transcriptLength: loop.transcript?.length || 0,
        language: loop.language
      })
    } catch (error) {
      console.error('Failed to sync transcript data to loop:', error)
      throw new Error(`Failed to sync transcript: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Batch sync transcript data to multiple loops for the same video
   */
  async batchSyncTranscriptToLoopsForVideo(
    videoId: string,
    fullTranscript: {
      transcript: string
      segments: Array<{
        text: string
        start: number
        duration: number
      }>
      language: string
    }
  ): Promise<void> {
    try {
      console.log(`FluentFlow: Starting batch transcript sync for video ${videoId}`)
      
      // Get all loops for this video that don't have transcript
      const allLoops = await this.storageService.getAllUserLoops()
      const videoLoops = allLoops.filter((loop: SavedLoop) => 
        loop.videoId === videoId && !loop.hasTranscript
      )
      
      console.log(`FluentFlow: Found ${videoLoops.length} loops without transcript for video ${videoId}`)

      if (videoLoops.length === 0) {
        console.log(`FluentFlow: No loops need transcript sync for video ${videoId}`)
        return
      }

      // Process each loop to extract transcript for its time range
      for (const loop of videoLoops) {
        try {
          console.log(`FluentFlow: Syncing transcript for loop "${loop.title}" (${loop.startTime}s - ${loop.endTime}s)`)
          
          // Filter segments for this loop's time range
          const loopSegments = fullTranscript.segments.filter(segment => {
            const segmentStart = segment.start
            const segmentEnd = segment.start + segment.duration
            
            return (
              (segmentStart >= loop.startTime && segmentStart <= loop.endTime) ||
              (segmentEnd >= loop.startTime && segmentEnd <= loop.endTime) ||
              (segmentStart <= loop.startTime && segmentEnd >= loop.endTime)
            )
          })
          
          const loopTranscript = loopSegments.map(segment => segment.text).join(' ')
          
          if (loopTranscript.trim()) {
            await this.syncLoopWithTranscript(loop.id, {
              transcript: loopTranscript,
              segments: loopSegments,
              language: fullTranscript.language
            })
            console.log(`✅ FluentFlow: Successfully synced transcript to loop "${loop.title}"`)
          } else {
            console.log(`⚠️ FluentFlow: No transcript segments found for loop "${loop.title}" time range`)
          }
        } catch (error) {
          console.error(`❌ FluentFlow: Failed to sync transcript for loop "${loop.title}":`, error)
          // Continue with other loops
        }
      }
      
      console.log(`🎉 FluentFlow: Batch transcript sync completed for video ${videoId}`)
    } catch (error) {
      console.error('Failed to batch sync transcript:', error)
      throw new Error(`Failed to batch sync transcript: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
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
   * Generates unique UUID for loops
   */
  private generateId(): string {
    return uuidv4()
  }

  /**
   * Validates loop data before creation
   */
  private validateLoopData(data: CreateLoopData): void {
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
  }> {
    const allLoops = await this.storageService.getAllUserLoops()
    
    return {
      totalLoops: allLoops.length
    }
  }
}

export default EnhancedLoopService