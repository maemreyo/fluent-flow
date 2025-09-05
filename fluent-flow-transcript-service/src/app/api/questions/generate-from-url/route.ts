import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAIService, type DifficultyPreset } from '@/lib/services/ai-service'
import { getSupabaseServer, getCurrentUserServer } from '@/lib/supabase/server'

// Request validation schema
const generateFromUrlSchema = z.object({
  videoUrl: z.string().url('Must be a valid URL'),
  startTime: z.number().min(0).optional(),
  endTime: z.number().min(0).optional(),
  preset: z.object({
    easy: z.number().min(0).max(20),
    medium: z.number().min(0).max(20),
    hard: z.number().min(0).max(20)
  }).optional(),
  aiProvider: z.enum(['openai', 'anthropic', 'google']).optional(),
  saveToDatabase: z.boolean().default(true),
  groupId: z.string().optional(),
  sessionId: z.string().optional()
})

/**
 * Extract video ID from YouTube URL
 */
function extractYouTubeVideoId(url: string): string | null {
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
 * Fetch YouTube transcript using YouTubei.js
 */
async function fetchYouTubeTranscript(videoUrl: string, startTime?: number, endTime?: number) {
  try {
    const videoId = extractYouTubeVideoId(videoUrl)
    if (!videoId) {
      throw new Error('Invalid YouTube URL')
    }

    // Import youtubei.js dynamically
    const { Innertube } = await import('youtubei.js')
    const youtube = await Innertube.create()
    
    // Get video info
    const videoInfo = await youtube.getInfo(videoId)
    const title = videoInfo.basic_info.title || 'YouTube Video'
    
    // Get transcript
    const transcriptData = await videoInfo.getTranscript()
    
    if (!transcriptData || !(transcriptData as any).content) {
      throw new Error('No transcript available for this video')
    }

    // Process transcript segments
    let segments = (transcriptData as any).content.body.initial_segments
    let fullTranscript = segments.map((segment: any) => segment.snippet.text).join(' ')

    // Apply time filtering if specified
    if (startTime !== undefined || endTime !== undefined) {
      const filteredSegments = segments.filter((segment: any) => {
        const segmentStart = segment.start_time_ms / 1000
        const segmentEnd = segmentStart + (segment.duration_ms / 1000)
        
        if (startTime !== undefined && segmentEnd < startTime) return false
        if (endTime !== undefined && segmentStart > endTime) return false
        return true
      })
      
      fullTranscript = filteredSegments.map((segment: any) => segment.snippet.text).join(' ')
    }

    return {
      transcript: fullTranscript,
      videoTitle: title,
      videoId,
      duration: (videoInfo.basic_info.duration as any)?.seconds_total || 0
    }
  } catch (error) {
    console.error('YouTube transcript extraction error:', error)
    throw new Error(`Failed to extract transcript: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * POST /api/questions/generate-from-url
 * Generate questions from YouTube video URL
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json()
    const validatedData = generateFromUrlSchema.parse(body)
    const { videoUrl, startTime, endTime, preset, aiProvider, saveToDatabase, groupId, sessionId } = validatedData

    console.log(`Processing video URL: ${videoUrl}`)

    // Extract transcript from YouTube video
    const { transcript, videoTitle, videoId, duration } = await fetchYouTubeTranscript(
      videoUrl,
      startTime,
      endTime
    )

    if (!transcript || transcript.length < 50) {
      return NextResponse.json(
        { error: 'Transcript too short or empty. Video may not have captions available.' },
        { status: 400 }
      )
    }

    console.log(`Extracted transcript: ${transcript.length} chars from "${videoTitle}"`)

    // Create synthetic loop object for AI service
    const loop = {
      id: `youtube_${videoId}_${Date.now()}`,
      videoTitle,
      startTime: startTime || 0,
      endTime: endTime || duration
    }

    // Initialize AI service and generate questions
    const aiService = createAIService(aiProvider ? { provider: aiProvider } : undefined)
    
    const generationStartTime = Date.now()
    const generatedQuestions = await aiService.generateConversationQuestions(
      loop,
      transcript,
      preset as DifficultyPreset
    )
    const processingTime = Date.now() - generationStartTime

    console.log(`Generated ${generatedQuestions.questions.length} questions in ${processingTime}ms`)

    // Save to database
    let shareToken: string | undefined = undefined
    if (saveToDatabase) {
      try {
        const supabase = getSupabaseServer(request)
        const user = await getCurrentUserServer(supabase)

        if (!user) {
          return NextResponse.json(
            { error: 'Authentication required for database save' },
            { status: 401 }
          )
        }

        // Save using shared questions service
        const { createSharedQuestionsService } = await import('@/lib/services/shared-questions-service')
        const sharedService = createSharedQuestionsService(request)
        
        const questionSet = await sharedService.createSharedQuestionSet({
          title: `${videoTitle} - Generated Questions`,
          questions: generatedQuestions.questions,
          transcript,
          video_title: videoTitle,
          video_url: videoUrl,
          start_time: startTime,
          end_time: endTime,
          group_id: groupId,
          session_id: sessionId,
          is_public: !!groupId,
          expires_hours: 24,
          metadata: {
            totalQuestions: generatedQuestions.questions.length,
            preset: generatedQuestions.preset,
            actualDistribution: generatedQuestions.actualDistribution,
            aiProvider: aiProvider || process.env.AI_PROVIDER,
            processingTimeMs: processingTime,
            generatedAt: new Date().toISOString(),
            source: 'youtube_url',
            videoId,
            videoDuration: duration
          }
        })

        shareToken = questionSet.share_token
        console.log(`Saved questions to database with token: ${shareToken}`)
      } catch (saveError) {
        console.error('Failed to save questions to database:', saveError)
        // Continue with response even if save fails
      }
    }

    // Generate share URL if we have a token
    let shareUrl: string | undefined = undefined
    if (shareToken) {
      const baseUrl = process.env.NEXTAUTH_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`
      shareUrl = `${baseUrl}/questions/${shareToken}`
      
      if (groupId) {
        shareUrl += `?groupId=${groupId}`
      }
      if (sessionId) {
        shareUrl += `${groupId ? '&' : '?'}sessionId=${sessionId}`
      }
    }

    // Return response
    return NextResponse.json({
      success: true,
      data: {
        questions: generatedQuestions.questions,
        preset: generatedQuestions.preset,
        actualDistribution: generatedQuestions.actualDistribution,
        video: {
          title: videoTitle,
          url: videoUrl,
          id: videoId,
          duration,
          segmentStart: startTime,
          segmentEnd: endTime
        },
        metadata: {
          totalQuestions: generatedQuestions.questions.length,
          processingTimeMs: processingTime,
          aiProvider: aiProvider || process.env.AI_PROVIDER,
          transcript: {
            length: transcript.length,
            wordCount: transcript.split(/\s+/).length
          }
        }
      },
      ...(shareToken && { shareToken }),
      ...(shareUrl && { shareUrl })
    })

  } catch (error) {
    console.error('URL-based question generation error:', error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: (error as any).errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Invalid YouTube URL')) {
        return NextResponse.json(
          { error: 'Invalid YouTube URL. Please provide a valid YouTube video URL.' },
          { status: 400 }
        )
      }

      if (error.message.includes('No transcript available')) {
        return NextResponse.json(
          { error: 'This video does not have captions available for transcript extraction.' },
          { status: 400 }
        )
      }

      if (error.message.includes('API key') || error.message.includes('configuration')) {
        return NextResponse.json(
          { error: 'AI service configuration error' },
          { status: 500 }
        )
      }

      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Service rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }

      if (error.message.includes('too long') || error.message.includes('context_length')) {
        return NextResponse.json(
          { error: 'Video transcript is too long for processing. Try with a shorter time segment.' },
          { status: 413 }
        )
      }
    }

    // Generic error response
    return NextResponse.json(
      { error: 'Failed to generate questions from video. Please try again.' },
      { status: 500 }
    )
  }
}