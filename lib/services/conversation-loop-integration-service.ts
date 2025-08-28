import { supabaseService } from '../stores/fluent-flow-supabase-store'
import type {
  CleanupResult,
  ConversationPracticeSession,
  ConversationQuestions,
  SavedLoop,
  StorageStats
} from '../types/fluent-flow-types'
import type { PaymentError, SupabaseFeatureAccessResponse } from '../types/payment-types'
import { ConversationAnalysisService, type GeminiConfig } from './conversation-analysis-service'
import { EnhancedLoopService, type CreateLoopWithAudioData } from './enhanced-loop-service'
import { licenseValidator } from './license-validator'
import { supabasePaymentService } from './supabase-payment-service'
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
      this.analysisService = new ConversationAnalysisService(geminiConfig)
    }
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

    // Check feature access for loop creation
    try {
      await supabasePaymentService.requireFeatureAccess('loops_created')
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error // Re-throw payment errors with proper codes
      }
      throw new Error('Unable to create loop: Feature access check failed')
    }

    // Validate generateQuestions requirement
    if (generateQuestions && !this.analysisService) {
      throw new Error(
        'Gemini API not configured. Cannot generate questions without API credentials.'
      )
    }

    try {
      // Create loop with audio (this will validate loopData internally)
      const loop = await this.loopService.createLoopWithAudio(loopData)

      // Track loop creation usage
      try {
        await supabasePaymentService.incrementUsage('loops_created', 1)
        await supabasePaymentService.logActivity('loop_created', 'loops_created', {
          loop_id: loop.id,
          video_id: loopData.videoId,
          duration: loopData.endTime - loopData.startTime
        })
      } catch (usageError) {
        console.warn('Failed to track loop creation usage:', usageError)
        // Don't fail the loop creation for usage tracking errors
      }

      const result: any = { loop }

      // Generate questions if requested - use smart caching system
      if (generateQuestions && this.analysisService) {
        try {
          // Check feature access for AI conversations
          await supabasePaymentService.requireFeatureAccess('ai_conversations')
          
          // Use the smart question generation that checks cache first
          const questions = await this.generateQuestions(loop.id)
          
          // Track AI usage
          try {
            await supabasePaymentService.incrementUsage('ai_conversations', 1)
            await supabasePaymentService.logActivity('ai_questions_generated', 'ai_conversations', {
              loop_id: loop.id,
              questions_count: questions?.questions?.length || 0
            })
          } catch (usageError) {
            console.warn('Failed to track AI usage:', usageError)
          }

          result.questions = questions

          // Schedule cleanup for successful question generation (after 7 days)
          // Audio cleanup removed
        } catch (questionError) {
          console.error('Question generation failed:', questionError)
          result.error = `Loop created but question generation failed: ${questionError instanceof Error ? questionError.message : 'Unknown error'}`

          // Schedule earlier cleanup for failed question generation (after 2 days)
          // Audio cleanup removed
        }
      }

      return result
    } catch (error) {
      console.error('Failed to create conversation loop:', error)
      throw new Error(
        `Failed to create loop: ${error instanceof Error ? error.message : 'Unknown error'}`
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

    // Check feature access for AI conversations
    try {
      await supabasePaymentService.requireFeatureAccess('ai_conversations')
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error // Re-throw payment errors with proper codes
      }
      throw new Error('Unable to generate questions: Feature access check failed')
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

    // Track AI usage after successful generation
    try {
      await supabasePaymentService.incrementUsage('ai_conversations', 1)
      await supabasePaymentService.logActivity('ai_questions_generated', 'ai_conversations', {
        loop_id: loopId,
        questions_count: questions?.questions?.length || 0,
        cache_miss: true
      })
    } catch (usageError) {
      console.warn('Failed to track AI usage:', usageError)
      // Don't fail the question generation for usage tracking errors
    }

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
      const questions = await this.analysisService.generateQuestionsFromTranscript(transcriptLoop, transcriptResult.fullText || "")

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
   * Generate questions from video segment analysis using Gemini
   */
  private async generateQuestionsFromVideo(loopId: string): Promise<ConversationQuestions> {
    try {
      const loop = await this.getLoop(loopId)
      if (!loop?.videoId) {
        throw new Error('No video ID found for loop')
      }

      console.log(`FluentFlow: Starting audio-based question generation for loop ${loopId}`)

      // Step 1: Capture audio segment (prioritize audio over video)
      let audioBlob: Blob
      try {
        audioBlob = await this.captureAudioSegment(loop.videoId, loop.startTime, loop.endTime)
        console.log(`FluentFlow: Generated audio blob: ${audioBlob.size} bytes`)
      } catch (audioError) {
        console.log('FluentFlow: Audio capture failed, falling back to video:', audioError)
        // Fallback to video if audio fails
        const videoBlob = await this.captureVideoSegment(loop.videoId, loop.startTime, loop.endTime)
        console.log(`FluentFlow: Generated video blob as fallback: ${videoBlob.size} bytes`)
        audioBlob = videoBlob
      }

      // Step 2: Optional - Save audio for user testing (if in development mode)
      if (
        process.env.NODE_ENV === 'development' ||
        (window as any).location?.hostname === 'localhost'
      ) {
        this.saveAudioForTesting(audioBlob, loopId, loop.videoId, loop.startTime, loop.endTime)
      }

      // Step 3: Convert to base64 for Gemini API
      const base64Audio = await this.convertBlobToBase64(audioBlob)

      // Step 4: Analyze with Gemini (use audio analysis method)
      const analysisPrompt = this.buildAudioAnalysisPrompt(loop)
      const analysis = await this.analysisService!.analyzeAudioForQuestions(loop)

      console.log(`FluentFlow: ✅ Audio analysis completed for loop ${loopId}`)

      // Return in the expected ConversationQuestions format
      return {
        loopId: loopId,
        questions: analysis.questions,
        metadata: {
          totalQuestions: analysis.questions.length,
          analysisDate: new Date().toISOString(),
          generatedFromAudio: true,
          generatedFromTranscript: false,
          canRegenerateQuestions: true,
          // Audio-specific metadata
          audioAnalysis: true,
          audioSegmentDuration: loop.endTime - loop.startTime,
          audioFormat: audioBlob.type
        }
      }
    } catch (error) {
      console.error(`FluentFlow: Audio-based question generation failed for loop ${loopId}:`, error)
      throw new Error(
        `Audio analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Save generated video blob for user testing and debugging
   */
  private saveVideoForTesting(
    videoBlob: Blob,
    loopId: string,
    videoId: string,
    startTime: number,
    endTime: number
  ): void {
    try {
      const filename = `fluent-flow-video-${videoId}-${startTime}s-${endTime}s-${Date.now()}.webm`

      // Create download link
      const url = URL.createObjectURL(videoBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.style.display = 'none'

      // Trigger download
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // Clean up URL
      setTimeout(() => URL.revokeObjectURL(url), 1000)

      console.log(`FluentFlow: 💾 Video saved for testing: ${filename}`)
      console.log(`   Size: ${(videoBlob.size / 1024).toFixed(1)} KB`)
      console.log(`   Type: ${videoBlob.type}`)
      console.log(`   Duration: ${(endTime - startTime).toFixed(1)}s`)

      // Also save to console for debugging
      ;(window as any).fluentFlowLastVideo = {
        blob: videoBlob,
        filename,
        loopId,
        videoId,
        startTime,
        endTime,
        url
      }

      console.log('💡 Access last video via: window.fluentFlowLastVideo')
    } catch (error) {
      console.warn('FluentFlow: Failed to save video for testing:', error)
    }
  }

  /**
   * Save generated audio blob for user testing and debugging
   */
  private saveAudioForTesting(
    audioBlob: Blob,
    loopId: string,
    videoId: string,
    startTime: number,
    endTime: number
  ): void {
    try {
      const extension = audioBlob.type.includes('mp3')
        ? 'mp3'
        : audioBlob.type.includes('wav')
          ? 'wav'
          : 'webm'
      const filename = `fluent-flow-audio-${videoId}-${startTime}s-${endTime}s-${Date.now()}.${extension}`

      // Create download link
      const url = URL.createObjectURL(audioBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.style.display = 'none'

      // Trigger download
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // Clean up URL
      setTimeout(() => URL.revokeObjectURL(url), 1000)

      console.log(`FluentFlow: 🎵 Audio saved for testing: ${filename}`)
      console.log(`   Size: ${(audioBlob.size / 1024).toFixed(1)} KB`)
      console.log(`   Type: ${audioBlob.type}`)
      console.log(`   Duration: ${(endTime - startTime).toFixed(1)}s`)

      // Also save to console for debugging
      ;(window as any).fluentFlowLastAudio = {
        blob: audioBlob,
        filename,
        loopId,
        videoId,
        startTime,
        endTime,
        url
      }

      console.log('💡 Access last audio via: window.fluentFlowLastAudio')
    } catch (error) {
      console.warn('FluentFlow: Failed to save audio for testing:', error)
    }
  }

  /**
   * Build audio analysis prompt for Gemini API
   */
  private buildAudioAnalysisPrompt(loop: SavedLoop): string {
    return `You are an expert language learning instructor. Analyze this ${loop.endTime - loop.startTime} second audio segment and create conversation practice questions for language learners.

Audio Context:
- Source: YouTube audio segment  
- Duration: ${loop.startTime}s to ${loop.endTime}s
- Loop ID: ${loop.id}

Your Task:
1. Listen carefully to the audio content, including spoken dialogue, background sounds, and context
2. Create 3-5 multiple choice questions that help language learners practice conversation skills
3. Focus on practical vocabulary, pronunciation, comprehension, and speaking preparation
4. Make questions that test understanding of what was said in the audio

Important: 
- FOCUS ONLY on the audio content and spoken language
- Create questions about dialogue, vocabulary, pronunciation, and meaning
- Each question should have exactly 4 multiple choice options (A, B, C, D)
- Questions should be practical for conversation practice and language learning
- Consider different accents, speaking speeds, and conversational contexts

Please analyze the audio content and generate conversation practice questions that help learners understand and discuss what they hear.`
  }

  /**
   * Helper method to get a specific loop by ID
   */
  private async getLoop(loopId: string): Promise<SavedLoop | null> {
    const allLoops = await this.storageService.getAllUserLoops()
    return allLoops.find(l => l.id === loopId) || null
  }

  /**
   * Capture video segment from YouTube player
   */
  private async captureVideoSegment(
    videoId: string,
    startTime: number,
    endTime: number
  ): Promise<Blob> {
    try {
      console.log(`FluentFlow: Capturing video segment ${startTime}s-${endTime}s from ${videoId}`)

      // Method 1: Try to access YouTube player directly (if available on page)
      try {
        const player = await this.getYouTubePlayer()
        if (player) {
          return await this.captureFromYouTubePlayer(player, startTime, endTime)
        }
      } catch (playerError) {
        console.log('FluentFlow: YouTube player direct access failed:', playerError)
      }

      // Method 2: Use MediaRecorder API with video element (if available)
      try {
        const videoElement = await this.getVideoElement()
        if (videoElement) {
          return await this.captureFromVideoElement(videoElement, startTime, endTime)
        }
      } catch (elementError) {
        console.log('FluentFlow: Video element capture failed:', elementError)
      }

      // Method 3: Canvas-based capture with reliable placeholder (always works)
      console.log('FluentFlow: Using reliable video placeholder generation')
      return await this.captureUsingCanvas(videoId, startTime, endTime)
    } catch (error) {
      console.error(
        'FluentFlow: All video capture methods failed, generating emergency placeholder'
      )
      // Emergency fallback - generate a basic placeholder that will always work
      try {
        return await this.generateVideoPlaceholder(videoId, startTime, endTime)
      } catch (placeholderError) {
        throw new Error(
          `Complete video capture failure: ${error instanceof Error ? error.message : 'Unknown error'}, placeholder also failed: ${placeholderError}`
        )
      }
    }
  }

  /**
   * Capture audio segment from YouTube using Chrome tab capture API
   */
  private async captureAudioSegment(
    videoId: string,
    startTime: number,
    endTime: number
  ): Promise<Blob> {
    try {
      console.log(`FluentFlow: Capturing audio segment ${startTime}s-${endTime}s from ${videoId}`)

      // Check if chrome.tabCapture is available
      if (!chrome?.tabCapture) {
        throw new Error('Chrome tabCapture API not available')
      }

      // Method 1: Try tab capture API for audio
      try {
        return await this.captureTabAudio(startTime, endTime)
      } catch (tabCaptureError) {
        console.log('FluentFlow: Tab capture failed:', tabCaptureError)
      }

      // Method 2: Try getDisplayMedia with audio
      try {
        return await this.captureDisplayAudio(startTime, endTime)
      } catch (displayError) {
        console.log('FluentFlow: Display media capture failed:', displayError)
      }

      // Method 3: Try direct YouTube audio element access
      try {
        return await this.captureYouTubeAudio(startTime, endTime)
      } catch (audioError) {
        console.log('FluentFlow: YouTube audio access failed:', audioError)
      }

      throw new Error('All audio capture methods failed')
    } catch (error) {
      console.error('FluentFlow: Audio capture failed:', error)
      throw new Error(
        `Audio capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Capture audio using Chrome tab capture API
   */
  private async captureTabAudio(startTime: number, endTime: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const duration = endTime - startTime

      // Request tab capture with audio only
      chrome.tabCapture.capture({ audio: true, video: false }, stream => {
        if (!stream) {
          reject(new Error('Failed to capture tab audio stream'))
          return
        }

        console.log('FluentFlow: Tab audio stream captured, starting recording')

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        })

        const audioChunks: Blob[] = []

        mediaRecorder.ondataavailable = event => {
          if (event.data.size > 0) {
            audioChunks.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          stream.getTracks().forEach(track => track.stop())
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
          console.log(`FluentFlow: Audio recording completed: ${audioBlob.size} bytes`)
          resolve(audioBlob)
        }

        mediaRecorder.onerror = error => {
          stream.getTracks().forEach(track => track.stop())
          reject(new Error(`Audio recording failed: ${error}`))
        }

        // Start recording
        mediaRecorder.start()

        // Stop recording after the segment duration + buffer time
        setTimeout(
          () => {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop()
            }
          },
          (duration + 2) * 1000
        ) // Add 2 second buffer
      })
    })
  }

  /**
   * Capture audio using getDisplayMedia API (user-initiated)
   */
  private async captureDisplayAudio(startTime: number, endTime: number): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      try {
        const duration = endTime - startTime

        // Request display media with audio
        const stream = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: false
        })

        console.log('FluentFlow: Display audio stream captured, starting recording')

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        })

        const audioChunks: Blob[] = []

        mediaRecorder.ondataavailable = event => {
          if (event.data.size > 0) {
            audioChunks.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          stream.getTracks().forEach(track => track.stop())
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
          console.log(`FluentFlow: Display audio recording completed: ${audioBlob.size} bytes`)
          resolve(audioBlob)
        }

        mediaRecorder.onerror = error => {
          stream.getTracks().forEach(track => track.stop())
          reject(new Error(`Display audio recording failed: ${error}`))
        }

        // Start recording
        mediaRecorder.start()

        // Stop recording after the segment duration + buffer time
        setTimeout(
          () => {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop()
            }
          },
          (duration + 2) * 1000
        ) // Add 2 second buffer
      } catch (error) {
        reject(new Error(`Display media setup failed: ${error}`))
      }
    })
  }

  /**
   * Try to capture audio directly from YouTube audio element
   */
  private async captureYouTubeAudio(startTime: number, endTime: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        // Find YouTube video/audio element
        const videoElement = document.querySelector('video') as HTMLVideoElement
        if (!videoElement) {
          throw new Error('No video element found on page')
        }

        const duration = endTime - startTime

        // Try to capture stream from video element
        const stream = (videoElement as any).captureStream
          ? (videoElement as any).captureStream()
          : (videoElement as any).mozCaptureStream()

        if (!stream) {
          throw new Error('Cannot capture stream from video element')
        }

        console.log('FluentFlow: YouTube audio element stream captured')

        // Filter to audio tracks only
        const audioTracks = stream.getAudioTracks()
        if (audioTracks.length === 0) {
          throw new Error('No audio tracks found in video stream')
        }

        const audioStream = new MediaStream(audioTracks)
        const mediaRecorder = new MediaRecorder(audioStream, {
          mimeType: 'audio/webm;codecs=opus'
        })

        const audioChunks: Blob[] = []

        mediaRecorder.ondataavailable = event => {
          if (event.data.size > 0) {
            audioChunks.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          audioStream.getTracks().forEach(track => track.stop())
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
          console.log(`FluentFlow: YouTube audio recording completed: ${audioBlob.size} bytes`)
          resolve(audioBlob)
        }

        mediaRecorder.onerror = error => {
          audioStream.getTracks().forEach(track => track.stop())
          reject(new Error(`YouTube audio recording failed: ${error}`))
        }

        // Start recording
        mediaRecorder.start()

        // Stop recording after the segment duration + buffer time
        setTimeout(
          () => {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop()
            }
          },
          (duration + 2) * 1000
        ) // Add 2 second buffer
      } catch (error) {
        reject(new Error(`YouTube audio setup failed: ${error}`))
      }
    })
  }

  /**
   * Capture video from YouTube player API
   */
  private async captureFromYouTubePlayer(
    player: any,
    startTime: number,
    endTime: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        console.log('FluentFlow: Capturing from YouTube player API')

        // Seek to start time
        player.seekTo(startTime, true)

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        canvas.width = 640
        canvas.height = 360

        const stream = canvas.captureStream(30)
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8'
        })

        const chunks: Blob[] = []

        mediaRecorder.ondataavailable = event => {
          if (event.data.size > 0) {
            chunks.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' })
          resolve(blob)
        }

        mediaRecorder.onerror = error => {
          reject(new Error(`MediaRecorder error: ${error}`))
        }

        // Start recording
        mediaRecorder.start()
        player.playVideo()

        // Stop recording when segment ends
        const checkTime = () => {
          const currentTime = player.getCurrentTime()
          if (currentTime >= endTime || player.getPlayerState() === 0) {
            // 0 = ended
            mediaRecorder.stop()
          } else {
            requestAnimationFrame(checkTime)
          }
        }

        checkTime()

        // Fallback timeout
        setTimeout(
          () => {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop()
            }
          },
          (endTime - startTime + 2) * 1000
        )
      } catch (error) {
        reject(new Error(`YouTube player capture failed: ${error}`))
      }
    })
  }

  /**
   * Get YouTube player instance
   */
  private async getYouTubePlayer(): Promise<any> {
    try {
      // Try various ways to access YouTube player
      const playerSelectors = [
        () => (window as any).ytPlayer,
        () => (window as any).player,
        () => document.querySelector('#movie_player'),
        () => document.querySelector('.html5-video-player')
      ]

      for (const selector of playerSelectors) {
        try {
          const player = selector()
          if (player && typeof player.getCurrentTime === 'function') {
            return player
          }
        } catch (e) {
          continue
        }
      }

      return null
    } catch (error) {
      console.log('FluentFlow: Could not access YouTube player:', error)
      return null
    }
  }

  /**
   * Get video element from DOM
   */
  private async getVideoElement(): Promise<HTMLVideoElement | null> {
    try {
      const videoSelectors = [
        'video.html5-main-video',
        'video[src]',
        '.html5-video-container video',
        '#player video'
      ]

      for (const selector of videoSelectors) {
        const video = document.querySelector(selector) as HTMLVideoElement
        if (video && video.videoWidth > 0) {
          return video
        }
      }

      return null
    } catch (error) {
      console.log('FluentFlow: Could not access video element:', error)
      return null
    }
  }

  /**
   * Capture video segment using MediaRecorder API
   */
  private async captureFromVideoElement(
    videoElement: HTMLVideoElement,
    startTime: number,
    endTime: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        // Seek to start time
        videoElement.currentTime = startTime

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        canvas.width = Math.min(videoElement.videoWidth, 1280) // Limit resolution
        canvas.height = Math.min(videoElement.videoHeight, 720)

        const stream = canvas.captureStream(30) // 30 FPS
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8'
        })

        const chunks: Blob[] = []

        mediaRecorder.ondataavailable = event => {
          if (event.data.size > 0) {
            chunks.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' })
          resolve(blob)
        }

        mediaRecorder.onerror = error => {
          reject(new Error(`MediaRecorder error: ${error}`))
        }

        // Start recording
        mediaRecorder.start()

        // Capture frames
        const captureFrame = () => {
          if (videoElement.currentTime < endTime && !videoElement.ended) {
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
            requestAnimationFrame(captureFrame)
          } else {
            mediaRecorder.stop()
          }
        }

        videoElement.onloadeddata = () => {
          videoElement.play()
          captureFrame()
        }

        // Fallback timeout
        setTimeout(
          () => {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop()
            }
          },
          (endTime - startTime + 2) * 1000
        )
      } catch (error) {
        reject(new Error(`Video capture setup failed: ${error}`))
      }
    })
  }

  /**
   * Canvas-based video capture fallback
   */
  private async captureUsingCanvas(
    videoId: string,
    startTime: number,
    endTime: number
  ): Promise<Blob> {
    try {
      console.log('FluentFlow: Using canvas-based capture fallback')

      // For fallback, use our reliable video placeholder generator
      const videoBlob = await this.generateVideoPlaceholder(videoId, startTime, endTime)

      // Validate the blob has content
      if (videoBlob.size < 1000) {
        throw new Error(`Generated video blob too small: ${videoBlob.size} bytes`)
      }

      console.log(`FluentFlow: Canvas fallback generated video blob: ${videoBlob.size} bytes`)
      return videoBlob
    } catch (error) {
      throw new Error(
        `Canvas capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Advanced YouTube iframe API capture with precise start/end control
   */
  private async captureUsingYouTubeIframeAPI(
    videoId: string,
    startTime: number,
    endTime: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        console.log(
          `FluentFlow: Using YouTube iframe API for precise segment capture: ${startTime}s-${endTime}s`
        )

        // Create container for the YouTube player
        const playerContainer = document.createElement('div')
        playerContainer.id = `fluent-flow-player-${Date.now()}`
        playerContainer.style.position = 'absolute'
        playerContainer.style.left = '-9999px'
        playerContainer.style.width = '640px'
        playerContainer.style.height = '360px'
        document.body.appendChild(playerContainer)

        // Load YouTube iframe API if not already loaded
        this.loadYouTubeIframeAPI()
          .then(() => {
            let player: any = null
            let recordingStarted = false

            const cleanup = () => {
              if (player && typeof player.destroy === 'function') {
                player.destroy()
              }
              if (document.body.contains(playerContainer)) {
                document.body.removeChild(playerContainer)
              }
            }

            // Create YouTube player with precise segment control
            player = new (window as any).YT.Player(playerContainer.id, {
              height: '360',
              width: '640',
              videoId: videoId,
              playerVars: {
                playsinline: 1,
                controls: 0,
                disablekb: 1,
                fs: 0,
                iv_load_policy: 3,
                modestbranding: 1,
                rel: 0
              },
              events: {
                onReady: (event: any) => {
                  console.log('FluentFlow: YouTube player ready, loading video segment')

                  // Use loadVideoById with precise start/end control
                  event.target.loadVideoById({
                    videoId: videoId,
                    startSeconds: startTime,
                    endSeconds: endTime
                  })
                },
                onStateChange: async (event: any) => {
                  const playerState = event.data
                  const YT = (window as any).YT

                  if (playerState === YT.PlayerState.PLAYING && !recordingStarted) {
                    console.log('FluentFlow: Video playing, attempting screen capture')
                    recordingStarted = true

                    try {
                      // Try screen capture first
                      const capturedBlob = await this.startScreenCapture(
                        playerContainer,
                        endTime - startTime
                      )

                      // Validate the captured blob
                      if (capturedBlob && capturedBlob.size > 1000) {
                        console.log(
                          `FluentFlow: Screen capture successful: ${capturedBlob.size} bytes`
                        )
                        resolve(capturedBlob)
                      } else {
                        console.log('FluentFlow: Screen capture blob too small, using placeholder')
                        const placeholderBlob = await this.generateVideoPlaceholder(
                          videoId,
                          startTime,
                          endTime
                        )
                        resolve(placeholderBlob)
                      }
                    } catch (captureError) {
                      console.log(
                        'FluentFlow: Screen capture failed, using placeholder:',
                        captureError
                      )
                      try {
                        const placeholderBlob = await this.generateVideoPlaceholder(
                          videoId,
                          startTime,
                          endTime
                        )
                        resolve(placeholderBlob)
                      } catch (placeholderError) {
                        reject(new Error(`Both capture methods failed: ${placeholderError}`))
                      }
                    } finally {
                      cleanup()
                    }
                  } else if (playerState === YT.PlayerState.ENDED) {
                    console.log('FluentFlow: Video segment ended')
                    if (!recordingStarted) {
                      console.log('FluentFlow: Video ended before recording, using placeholder')
                      try {
                        const placeholderBlob = await this.generateVideoPlaceholder(
                          videoId,
                          startTime,
                          endTime
                        )
                        resolve(placeholderBlob)
                      } catch (error) {
                        reject(new Error(`Placeholder generation failed: ${error}`))
                      } finally {
                        cleanup()
                      }
                    }
                  }
                },
                onError: async (event: any) => {
                  console.error('FluentFlow: YouTube player error:', event.data)
                  console.log('FluentFlow: Player error, using placeholder')
                  try {
                    const placeholderBlob = await this.generateVideoPlaceholder(
                      videoId,
                      startTime,
                      endTime
                    )
                    resolve(placeholderBlob)
                  } catch (error) {
                    reject(new Error(`YouTube player error and placeholder failed: ${error}`))
                  } finally {
                    cleanup()
                  }
                }
              }
            })

            // Fallback timeout - always provide a video blob
            setTimeout(
              async () => {
                if (!recordingStarted) {
                  console.log('FluentFlow: YouTube iframe API timeout, using placeholder')
                  try {
                    const placeholderBlob = await this.generateVideoPlaceholder(
                      videoId,
                      startTime,
                      endTime
                    )
                    resolve(placeholderBlob)
                  } catch (error) {
                    reject(new Error(`Timeout and placeholder failed: ${error}`))
                  } finally {
                    cleanup()
                  }
                }
              },
              (endTime - startTime + 10) * 1000
            )
          })
          .catch(async apiError => {
            console.log('FluentFlow: YouTube API load failed, using placeholder:', apiError)
            try {
              const placeholderBlob = await this.generateVideoPlaceholder(
                videoId,
                startTime,
                endTime
              )
              resolve(placeholderBlob)
            } catch (error) {
              reject(new Error(`API load failed and placeholder failed: ${error}`))
            }
          })
      } catch (error) {
        reject(
          new Error(
            `YouTube iframe API setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        )
      }
    })
  }

  /**
   * Load YouTube iframe API dynamically
   */
  private async loadYouTubeIframeAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      // For Chrome extensions, we can't load external scripts due to CSP restrictions
      // Instead, we'll reject immediately and fallback to other capture methods
      console.log('FluentFlow: YouTube iframe API not available in extension context')
      reject(
        new Error(
          'YouTube iframe API not available in Chrome extension context due to CSP restrictions'
        )
      )
    })
  }

  /**
   * Start screen capture of the player element
   */
  private async startScreenCapture(element: HTMLElement, duration: number): Promise<Blob> {
    try {
      // Method 1: Try to capture the iframe content directly
      const iframe = element.querySelector('iframe') as HTMLIFrameElement
      if (iframe) {
        return await this.captureFromIframe(iframe, duration)
      }

      // Method 2: Fallback to element capture
      return await this.captureFromElement(element, duration)
    } catch (error) {
      throw new Error(
        `Screen capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Capture video from iframe element
   */
  private async captureFromIframe(iframe: HTMLIFrameElement, duration: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        canvas.width = 640
        canvas.height = 360

        // Create a meaningful video placeholder since iframe content may not be capturable
        const createVideoPlaceholder = () => {
          // Clear canvas with dark background
          ctx.fillStyle = '#1a1a1a'
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          // Add video player-like frame
          ctx.fillStyle = '#333'
          ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40)

          // Add play button icon
          ctx.fillStyle = '#ff0000'
          ctx.beginPath()
          ctx.moveTo(canvas.width / 2 - 30, canvas.height / 2 - 20)
          ctx.lineTo(canvas.width / 2 + 20, canvas.height / 2)
          ctx.lineTo(canvas.width / 2 - 30, canvas.height / 2 + 20)
          ctx.closePath()
          ctx.fill()

          // Add text overlay
          ctx.fillStyle = '#fff'
          ctx.font = 'bold 24px Arial'
          ctx.textAlign = 'center'
          ctx.fillText('YouTube Video Segment', canvas.width / 2, canvas.height / 2 + 60)

          ctx.font = '16px Arial'
          ctx.fillText(
            `Duration: ${duration.toFixed(1)} seconds`,
            canvas.width / 2,
            canvas.height / 2 + 85
          )
          ctx.fillText('Captured for AI Analysis', canvas.width / 2, canvas.height / 2 + 105)

          // Add timestamp
          const timestamp = new Date().toLocaleTimeString()
          ctx.font = '12px Arial'
          ctx.fillStyle = '#888'
          ctx.fillText(`Captured at: ${timestamp}`, canvas.width / 2, canvas.height - 30)
        }

        const stream = canvas.captureStream(2) // Lower FPS for placeholder content
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8'
        })

        const chunks: Blob[] = []

        mediaRecorder.ondataavailable = event => {
          if (event.data.size > 0) {
            chunks.push(event.data)
            console.log(`FluentFlow: Captured chunk: ${event.data.size} bytes`)
          }
        }

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' })
          console.log(`FluentFlow: Final video blob: ${blob.size} bytes, type: ${blob.type}`)

          if (blob.size === 0) {
            reject(new Error('Generated video blob is empty'))
          } else {
            resolve(blob)
          }
        }

        mediaRecorder.onerror = error => {
          console.error('FluentFlow: MediaRecorder error:', error)
          reject(new Error(`MediaRecorder error: ${error}`))
        }

        // Start recording with guaranteed content
        mediaRecorder.start(100) // Capture data every 100ms

        // Generate frames with animation
        let frameCount = 0
        const totalFrames = Math.max(duration * 2, 10) // At least 10 frames

        const generateFrame = () => {
          createVideoPlaceholder()

          // Add progress indicator
          const progress = frameCount / totalFrames
          const barWidth = (canvas.width - 80) * progress

          ctx.fillStyle = '#666'
          ctx.fillRect(40, canvas.height - 15, canvas.width - 80, 8)
          ctx.fillStyle = '#ff0000'
          ctx.fillRect(40, canvas.height - 15, barWidth, 8)

          frameCount++
        }

        // Generate initial frame
        generateFrame()

        // Generate frames at regular intervals
        const frameInterval = setInterval(() => {
          if (frameCount < totalFrames) {
            generateFrame()
          }
        }, 500) // 2 FPS

        // Stop recording after duration
        setTimeout(
          () => {
            clearInterval(frameInterval)
            if (mediaRecorder.state === 'recording') {
              console.log('FluentFlow: Stopping video recording')
              mediaRecorder.stop()
            }
          },
          Math.max(duration * 1000, 2000)
        ) // At least 2 seconds
      } catch (error) {
        console.error('FluentFlow: Iframe capture setup failed:', error)
        reject(new Error(`Iframe capture setup failed: ${error}`))
      }
    })
  }

  /**
   * Capture video from HTML element
   */
  private async captureFromElement(element: HTMLElement, duration: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        // Use html2canvas-like approach for element capture
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        canvas.width = 640
        canvas.height = 360

        const stream = canvas.captureStream(30)
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8'
        })

        const chunks: Blob[] = []

        mediaRecorder.ondataavailable = event => {
          if (event.data.size > 0) {
            chunks.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' })
          resolve(blob)
        }

        mediaRecorder.start()

        // Draw element representation
        const drawElement = () => {
          const rect = element.getBoundingClientRect()

          // Clear canvas
          ctx.fillStyle = '#000'
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          // Draw element placeholder
          ctx.fillStyle = '#333'
          ctx.fillRect(50, 50, canvas.width - 100, canvas.height - 100)

          // Add text overlay
          ctx.fillStyle = '#fff'
          ctx.font = '16px Arial'
          ctx.textAlign = 'center'
          ctx.fillText('YouTube Video Segment', canvas.width / 2, canvas.height / 2 - 40)
          ctx.fillText(`Duration: ${duration.toFixed(1)}s`, canvas.width / 2, canvas.height / 2)
          ctx.fillText('Captured via iframe API', canvas.width / 2, canvas.height / 2 + 40)
          ctx.fillText(
            `Size: ${rect.width}x${rect.height}`,
            canvas.width / 2,
            canvas.height / 2 + 80
          )
        }

        const frameInterval = setInterval(drawElement, 1000 / 30)

        setTimeout(() => {
          clearInterval(frameInterval)
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop()
          }
        }, duration * 1000)
      } catch (error) {
        reject(new Error(`Element capture failed: ${error}`))
      }
    })
  }

  /**
   * Generate a reliable video blob with segment information for Gemini analysis
   */
  private async generateVideoPlaceholder(
    videoId: string,
    startTime: number,
    endTime: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        console.log(
          `FluentFlow: Generating video placeholder for segment ${startTime}s-${endTime}s`
        )

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        canvas.width = 640
        canvas.height = 360

        const duration = endTime - startTime
        const totalFrames = Math.max(Math.floor(duration * 5), 10) // 5 FPS minimum

        const stream = canvas.captureStream(5) // 5 FPS
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8'
        })

        const chunks: Blob[] = []
        let frameCount = 0

        mediaRecorder.ondataavailable = event => {
          if (event.data.size > 0) {
            chunks.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' })
          console.log(`FluentFlow: Generated placeholder video: ${blob.size} bytes`)

          if (blob.size < 1000) {
            // If blob is too small, something went wrong
            reject(new Error(`Generated video blob too small: ${blob.size} bytes`))
          } else {
            resolve(blob)
          }
        }

        mediaRecorder.onerror = reject

        const drawFrame = () => {
          // Clear with gradient background
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
          gradient.addColorStop(0, '#1a1a2e')
          gradient.addColorStop(1, '#16213e')
          ctx.fillStyle = gradient
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          // Draw main content area
          ctx.fillStyle = '#0f3460'
          ctx.fillRect(50, 50, canvas.width - 100, canvas.height - 100)

          // Draw YouTube-style player
          ctx.fillStyle = '#000'
          ctx.fillRect(70, 70, canvas.width - 140, canvas.height - 200)

          // Draw play button
          ctx.fillStyle = '#ff0000'
          ctx.beginPath()
          ctx.arc(canvas.width / 2, canvas.height / 2 - 25, 40, 0, 2 * Math.PI)
          ctx.fill()

          ctx.fillStyle = '#fff'
          ctx.beginPath()
          ctx.moveTo(canvas.width / 2 - 15, canvas.height / 2 - 40)
          ctx.lineTo(canvas.width / 2 + 20, canvas.height / 2 - 25)
          ctx.lineTo(canvas.width / 2 - 15, canvas.height / 2 - 10)
          ctx.closePath()
          ctx.fill()

          // Add video information
          ctx.fillStyle = '#fff'
          ctx.font = 'bold 28px Arial'
          ctx.textAlign = 'center'
          ctx.fillText('YouTube Video Segment', canvas.width / 2, canvas.height / 2 + 40)

          ctx.font = '18px Arial'
          ctx.fillText(
            `Video ID: ${videoId.substring(0, 8)}...`,
            canvas.width / 2,
            canvas.height / 2 + 70
          )
          ctx.fillText(
            `Time: ${startTime.toFixed(1)}s - ${endTime.toFixed(1)}s`,
            canvas.width / 2,
            canvas.height / 2 + 95
          )
          ctx.fillText(
            `Duration: ${duration.toFixed(1)} seconds`,
            canvas.width / 2,
            canvas.height / 2 + 120
          )

          // Progress bar
          const progress = frameCount / totalFrames
          const progressWidth = (canvas.width - 120) * progress

          ctx.fillStyle = '#333'
          ctx.fillRect(60, canvas.height - 50, canvas.width - 120, 10)
          ctx.fillStyle = '#ff0000'
          ctx.fillRect(60, canvas.height - 50, progressWidth, 10)

          // Frame counter
          ctx.font = '14px Arial'
          ctx.fillStyle = '#aaa'
          ctx.fillText(
            `Frame ${frameCount + 1}/${totalFrames}`,
            canvas.width / 2,
            canvas.height - 25
          )

          frameCount++
        }

        // Start recording
        mediaRecorder.start(200) // Capture every 200ms

        // Generate frames
        const frameInterval = setInterval(() => {
          if (frameCount < totalFrames) {
            drawFrame()
          } else {
            clearInterval(frameInterval)
            setTimeout(() => {
              if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop()
              }
            }, 500)
          }
        }, 200) // 5 FPS

        // Initial frame
        drawFrame()

        // Safety timeout
        setTimeout(
          () => {
            clearInterval(frameInterval)
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop()
            }
          },
          Math.max(duration * 1000 + 2000, 5000)
        )
      } catch (error) {
        reject(new Error(`Video placeholder generation failed: ${error}`))
      }
    })
  }

  /**
   * Convert blob to base64 for Gemini API
   */
  private async convertBlobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = () => reject(new Error('FileReader failed'))
      reader.readAsDataURL(blob)
    })
  }

  /**
   * Build analysis prompt for video content
   */
  private buildVideoAnalysisPrompt(loop: SavedLoop): string {
    return `You are an expert language learning instructor. Analyze this ${loop.endTime - loop.startTime} second video segment and create conversation practice questions for language learners.

Video Context:
- Source: YouTube video segment  
- Duration: ${loop.startTime}s to ${loop.endTime}s
- Loop ID: ${loop.id}

Your Task:
1. Watch the video carefully and understand the content, dialogue, and visual context
2. Create 3-5 multiple choice questions that help language learners practice conversation skills
3. Focus on practical vocabulary, comprehension, and speaking preparation
4. Make questions that test understanding of what was said or shown in the video

Important: 
- DO NOT perform object detection or create bounding boxes
- DO NOT analyze technical video properties
- FOCUS ONLY on language learning conversation questions
- Each question should have exactly 4 multiple choice options (A, B, C, D)
- Questions should be practical for conversation practice

Please analyze the video content and generate conversation practice questions that help learners understand and discuss what they see and hear in the video.`
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

      // Fallback: Try to generate from video if available
      if (loop.videoId) {
        try {
          console.log(`FluentFlow: Attempting video-based question generation for loop ${loopId}`)
          return await this.generateQuestionsFromVideo(loopId)
        } catch (videoError) {
          console.log(`FluentFlow: Video method failed:`, videoError)
        }
      }

      // If both transcript and video methods fail, throw a comprehensive error
      throw new Error(
        `Transcript-based generation failed and no audio segment available: ${transcriptError instanceof Error ? transcriptError.message : 'Unknown error'}. Please try recreating the loop or check if the video has available captions.`
      )
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
    // Audio cleanup functionality removed
    return true
  }

  /**
   * Runs storage cleanup
   */
  async runStorageCleanup(): Promise<CleanupResult> {
    // Audio cleanup functionality removed
    return {
      totalLoops: 0,
      cleanedCount: 0,
      spaceFreedMB: 0,
      errors: []
    }
  }

  /**
   * Gets storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    // Audio storage stats removed
    return {
      totalAudioFiles: 0,
      totalSizeMB: 0,
      scheduledForCleanup: 0,
      largestFiles: []
    }
  }

  /**
   * Gets loops scheduled for cleanup
   */
  async getScheduledCleanups(): Promise<SavedLoop[]> {
    // Audio cleanup scheduling removed
    return []
  }

  /**
   * Emergency cleanup - removes all temporary and scheduled files
   */
  async emergencyCleanup(): Promise<CleanupResult> {
    // Audio cleanup functionality removed
    return {
      totalLoops: 0,
      cleanedCount: 0,
      spaceFreedMB: 0,
      errors: []
    }
  }

  /**
   * Bulk update retention policies
   */
  async bulkUpdateRetentionPolicies(
    loopIds: string[],
    policy: 'temporary' | 'keep' | 'auto-cleanup'
  ): Promise<number> {
    // Audio retention policy removed
    return 0
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
    const [storage, loopStats] = await Promise.all([this.getStorageStats(), this.getLoopStats()])

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
    // Audio cleanup scheduler removed
  }
}

export default ConversationLoopIntegrationService
