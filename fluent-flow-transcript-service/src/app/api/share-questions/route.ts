import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { corsHeaders, corsResponse } from '../../../lib/cors'
import { sharedQuestions } from '../../../lib/shared-storage'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { questions, loop, options = {} } = body

    if (!questions || !loop) {
      return corsResponse({ error: 'Questions and loop data are required' }, 400)
    }

    // Generate unique tokens
    const shareToken = uuidv4()
    const shareId = uuidv4()

    // Create shared question set
    const sharedQuestionSet = {
      id: shareId,
      shareToken,
      title: options.title || `${loop.videoTitle} - Practice Questions`,
      videoTitle: loop.videoTitle,
      videoUrl: loop.videoUrl,
      startTime: loop.startTime,
      endTime: loop.endTime,
      questions: questions.questions,
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
      sessions: [] // Track user sessions
    }

    // Store in memory with 4-hour expiration (perfect for classroom sessions)
    const { expiresAt, expiresIn } = sharedQuestions.set(shareToken, sharedQuestionSet)

    console.log(`Questions shared successfully: ${shareToken}`)
    console.log(`Stored question set:`, {
      token: shareToken,
      keys: sharedQuestions.keys(),
      size: sharedQuestions.size(),
      expiresAt: new Date(expiresAt).toLocaleString()
    })

    return corsResponse({
      shareToken,
      shareUrl: sharedQuestionSet.shareUrl,
      id: shareId,
      expiresAt,
      expiresIn,
      expirationMessage: 'Expired in 4h'
    })
  } catch (error) {
    console.error('Failed to share questions:', error)
    return corsResponse({ error: 'Failed to share questions' }, 500)
  }
}
