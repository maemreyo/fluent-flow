import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { corsResponse, corsHeaders } from '../../../../../lib/cors'
import { getSupabaseServiceRole } from '../../../../../lib/supabase/service-role'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

// Helper function to check answers for a specific set
function checkSetAnswers(questions: any[], responses: any[]) {
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
    const { responses, questions, setIndex, difficulty } = body

    if (!token) {
      return corsResponse(
        { error: 'Token is required' },
        400
      )
    }

    if (!responses || !Array.isArray(responses) || !questions || !Array.isArray(questions)) {
      return corsResponse(
        { error: 'Valid responses and questions arrays are required' },
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

    // Check answers for this set only
    const evaluation = checkSetAnswers(questions, responses)
    
    // Create session for this set
    const sessionId = uuidv4()
    const session = {
      id: sessionId,
      token,
      submittedAt: new Date().toISOString(),
      responses,
      evaluation,
      setIndex,
      difficulty,
      userAgent: request.headers.get('user-agent') || 'Unknown'
    }

    // Store session results in database if we have a group_id and session_id
    if (questionSet.group_id && questionSet.session_id) {
      try {
        // Store in group_quiz_results table (only if we have required fields)
        if (questionSet.created_by) {
          await supabase
            .from('group_quiz_results')
            .insert({
              session_id: questionSet.session_id,
              user_id: questionSet.created_by,
              score: evaluation.score,
              total_questions: evaluation.totalQuestions,
              correct_answers: evaluation.correctAnswers,
              result_data: {
                responses,
                evaluation,
                setIndex,
                difficulty,
                submittedAt: session.submittedAt,
                userAgent: session.userAgent
              }
            })
        }
        
        console.log(`Stored quiz results in database for session: ${questionSet.session_id}`)
      } catch (error) {
        console.error('Failed to store quiz results in database:', error)
        // Continue execution - don't fail the request if database storage fails
      }
    }

    // Session data is now stored in the group_quiz_results table instead of question set metadata

    const result = {
      sessionId,
      score: evaluation.score,
      totalQuestions: evaluation.totalQuestions,
      correctAnswers: evaluation.correctAnswers,
      results: evaluation.results,
      submittedAt: session.submittedAt,
      setIndex,
      difficulty
    }

    return corsResponse(result)

  } catch (error) {
    console.error('Failed to submit set answers:', error)
    return corsResponse(
      { error: 'Failed to submit set answers' },
      500
    )
  }
}