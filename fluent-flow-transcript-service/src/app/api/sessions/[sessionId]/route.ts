import { NextRequest, NextResponse } from 'next/server'
import { sharedQuestions } from '../../../../lib/shared-storage'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Find session across all question sets
    let foundSession = null
    let foundQuestionSet = null

    for (const [token, questionSet] of sharedQuestions.entries()) {
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
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
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

    return NextResponse.json(result)

  } catch (error) {
    console.error('Failed to get session results:', error)
    return NextResponse.json(
      { error: 'Failed to load session results' },
      { status: 500 }
    )
  }
}