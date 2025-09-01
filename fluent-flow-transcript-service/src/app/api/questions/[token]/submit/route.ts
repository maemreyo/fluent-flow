import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { corsResponse, corsHeaders } from '../../../../../lib/cors'
import { getSupabaseServer, getCurrentUserServer } from '../../../../../lib/supabase/server'
import { getSupabaseServiceRole } from '../../../../../lib/supabase/service-role'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

// Helper function to check answers and calculate score
function checkAnswers(questions: any[], responses: any[]) {
  const results = responses.map((response, index) => {
    const question = questions[index]
    const isCorrect = response.answer === question.correctAnswer
    
    // Convert option letter back to full text for display
    const userOptionIndex = response.answer.charCodeAt(0) - 65 // A->0, B->1, etc.
    const correctOptionIndex = question.correctAnswer.charCodeAt(0) - 65
    const userAnswerText = question.options[userOptionIndex] || response.answer
    const correctAnswerText = question.options[correctOptionIndex] || question.correctAnswer
    
    return {
      questionId: question.id || `q_${index}`,
      question: question.question,
      userAnswer: userAnswerText,
      correctAnswer: correctAnswerText,
      isCorrect,
      explanation: question.explanation || 'No explanation available.',
      points: isCorrect ? 1 : 0
    }
  })

  const totalQuestions = questions.length
  const correctAnswers = results.filter(r => r.isCorrect).length
  const score = Math.round((correctAnswers / totalQuestions) * 100)

  return { results, score, totalQuestions, correctAnswers }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { responses, groupId, sessionId: groupSessionId } = body

    if (!token) {
      return corsResponse(
        { error: 'Token is required' },
        400
      )
    }

    if (!responses || !Array.isArray(responses)) {
      return corsResponse(
        { error: 'Valid responses array is required' },
        400
      )
    }

    // Get question set from database
    const supabase = getSupabaseServiceRole()
    let questionSet = null
    
    if (!supabase) {
      return corsResponse(
        { error: 'Database not configured' },
        500
      )
    }

    try {
      const { data, error } = await supabase
        .from('shared_question_sets')
        .select('*')
        .eq('share_token', token)
        .single()

      if (!error && data) {
        questionSet = data
        console.log(`Loaded question set from database for token: ${token}`)
      } else {
        console.log(`Database lookup failed for token: ${token}:`, error?.message || 'Not found')
      }
    } catch (error) {
      console.log(`Database lookup failed for token: ${token}:`, error)
    }

    if (!questionSet) {
      return corsResponse(
        { error: 'Questions not found or expired' },
        404
      )
    }

    // Check answers and calculate score
    const evaluation = checkAnswers(questionSet.questions as any, responses)
    
    // Create session
    const sessionId = uuidv4()
    const session = {
      id: sessionId,
      token,
      submittedAt: new Date().toISOString(),
      responses,
      evaluation,
      userAgent: request.headers.get('user-agent') || 'Unknown'
    }

    // Store session data in database metadata
    try {
      const currentSessions = (questionSet.metadata as any)?.sessions || []
      const updatedSessions = [...currentSessions, session]
      
      await supabase
        .from('shared_question_sets')
        .update({
          metadata: {
            ...(questionSet.metadata as any),
            sessions: updatedSessions
          },
          updated_at: new Date().toISOString()
        })
        .eq('share_token', token)
    } catch (error) {
      console.error('Failed to update question set sessions in database:', error)
      // Continue execution - don't fail the request if metadata update fails
    }

    // If this is a group session, record participation in database
    if (groupId && groupSessionId) {
      try {
        const supabase = getSupabaseServer(request)
        if (supabase) {
          const user = await getCurrentUserServer(supabase)
          if (user) {
            // Record or update participation
            const { error: upsertError } = await supabase
              .from('group_session_participants')
              .upsert({
                session_id: groupSessionId,
                user_id: user.id,
                completed_at: new Date().toISOString(),
                score: evaluation.score,
                responses: responses
              }, {
                onConflict: 'session_id,user_id'
              })
            
            if (upsertError) {
              console.error('Error recording group session participation:', upsertError)
            } else {
              console.log(`Recorded participation for user ${user.id} in group session ${groupSessionId}`)
            }
          }
        }
      } catch (error) {
        console.error('Error handling group session participation:', error)
        // Don't fail the entire request if group participation tracking fails
      }
    }

    const result = {
      sessionId,
      score: evaluation.score,
      totalQuestions: evaluation.totalQuestions,
      correctAnswers: evaluation.correctAnswers,
      results: evaluation.results,
      submittedAt: session.submittedAt,
      isGroupSession: !!(groupId && groupSessionId)
    }

    return corsResponse(result)

  } catch (error) {
    console.error('Failed to submit answers:', error)
    return corsResponse(
      { error: 'Failed to submit answers' },
      500
    )
  }
}