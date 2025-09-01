import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { corsHeaders, corsResponse } from '../../../lib/cors'
import { createSharedQuestionsService } from '../../../lib/services/shared-questions-service'
import { sharedQuestions } from '../../../lib/shared-storage'
import { getSupabaseServer } from '../../../lib/supabase/server'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { questions, loop, vocabulary, transcript, options = {} } = body

    if (!questions || !loop) {
      return corsResponse({ error: 'Questions and loop data are required' }, 400)
    }

    // Try database first (new approach)
    const questionsService = createSharedQuestionsService(request)

    try {
      // Check if we have authentication for enhanced metadata
      const authHeader = request.headers.get('authorization')
      let sharedByUser = 'FluentFlow User'

      if (authHeader?.startsWith('Bearer ')) {
        const supabase = getSupabaseServer(request)
        if (supabase) {
          const token = authHeader.substring(7)
          const { data: tokenUser, error } = await supabase.auth.getUser(token)
          if (!error && tokenUser.user) {
            sharedByUser = tokenUser.user.email || 'FluentFlow User'
          }
        }
      }

      const sharedQuestionSet = await questionsService.createSharedQuestionSet({
        title: options.title || `${loop.videoTitle} - Practice Questions`,
        video_title: loop.videoTitle,
        video_url: loop.videoUrl,
        start_time: loop.startTime,
        end_time: loop.endTime,
        questions: questions.questions,
        vocabulary: vocabulary || [],
        transcript: transcript || null,
        is_public: options.isPublic !== false,
        expires_hours: 4, // Public questions expire in 4 hours
        metadata: {
          sharedBy: options.sharedBy || sharedByUser,
          difficulty: 'mixed',
          topics: questions.questions
            .map((q: any) => q.type)
            .filter((t: any, i: number, arr: any[]) => arr.indexOf(t) === i)
        }
      })

      console.log(`Questions shared successfully to database: ${sharedQuestionSet.share_token}`)

      const shareUrl = questionsService.generateShareUrl(sharedQuestionSet.share_token)

      return corsResponse({
        shareToken: sharedQuestionSet.share_token,
        shareUrl: shareUrl,
        id: sharedQuestionSet.id,
        expiresAt: sharedQuestionSet.expires_at,
        expirationMessage: 'Expires in 4h',
        source: 'database'
      })
    } catch (dbError) {
      console.log('Database creation failed, falling back to in-memory storage:', dbError)

      // Fallback to in-memory storage for backward compatibility
      // Generate unique tokens
      const shareToken = uuidv4()
      const shareId = uuidv4()

      // Create shared question set (legacy format)
      const memoryQuestionSet = {
        id: shareId,
        shareToken,
        title: options.title || `${loop.videoTitle} - Practice Questions`,
        videoTitle: loop.videoTitle,
        videoUrl: loop.videoUrl,
        startTime: loop.startTime,
        endTime: loop.endTime,
        questions: questions.questions,
        vocabulary: vocabulary || [],
        transcript: transcript || null,
        metadata: {
          totalQuestions: questions.questions.length,
          createdAt: new Date().toISOString(),
          sharedBy: options.sharedBy || 'FluentFlow User',
          difficulty: 'mixed' as const,
          topics: questions.questions
            .map((q: any) => q.type)
            .filter((t: any, i: number, arr: any[]) => arr.indexOf(t) === i)
        },
        isPublic: options.isPublic !== false,
        shareUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3838'}/questions/${shareToken}`,
        sessions: []
      }

      // Store in memory with 4-hour expiration
      const { expiresAt, expiresIn } = sharedQuestions.set(shareToken, memoryQuestionSet)

      console.log(`Questions shared to memory: ${shareToken}`)
      console.log(`Memory storage:`, {
        token: shareToken,
        keys: sharedQuestions.keys(),
        size: sharedQuestions.size(),
        expiresAt: new Date(expiresAt).toLocaleString()
      })

      return corsResponse({
        shareToken,
        shareUrl: memoryQuestionSet.shareUrl,
        id: shareId,
        expiresAt,
        expiresIn,
        expirationMessage: 'Expires in 4h',
        source: 'memory'
      })
    }
  } catch (error) {
    console.error('Failed to share questions:', error)
    return corsResponse({ error: 'Failed to share questions' }, 500)
  }
}
