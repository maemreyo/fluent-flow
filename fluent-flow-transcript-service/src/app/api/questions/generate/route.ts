import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAIService, type DifficultyPreset, type SavedLoop } from '@/lib/services/ai-service'
import { getCurrentUserServer, getSupabaseServer } from '@/lib/supabase/server'

// Request validation schema
const generateRequestSchema = z.object({
  transcript: z.string().min(10, 'Transcript must be at least 10 characters'),
  loop: z.object({
    id: z.string(),
    videoTitle: z.string().optional(),
    startTime: z.number(),
    endTime: z.number()
  }),
  segments: z
    .array(
      z.object({
        text: z.string(),
        start: z.number(),
        duration: z.number()
      })
    )
    .optional(),
  preset: z
    .object({
      easy: z.number().min(0).max(6),
      medium: z.number().min(0).max(6),
      hard: z.number().min(0).max(6)
    })
    .optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  customCount: z.number().min(1).max(8).optional(), // Support for preset-based custom counts
  customPromptId: z.string().optional(), // Support for custom prompts
  aiProvider: z.enum(['openai', 'anthropic', 'google']).optional(),
  saveToDatabase: z.boolean().default(false),
  groupId: z.string().optional(),
  sessionId: z.string().optional()
})

type GenerateRequest = z.infer<typeof generateRequestSchema>

/**
 * POST /api/questions/generate
 * Generate questions from transcript using AI
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json()
    console.log("BODY", body)
    const validatedData = generateRequestSchema.parse(body)
    const {
      transcript,
      loop,
      segments,
      preset,
      difficulty,
      customCount,
      customPromptId,
      aiProvider,
      saveToDatabase,
      groupId,
      sessionId
    } = validatedData

    // Handle custom prompt if provided
    let customPrompt = null
    if (customPromptId) {
      try {
        const supabase = getSupabaseServer(request)
        if (supabase) {
          const { data: promptData, error: promptError } = await supabase
            .from('custom_prompts')
            .select('system_prompt, user_template, config')
            .eq('id', customPromptId.replace('custom-', '')) // Remove 'custom-' prefix
            .eq('is_active', true)
            .single()

          if (promptError) {
            console.warn('Failed to fetch custom prompt:', promptError)
          } else {
            customPrompt = promptData
            console.log('Using custom prompt:', customPromptId)
          }
        }
      } catch (error) {
        console.warn('Error fetching custom prompt:', error)
      }
    }

    // Initialize AI service
    const aiService = createAIService(aiProvider ? { provider: aiProvider } : undefined)
    console.log('aiService', aiService)
    // Handle difficulty-based generation with support for custom counts from presets
    let finalPreset: DifficultyPreset
    if (difficulty) {
      // Generate questions for specified difficulty with custom count support (5-8 for quality)
      const questionCount = customCount || 6 // Use custom count from preset if provided
      finalPreset = {
        easy: difficulty === 'easy' ? questionCount : 0,
        medium: difficulty === 'medium' ? questionCount : 0,
        hard: difficulty === 'hard' ? questionCount : 0
      }
    } else if (preset) {
      // Use provided preset but cap at 8 per difficulty for quality assurance
      finalPreset = {
        easy: Math.min(preset.easy || 0, 8),
        medium: Math.min(preset.medium || 0, 8),
        hard: Math.min(preset.hard || 0, 8)
      }
    } else {
      // Default preset - balanced for quality
      finalPreset = { easy: 3, medium: 2, hard: 1 }
    }

    // Generate questions with segments for enhanced AI context
    console.log(
      `Generating questions for loop ${loop.id} with ${transcript.length} chars transcript and ${segments?.length || 0} segments`,
      customCount ? `(preset-based: ${customCount} questions)` : ''
    )

    const startTime = Date.now()
    let generatedQuestions

    if (difficulty) {
      // Generate questions for single difficulty level (max 6 questions)
      generatedQuestions = await aiService.generateSingleDifficultyQuestions(
        loop as SavedLoop,
        transcript,
        difficulty,
        { segments, customPrompt: customPrompt || undefined }
      )
    } else {
      // Generate questions with mixed difficulty levels
      generatedQuestions = await aiService.generateConversationQuestions(
        loop as SavedLoop,
        transcript,
        finalPreset,
        { segments, customPrompt: customPrompt || undefined }
      )
    }

    const processingTime = Date.now() - startTime

    console.log(`Generated ${generatedQuestions.questions.length} questions in ${processingTime}ms`)

    // Save to database if requested
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

        // Create shared question set using existing service
        const { createSharedQuestionsService } = await import(
          '@/lib/services/shared-questions-service'
        )
        const sharedService = createSharedQuestionsService(request)

        const questionSet = await sharedService.createSharedQuestionSet({
          title: loop.videoTitle || `Generated Questions - ${new Date().toLocaleDateString()}`,
          questions: generatedQuestions.questions,
          transcript,
          video_title: loop.videoTitle,
          start_time: loop.startTime,
          end_time: loop.endTime,
          group_id: groupId,
          session_id: sessionId,
          is_public: !!groupId, // Public if part of group
          expires_hours: 24, // 24 hour expiry
          metadata: {
            totalQuestions: generatedQuestions.questions.length,
            preset: generatedQuestions.preset,
            actualDistribution: generatedQuestions.actualDistribution,
            aiProvider: aiProvider || process.env.AI_PROVIDER,
            processingTimeMs: processingTime,
            generatedAt: new Date().toISOString(),
            segmentsCount: segments?.length || 0,
            difficulty: difficulty || 'mixed',
            usedSegments: !!segments,
            customCount: customCount, // Track preset-based custom counts
            isPresetBased: !!customCount
          }
        })

        shareToken = questionSet.share_token
        console.log(`Saved questions to database with token: ${shareToken}`)
      } catch (saveError) {
        console.error('Failed to save questions to database:', saveError)
        // Don't fail the entire request if saving fails
      }
    }

    // Return response
    return NextResponse.json({
      success: true,
      data: {
        questions: generatedQuestions.questions,
        preset: generatedQuestions.preset,
        actualDistribution: generatedQuestions.actualDistribution,
        metadata: {
          totalQuestions: generatedQuestions.questions.length,
          processingTimeMs: processingTime,
          aiProvider: aiProvider || process.env.AI_PROVIDER,
          difficulty: difficulty || 'mixed',
          usedSegments: !!segments,
          segmentsCount: segments?.length || 0,
          customCount: customCount, // Track preset-based custom counts
          isPresetBased: !!customCount,
          transcript: {
            length: transcript.length,
            wordCount: transcript.split(/\s+/).length
          },
          loop: {
            id: loop.id,
            duration: loop.endTime - loop.startTime
          }
        }
      },
      ...(shareToken && { shareToken })
    })
  } catch (error) {
    console.error('Question generation error:', error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details:
            (error as any).errors?.map((e: any) => ({
              field: e.path?.join('.') || 'unknown',
              message: e.message
            })) || []
        },
        { status: 400 }
      )
    }

    // Handle AI service errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json({ error: 'AI service configuration error' }, { status: 500 })
      }

      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'AI service rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }

      if (error.message.includes('context_length_exceeded') || error.message.includes('too long')) {
        return NextResponse.json(
          { error: 'Transcript is too long for processing. Please try with shorter text.' },
          { status: 413 }
        )
      }
    }

    // Generic error response
    return NextResponse.json(
      { error: 'Failed to generate questions. Please try again.' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/questions/generate
 * Get generation status and capabilities
 */
export async function GET() {
  try {
    const aiService = createAIService()
    const capabilities = await aiService.getCapabilities()
    const config = aiService.getConfig()

    return NextResponse.json({
      status: 'ready',
      aiProvider: config.provider,
      model: config.model,
      capabilities,
      limits: {
        maxTokens: config.maxTokens,
        maxTranscriptLength: 50000, // Rough estimate
        supportedPresets: {
          min: { easy: 1, medium: 1, hard: 1 },
          max: { easy: 10, medium: 10, hard: 10 }
        }
      }
    })
  } catch (error) {
    console.error('AI service status error:', error)
    return NextResponse.json(
      {
        status: 'error',
        error: 'AI service not available',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
