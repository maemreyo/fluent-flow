import { NextRequest, NextResponse } from 'next/server'
import { corsResponse, corsHeaders } from '../../../../lib/cors'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    if (!sessionId) {
      return corsResponse(
        { error: 'Session ID is required' },
        400
      )
    }

    // Find session across all question sets
    let foundSession = null
    let foundQuestionSet = null

    const storage = globalThis.__sharedQuestions ?? new Map()
    for (const [_token, stored] of storage.entries()) {
      const questionSet = stored.data
      if (questionSet.sessions) {
        const session = questionSet.sessions.find((s: any) => s.id === sessionId)
        if (session) {
          foundSession = session
          foundQuestionSet = questionSet
          break
        }
      }
    }

    if (!foundSession || !foundQuestionSet) {
      return corsResponse(
        { error: 'Session not found' },
        404
      )
    }

    const result = {
      sessionId: foundSession.id,
      questionSetTitle: foundQuestionSet.title,
      score: foundSession.evaluation.score,
      totalQuestions: foundSession.evaluation.totalQuestions,
      correctAnswers: foundSession.evaluation.correctAnswers,
      results: foundSession.evaluation.results,
      submittedAt: foundSession.submittedAt
    }

    return corsResponse(result)

  } catch (error) {
    console.error('Failed to get session results:', error)
    return corsResponse(
      { error: 'Failed to load session results' },
      500
    )
  }
}