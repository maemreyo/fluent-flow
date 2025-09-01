import { NextRequest, NextResponse } from 'next/server'
import { corsResponse, corsHeaders } from '../../../../lib/cors'
import { getSupabaseServiceRole } from '../../../../lib/supabase/service-role'

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

    // Find session in database
    const supabase = getSupabaseServiceRole()
    if (!supabase) {
      return corsResponse(
        { error: 'Database not configured' },
        500
      )
    }

    // Try to find session in group_quiz_results first
    const { data: groupQuizResult } = await supabase
      .from('group_quiz_results')
      .select('*')
      .eq('id', sessionId)
      .single()

    let foundSession = null
    let foundQuestionSet = null

    if (groupQuizResult) {
      // Session found in group quiz results
      foundSession = {
        id: groupQuizResult.id,
        submittedAt: groupQuizResult.completed_at,
        evaluation: {
          score: groupQuizResult.score,
          totalQuestions: groupQuizResult.total_questions,
          correctAnswers: groupQuizResult.correct_answers,
          results: (groupQuizResult.result_data as any)?.results || []
        },
        ...(groupQuizResult.result_data as any)
      }
    } else {
      // Fallback: search in shared_question_sets metadata
      const { data: questionSets } = await supabase
        .from('shared_question_sets')
        .select('*')

      if (questionSets) {
        for (const questionSet of questionSets) {
          const sessions = (questionSet.metadata as any)?.sessions || []
          const session = sessions.find((s: any) => s.id === sessionId)
          if (session) {
            foundSession = session
            foundQuestionSet = questionSet
            break
          }
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